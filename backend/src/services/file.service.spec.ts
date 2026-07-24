import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';

const mockDb = { collection: vi.fn() };
vi.mock('../database/DbConnector', () => ({
	getConnection: vi.fn(() => mockDb)
}));

const mockGridFSCollection = {
	find: vi.fn(),
	findOne: vi.fn()
};

const mockBucketDelete = vi.fn();
vi.mock('mongodb', async (importOriginal) => {
	const actual = await importOriginal<typeof import('mongodb')>();
	return {
		...actual,
		GridFSBucket: class {
			delete = mockBucketDelete;
		}
	};
});

describe('FileService', () => {
	let fileService: typeof import('./file.service');

	const repoId = new ObjectId().toHexString();
	const fileId = new ObjectId().toHexString();

	beforeEach(async () => {
		fileService = await vi.importActual<typeof import('./file.service')>('./file.service');
		vi.clearAllMocks();

		mockDb.collection.mockReturnValue(mockGridFSCollection);
		Object.values(mockGridFSCollection).forEach(fn => fn.mockReset());
		mockBucketDelete.mockReset();
	});

	describe('deleteFile', () => {
		it('should delete a file when repoId matches', async () => {
			mockGridFSCollection.findOne.mockResolvedValue({
				_id: new ObjectId(fileId),
				metadata: { repoId: new ObjectId(repoId) }
			});
			mockBucketDelete.mockResolvedValue(undefined);

			await fileService.deleteFile(fileId, repoId);

			expect(mockGridFSCollection.findOne).toHaveBeenCalledWith({ _id: new ObjectId(fileId) });
			expect(mockBucketDelete).toHaveBeenCalledWith(new ObjectId(fileId));
		});

		it('should throw if file not found', async () => {
			mockGridFSCollection.findOne.mockResolvedValue(null);

			await expect(fileService.deleteFile(fileId, repoId))
				.rejects.toThrow('File not found or not authorized');
		});

		it('should throw if repoId does not match (IDOR protection)', async () => {
			const wrongRepoId = new ObjectId().toHexString();
			mockGridFSCollection.findOne.mockResolvedValue({
				_id: new ObjectId(fileId),
				metadata: { repoId: new ObjectId(repoId) }
			});

			await expect(fileService.deleteFile(fileId, wrongRepoId))
				.rejects.toThrow('File not found or not authorized');
			expect(mockBucketDelete).not.toHaveBeenCalled();
		});
	});

	describe('getFileList', () => {
		it('should return files filtered by repoId', async () => {
			const files = [
				{ _id: new ObjectId(), filename: 'a.txt', metadata: { repoId: new ObjectId(repoId) } },
				{ _id: new ObjectId(), filename: 'b.pdf', metadata: { repoId: new ObjectId(repoId) } }
			];
			mockGridFSCollection.find.mockReturnValue({ toArray: vi.fn().mockResolvedValue(files) });

			const result = await fileService.getFileList(repoId);

			expect(result).toHaveLength(2);
			expect(mockGridFSCollection.find).toHaveBeenCalledWith({
				'metadata.repoId': new ObjectId(repoId)
			});
		});

		it('should return empty array if no files', async () => {
			mockGridFSCollection.find.mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) });

			const result = await fileService.getFileList(repoId);
			expect(result).toEqual([]);
		});
	});
});
