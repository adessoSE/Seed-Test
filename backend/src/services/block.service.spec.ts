import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import type * as BlockServiceModule from './block.service.js';


const mockDb = { collection: vi.fn() };
vi.mock('../database/DbConnector', () => ({
	getConnection: vi.fn(() => mockDb)
}));

const mockBlockCollection = {
	insertOne: vi.fn(),
	findOne: vi.fn(),
	find: vi.fn(),
	findOneAndUpdate: vi.fn(),
	deleteOne: vi.fn()
};

describe('BlockService', () => {
	let blockService: typeof BlockServiceModule;

	const userId = new ObjectId().toHexString();
	const blockId = new ObjectId().toHexString();
	const repoId = new ObjectId().toHexString();

	beforeEach(async () => {
		blockService = await vi.importActual<typeof BlockServiceModule>('./block.service');
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
			mockBlockCollection.findOneAndUpdate.mockResolvedValue({ _id: new ObjectId(blockId), name: 'Updated' });
			const updatedBlock = { name: 'Updated', stepDefinitions: {} } as any;

			await blockService.updateBlock(blockId, updatedBlock, userId);

			const filter = mockBlockCollection.findOneAndUpdate.mock.calls[0][0];
			expect(filter._id).toEqual(new ObjectId(blockId));
			expect(filter.owner).toEqual(new ObjectId(userId));
		});

		it('should return null if block not owned by user', async () => {
			mockBlockCollection.findOneAndUpdate.mockResolvedValue(null);

			const result = await blockService.updateBlock(blockId, { name: 'X', stepDefinitions: {} } as any, userId);
			expect(result).toBeNull();
		});
	});

	describe('updateBlock (ownership fields are never rewritten)', () => {
		it('keeps the stored repositoryId when the body omits it', async () => {
			mockBlockCollection.findOneAndUpdate.mockResolvedValue({ _id: new ObjectId(blockId), name: 'Renamed' });
			// A rename as sent by the client: the update schema strips repositoryId before the service runs
			const renameBody = { name: 'Renamed', stepDefinitions: {} } as any;

			await blockService.updateBlock(blockId, renameBody, userId);

			expect(mockBlockCollection.findOneAndUpdate).toHaveBeenCalledTimes(1);
			const update = mockBlockCollection.findOneAndUpdate.mock.calls[0][1];
			expect(update).toHaveProperty('$set');
			expect(update.$set).not.toHaveProperty('repositoryId');
			expect(update.$set.name).toBe('Renamed');
		});

		it('writes only the editable fields that were provided', async () => {
			mockBlockCollection.findOneAndUpdate.mockResolvedValue({ _id: new ObjectId(blockId) });
			const body = { name: 'Renamed', source: 'src', isBackground: true, stepDefinitions: {} } as any;

			await blockService.updateBlock(blockId, body, userId);

			const update = mockBlockCollection.findOneAndUpdate.mock.calls[0][1];
			expect(update.$set).toEqual({ name: 'Renamed', source: 'src', isBackground: true, stepDefinitions: {} });
		});

		it('ignores ownership fields even when a caller sends them', async () => {
			mockBlockCollection.findOneAndUpdate.mockResolvedValue({ _id: new ObjectId(blockId) });
			const attackerRepoId = new ObjectId().toHexString();
			const body = {
				name: 'Moved',
				stepDefinitions: {},
				repositoryId: attackerRepoId,
				repository: 'Other project',
				owner: new ObjectId().toHexString()
			} as any;

			await blockService.updateBlock(blockId, body, userId);

			const update = mockBlockCollection.findOneAndUpdate.mock.calls[0][1];
			expect(update).not.toHaveProperty('repositoryId');
			expect(update.$set).not.toHaveProperty('repositoryId');
			expect(update.$set).not.toHaveProperty('repository');
			expect(update.$set).not.toHaveProperty('owner');
		});
	});

	describe('updateBlock (no editable field provided)', () => {
		it('skips the write and returns the stored block when the body has no editable field', async () => {
			const stored = { _id: new ObjectId(blockId), name: 'Stored' };
			mockBlockCollection.findOne.mockResolvedValue(stored);

			const result = await blockService.updateBlock(blockId, { repositoryId: repoId } as any, userId);

			// MongoDB rejects an empty $set, so no write is issued at all
			expect(mockBlockCollection.findOneAndUpdate).not.toHaveBeenCalled();
			const filter = mockBlockCollection.findOne.mock.calls[0][0];
			expect(filter).toEqual({ _id: new ObjectId(blockId), owner: new ObjectId(userId) });
			expect(result).toEqual(stored);
		});
	});

	describe('overwriteBlock (import overwrite)', () => {
		it('sets the target repository name and never writes ownership fields', async () => {
			mockBlockCollection.findOneAndUpdate.mockResolvedValue({ _id: new ObjectId(blockId) });
			// The archive carries the source project's name and ownership fields of its own
			const archiveBlock = {
				name: 'Shared',
				stepDefinitions: {},
				repository: 'SourceProject',
				repositoryId: repoId,
				owner: new ObjectId().toHexString()
			} as any;

			await blockService.overwriteBlock(blockId, archiveBlock, userId, 'ExistingProject');

			const [filter, update] = mockBlockCollection.findOneAndUpdate.mock.calls[0];
			expect(filter).toEqual({ _id: new ObjectId(blockId), owner: new ObjectId(userId) });
			expect(update.$set).toEqual({ name: 'Shared', stepDefinitions: {}, repository: 'ExistingProject' });
			expect(update.$set).not.toHaveProperty('repositoryId');
			expect(update.$set).not.toHaveProperty('owner');
			expect(update.$set).not.toHaveProperty('_id');
		});

		it('unsets editable fields that the archive block does not contain', async () => {
			mockBlockCollection.findOneAndUpdate.mockResolvedValue({ _id: new ObjectId(blockId) });
			const archiveBlock = { name: 'Shared', stepDefinitions: {} } as any;

			await blockService.overwriteBlock(blockId, archiveBlock, userId, 'ExistingProject');

			// A stored multipleScenarios or usedAsReference from before the import must not survive it
			const update = mockBlockCollection.findOneAndUpdate.mock.calls[0][1];
			expect(update.$unset).toEqual({ source: '', isBackground: '', usedAsReference: '', multipleScenarios: '' });
			expect(update.$set).not.toHaveProperty('multipleScenarios');
		});

		it('omits $unset when the archive block contains every editable field', async () => {
			mockBlockCollection.findOneAndUpdate.mockResolvedValue({ _id: new ObjectId(blockId) });
			const archiveBlock = {
				name: 'Full',
				source: 'src',
				isBackground: false,
				usedAsReference: true,
				stepDefinitions: {},
				multipleScenarios: []
			} as any;

			await blockService.overwriteBlock(blockId, archiveBlock, userId, 'ExistingProject');

			// MongoDB rejects an empty $unset, so the operator is left out
			const update = mockBlockCollection.findOneAndUpdate.mock.calls[0][1];
			expect(update).not.toHaveProperty('$unset');
			expect(update.$set.isBackground).toBe(false);
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
