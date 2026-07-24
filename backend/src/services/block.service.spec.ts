import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';


const mockDb = { collection: vi.fn() };
vi.mock('../database/DbConnector', () => ({
	getConnection: vi.fn(() => mockDb)
}));

const mockBlockCollection = {
	insertOne: vi.fn(),
	findOne: vi.fn(),
	find: vi.fn(),
	findOneAndReplace: vi.fn(),
	deleteOne: vi.fn()
};

describe('BlockService', () => {
	let blockService: typeof import('./block.service');

	const userId = new ObjectId().toHexString();
	const blockId = new ObjectId().toHexString();
	const repoId = new ObjectId().toHexString();

	beforeEach(async () => {
		blockService = await vi.importActual<typeof import('./block.service')>('./block.service');
		vi.clearAllMocks();

		mockDb.collection.mockReturnValue(mockBlockCollection);
		Object.values(mockBlockCollection).forEach(fn => fn.mockReset());
	});

	describe('saveBlock', () => {
		it('should sanitize and insert a block', async () => {
			mockBlockCollection.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
			const block = { name: 'Test Block', repositoryId: repoId, owner: userId, steps: [] } as any;

			await blockService.saveBlock(block);

			expect(mockBlockCollection.insertOne).toHaveBeenCalledTimes(1);
			const saved = mockBlockCollection.insertOne.mock.calls[0][0];
			expect(saved.repositoryId).toBeInstanceOf(ObjectId);
			expect(saved.owner).toBeInstanceOf(ObjectId);
		});

		it('should strip NoSQL injection keys', async () => {
			mockBlockCollection.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
			const malicious = { name: 'Block', $gt: 'injected', steps: [] } as any;

			await blockService.saveBlock(malicious);

			const saved = mockBlockCollection.insertOne.mock.calls[0][0];
			expect(saved.$gt).toBeUndefined();
			expect(saved.name).toBe('Block');
		});
	});

	describe('getBlock', () => {
		it('should find a block by id', async () => {
			const block = { _id: new ObjectId(blockId), name: 'Found' };
			mockBlockCollection.findOne.mockResolvedValue(block);

			const result = await blockService.getBlock(blockId);
			expect(result).toEqual(block);
			expect(mockBlockCollection.findOne).toHaveBeenCalledWith({ _id: new ObjectId(blockId) });
		});

		it('should return null if not found', async () => {
			mockBlockCollection.findOne.mockResolvedValue(null);
			const result = await blockService.getBlock(blockId);
			expect(result).toBeNull();
		});
	});

	describe('getBlocks', () => {
		it('should return all blocks for a repository', async () => {
			const blocks = [{ name: 'A' }, { name: 'B' }];
			mockBlockCollection.find.mockReturnValue({ toArray: vi.fn().mockResolvedValue(blocks) });

			const result = await blockService.getBlocks(repoId);
			expect(result).toEqual(blocks);
			expect(mockBlockCollection.find).toHaveBeenCalledWith({ repositoryId: new ObjectId(repoId) });
		});
	});

	describe('updateBlock (IDOR protection)', () => {
		it('should only update blocks owned by the user', async () => {
			mockBlockCollection.findOneAndReplace.mockResolvedValue({ _id: new ObjectId(blockId), name: 'Updated' });
			const updatedBlock = { name: 'Updated', steps: [] } as any;

			await blockService.updateBlock(blockId, updatedBlock, userId);

			const filter = mockBlockCollection.findOneAndReplace.mock.calls[0][0];
			expect(filter._id).toEqual(new ObjectId(blockId));
			expect(filter.owner).toEqual(new ObjectId(userId));
		});

		it('should set owner to requesting userId', async () => {
			mockBlockCollection.findOneAndReplace.mockResolvedValue(null);
			const updatedBlock = { name: 'Test', owner: new ObjectId() } as any;
			const attackerUserId = new ObjectId().toHexString();

			await blockService.updateBlock(blockId, updatedBlock, attackerUserId);

			const saved = mockBlockCollection.findOneAndReplace.mock.calls[0][1];
			expect(saved.owner).toEqual(new ObjectId(attackerUserId));
		});

		it('should return null if block not owned by user', async () => {
			mockBlockCollection.findOneAndReplace.mockResolvedValue(null);

			const result = await blockService.updateBlock(blockId, { name: 'X' } as any, userId);
			expect(result).toBeNull();
		});
	});

	describe('deleteBlock (IDOR protection)', () => {
		it('should only delete blocks owned by the user', async () => {
			mockBlockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });

			await blockService.deleteBlock(blockId, userId);

			expect(mockBlockCollection.deleteOne).toHaveBeenCalledWith({
				_id: new ObjectId(blockId),
				owner: new ObjectId(userId)
			});
		});

		it('should not delete if userId does not match', async () => {
			mockBlockCollection.deleteOne.mockResolvedValue({ deletedCount: 0 });
			const wrongUserId = new ObjectId().toHexString();

			const result = await blockService.deleteBlock(blockId, wrongUserId);
			expect(result.deletedCount).toBe(0);
		});
	});
});
