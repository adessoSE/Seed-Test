import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import type { Repository } from '@shared/models/Repository';
import type { Workgroup } from './workgroup.service';

const mockDb = { collection: vi.fn() };
vi.mock('../database/DbConnector', () => ({
	getConnection: vi.fn(() => mockDb)
}));

const mockedUserService = {
	getUserById: vi.fn()
};
vi.mock('./user.service', () => mockedUserService);

const mockWorkgroupCollection = {
	findOne: vi.fn(),
	insertOne: vi.fn(),
	updateOne: vi.fn(),
	updateMany: vi.fn()
};
const mockRepoCollection = {
	findOne: vi.fn()
};

describe('WorkgroupService', () => {
	let workgroupService: typeof import('./workgroup.service');

	const repoId = new ObjectId().toHexString();
	const ownerId = new ObjectId();

	const mockRepo: Repository = {
		_id: new ObjectId(repoId),
		owner: ownerId,
		repoName: 'Test Repo',
		stories: [],
		repoType: 'db',
		groups: []
	};

	const mockOwner = { _id: ownerId, email: 'owner@test.com' };

	beforeEach(async () => {
		workgroupService = await vi.importActual<typeof import('./workgroup.service')>('./workgroup.service');
		vi.clearAllMocks();

		mockDb.collection.mockImplementation((name: string) => {
			if (name === 'Workgroups') return mockWorkgroupCollection;
			if (name === 'Repositories') return mockRepoCollection;
			throw new Error(`Unexpected collection: ${name}`);
		});

		Object.values(mockWorkgroupCollection).forEach(fn => fn.mockReset());
		Object.values(mockRepoCollection).forEach(fn => fn.mockReset());
	});

	describe('getWorkgroup', () => {
		it('should return a workgroup by repoId', async () => {
			const mockWg: Workgroup = { _id: new ObjectId(), name: 'WG', owner: 'owner@test.com', Repo: new ObjectId(repoId), Members: [] };
			mockWorkgroupCollection.findOne.mockResolvedValue(mockWg);

			const result = await workgroupService.getWorkgroup(repoId);
			expect(result).toEqual(mockWg);
			expect(mockWorkgroupCollection.findOne).toHaveBeenCalledWith({ Repo: new ObjectId(repoId) });
		});

		it('should return null if no workgroup exists', async () => {
			mockWorkgroupCollection.findOne.mockResolvedValue(null);
			const result = await workgroupService.getWorkgroup(repoId);
			expect(result).toBeNull();
		});
	});

	describe('getMembers', () => {
		it('should return owner and members', async () => {
			const members = [{ email: 'member@test.com', canEdit: true }];
			mockRepoCollection.findOne.mockResolvedValue(mockRepo);
			mockedUserService.getUserById.mockResolvedValue(mockOwner);
			mockWorkgroupCollection.findOne.mockResolvedValue({ Members: members });

			const result = await workgroupService.getMembers(repoId);
			expect(result.owner.email).toBe('owner@test.com');
			expect(result.owner.canEdit).toBe(true);
			expect(result.member).toEqual(members);
		});

		it('should throw if repository not found', async () => {
			mockRepoCollection.findOne.mockResolvedValue(null);
			await expect(workgroupService.getMembers(repoId)).rejects.toThrow('Repository not found');
		});

		it('should return empty members if no workgroup', async () => {
			mockRepoCollection.findOne.mockResolvedValue(mockRepo);
			mockedUserService.getUserById.mockResolvedValue(mockOwner);
			mockWorkgroupCollection.findOne.mockResolvedValue(null);

			const result = await workgroupService.getMembers(repoId);
			expect(result.member).toEqual([]);
		});
	});

	describe('addMember', () => {
		it('should create workgroup if none exists', async () => {
			mockRepoCollection.findOne.mockResolvedValue(mockRepo);
			mockedUserService.getUserById.mockResolvedValue(mockOwner);
			mockWorkgroupCollection.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ Members: [{ email: 'new@test.com', canEdit: false }] });
			mockWorkgroupCollection.insertOne.mockResolvedValue({ insertedId: new ObjectId() });

			await workgroupService.addMember(repoId, { email: 'new@test.com', canEdit: false });

			expect(mockWorkgroupCollection.insertOne).toHaveBeenCalledWith(expect.objectContaining({
				name: 'Test Repo',
				owner: 'owner@test.com',
				Members: [{ email: 'new@test.com', canEdit: false }]
			}));
		});

		it('should throw if member already exists', async () => {
			mockRepoCollection.findOne.mockResolvedValue(mockRepo);
			mockedUserService.getUserById.mockResolvedValue(mockOwner);
			mockWorkgroupCollection.findOne.mockResolvedValue({ Members: [{ email: 'existing@test.com', canEdit: true }] });

			await expect(
				workgroupService.addMember(repoId, { email: 'existing@test.com', canEdit: false })
			).rejects.toThrow('This user is already in the work group');
		});

		it('should throw if repository owner not found', async () => {
			mockRepoCollection.findOne.mockResolvedValue(mockRepo);
			mockedUserService.getUserById.mockResolvedValue(null);

			await expect(
				workgroupService.addMember(repoId, { email: 'new@test.com', canEdit: false })
			).rejects.toThrow('Repository owner not found');
		});
	});

	describe('removeFromWorkgroup', () => {
		it('should pull member from workgroup', async () => {
			mockWorkgroupCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
			mockRepoCollection.findOne.mockResolvedValue(mockRepo);
			mockedUserService.getUserById.mockResolvedValue(mockOwner);
			mockWorkgroupCollection.findOne.mockResolvedValue({ Members: [] });

			await workgroupService.removeFromWorkgroup(repoId, { email: 'remove@test.com' });

			expect(mockWorkgroupCollection.updateOne).toHaveBeenCalledWith(
				{ Repo: new ObjectId(repoId) },
				{ $pull: { Members: { email: 'remove@test.com' } } }
			);
		});
	});

	describe('removeUserFromAllWorkgroups', () => {
		it('should remove user from all workgroups by email', async () => {
			mockWorkgroupCollection.updateMany.mockResolvedValue({ modifiedCount: 3 });

			const result = await workgroupService.removeUserFromAllWorkgroups('user@test.com');

			expect(mockWorkgroupCollection.updateMany).toHaveBeenCalledWith(
				{ 'Members.email': 'user@test.com' },
				{ $pull: { Members: { email: 'user@test.com' } } }
			);
			expect(result.modifiedCount).toBe(3);
		});
	});
});
