// src/services/repository.service.spec.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';

// --- 1. Import types and the module under test ---
import type { AiConfig } from '@seed-test/shared/models/RepositoryContainer.js';
import type { Workgroup } from './workgroup.service.js';
import type { Repository } from '@seed-test/shared/models/Repository.js';

// --- 2. Mock all external dependencies ---
// vi.hoisted runs at hoist-time alongside vi.mock, avoiding TDZ errors
// when mock factories reference variables declared with const.
const {
	mockDb,
	mockedStoryService,
	mockedWorkgroupService,
	mockedUserService,
	mockedCryptoHelper
} = vi.hoisted(() => ({
	mockDb: { collection: vi.fn() },
	mockedStoryService: {
		deleteStory: vi.fn().mockResolvedValue({ ok: 1 })
	},
	mockedWorkgroupService: {
		getWorkgroup: vi.fn(),
		getMembers: vi.fn(),
		promoteNewOwner: vi.fn().mockResolvedValue({ ok: 1 }),
		transferOwnership: vi.fn().mockResolvedValue('Success')
	},
	mockedUserService: {
		getUserById: vi.fn()
	},
	mockedCryptoHelper: {
		encrypt: vi.fn((text: string) => `encrypted(${text})`)
	}
}));

vi.mock('../database/DbConnector', () => ({
	getConnection: vi.fn(() => mockDb)
}));
vi.mock('./story.service', () => mockedStoryService);
vi.mock('./workgroup.service', () => mockedWorkgroupService);
vi.mock('./user.service', () => mockedUserService);
vi.mock('../helpers/cryptoHelper', () => mockedCryptoHelper);

// Import the module under test after mocks are registered
import * as repositoryService from './repository.service.js';

// --- 3. Define mock collections ---
const mockRepoCollection = {
	findOne: vi.fn(),
	find: vi.fn(),
	insertOne: vi.fn(),
	updateOne: vi.fn(),
	deleteMany: vi.fn(),
	deleteOne: vi.fn(),
	findOneAndUpdate: vi.fn()
};
const mockUserCollection = {
	findOne: vi.fn()
};
const mockWorkgroupCollection = {
	findOne: vi.fn(),
	deleteOne: vi.fn()
};
const mockBlocksCollection = {
	deleteMany: vi.fn()
};


// --- 4. The Test Suite ---
describe('RepositoryService', () => {

	// Reusable valid ObjectId strings
	const REPO_ID = new ObjectId().toHexString();
	const OWNER_ID = new ObjectId().toHexString();

	// Reset all mocks before each individual test
	beforeEach(() => {
		vi.clearAllMocks();

		// Reset the implementation of mockDb.collection
		mockDb.collection.mockImplementation((name: string) => {
			if (name === 'Repositories') return mockRepoCollection;
			if (name === 'User') return mockUserCollection;
			if (name === 'Workgroups') return mockWorkgroupCollection;
			if (name === 'CustomBlocks') return mockBlocksCollection;
			throw new Error(`Unexpected collection access: ${name}`);
		});

		// Reset all mock function implementations within collections
		Object.values(mockRepoCollection).forEach(fn => fn.mockReset());
		Object.values(mockUserCollection).forEach(fn => fn.mockReset());
		Object.values(mockWorkgroupCollection).forEach(fn => fn.mockReset());
		Object.values(mockBlocksCollection).forEach(fn => fn.mockReset());
	});

	// --- Tests for createRepo ---

	describe('createRepo', () => {
		it('should create a new repo if the name is not taken', async () => {
			// A. Arrange
			const ownerId = new ObjectId().toHexString();
			const repoName = 'New Repo';
			mockRepoCollection.findOne.mockResolvedValue(null); // No existing repo found
			mockRepoCollection.insertOne.mockResolvedValue({ insertedId: new ObjectId() });

			// B. Act
			const result = await repositoryService.createRepo(ownerId, repoName);

			// C. Assert
			expect(result).toBeInstanceOf(ObjectId);
			expect(mockRepoCollection.findOne).toHaveBeenCalledWith(
				{ owner: new ObjectId(ownerId), repoName: repoName },
				expect.anything()
			);
			expect(mockRepoCollection.insertOne).toHaveBeenCalledTimes(1);
		});

		it('should throw an error if the name is taken', async () => {
			// A. Arrange
			const ownerId = new ObjectId().toHexString();
			const repoName = 'Existing Repo';

			const mockExistingRepo: Repository = {
				_id: new ObjectId(),
				repoName: repoName,
				owner: new ObjectId(ownerId),
				stories: [],
				repoType: 'db',
				groups: []
			};
			mockRepoCollection.findOne.mockResolvedValue(mockExistingRepo); // Repo found

			// B. Act & Assert
			await expect(repositoryService.createRepo(ownerId, repoName))
				.rejects.toThrow('You already own a repository with this name!');
			expect(mockRepoCollection.insertOne).not.toHaveBeenCalled();
		});
	});

	// --- Tests for updateRepository (AI Key Encryption) ---

	describe('updateRepository', () => {
		// Helper function to create a valid AiConfig mock
		const createMockAiConfig = (textKey?: string, jsonKey?: string): AiConfig => ({
			textPreparation: {
				provider: 'custom',
				name: 'cloud',
				modelName: 'gpt-4',
				baseURL: 'http://api.com',
				apiKey: textKey ?? 'default-text-key'
			},
			jsonConversion: {
				provider: 'custom',
				name: 'cloud',
				modelName: 'gpt-3',
				baseURL: 'http://api.com',
				apiKey: jsonKey ?? 'default-json-key'
			}
		});

		it('should encrypt AI API keys before saving', async () => {
			// A. Arrange
			const repoId = new ObjectId().toHexString();
			const aiConfig = createMockAiConfig('plain-text-key-1', 'plain-text-key-2');
      
			mockRepoCollection.findOneAndUpdate.mockResolvedValue({ value: { ...aiConfig } }); // Return mock value

			// B. Act
			await repositoryService.updateRepository(repoId, 'New Name', {}, aiConfig);

			// C. Assert
			expect(mockedCryptoHelper.encrypt).toHaveBeenCalledWith('plain-text-key-1');
			expect(mockedCryptoHelper.encrypt).toHaveBeenCalledWith('plain-text-key-2');
      
			const savedConfig = mockRepoCollection.findOneAndUpdate.mock.calls[0][1].$set.aiConfig;
			expect(savedConfig.textPreparation.apiKey).toBe('encrypted(plain-text-key-1)');
			expect(savedConfig.jsonConversion.apiKey).toBe('encrypted(plain-text-key-2)');
		});

		it('should NOT encrypt already-encrypted AI API keys', async () => {
			// A. Arrange — simulate the nonce:encrypted:authTag format (24 hex : variable hex : 32 hex)
			const alreadyEncrypted = 'aabbccddee112233aabbccdd:abcdef1234567890:aabbccddee112233aabbccddee112233';
			const repoId = new ObjectId().toHexString();
			const aiConfig = createMockAiConfig(alreadyEncrypted, 'another-key');

			mockRepoCollection.findOneAndUpdate.mockResolvedValue({ value: { ...aiConfig } });

			// B. Act
			await repositoryService.updateRepository(repoId, undefined, undefined, aiConfig);

			// C. Assert
			expect(mockedCryptoHelper.encrypt).toHaveBeenCalledWith('another-key');
			expect(mockedCryptoHelper.encrypt).not.toHaveBeenCalledWith(alreadyEncrypted);

			const savedConfig = mockRepoCollection.findOneAndUpdate.mock.calls[0][1].$set.aiConfig;
			expect(savedConfig.textPreparation.apiKey).toBe(alreadyEncrypted);
			expect(savedConfig.jsonConversion.apiKey).toBe('encrypted(another-key)');
		});
	});

	// --- Tests for deleteRepository (CRITICAL) ---

	describe('deleteRepository', () => {
		const ownerId = new ObjectId().toHexString();
		const repoId = new ObjectId().toHexString();
		const mockRepo: Repository = {
			_id: new ObjectId(repoId),
			owner: new ObjectId(ownerId),
			stories: [new ObjectId(), new ObjectId()],
			groups: [],
			repoName: 'Test Repo',
			repoType: 'db'
		};

		it('should completely DELETE the repo if no workgroup members exist', async () => {
			// A. Arrange
			mockRepoCollection.findOne.mockResolvedValue(mockRepo);
			mockedWorkgroupService.getWorkgroup.mockResolvedValue(null);
			mockBlocksCollection.deleteMany.mockResolvedValue({ deletedCount: 2 });
			mockRepoCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });
			mockWorkgroupCollection.deleteOne.mockResolvedValue({ deletedCount: 0 });
      
			// B. Act
			const result = await repositoryService.deleteRepository(repoId, ownerId);

			// C. Assert
			expect(result.status).toBe('deleted');
			expect(mockedStoryService.deleteStory).toHaveBeenCalledTimes(mockRepo.stories.length);
			expect(mockedStoryService.deleteStory).toHaveBeenCalledWith(repoId, mockRepo.stories[0].toHexString());
			expect(mockBlocksCollection.deleteMany).toHaveBeenCalledWith({ repositoryId: new ObjectId(repoId) });
			expect(mockRepoCollection.deleteOne).toHaveBeenCalledWith({ _id: new ObjectId(repoId) });
			expect(mockedWorkgroupService.promoteNewOwner).not.toHaveBeenCalled();
			expect(mockRepoCollection.updateOne).not.toHaveBeenCalled();
		});

		it('should TRANSFER ownership if workgroup members exist', async () => {
			// A. Arrange
			const newOwnerEmail = 'new.owner@test.com';
			const newOwnerId = new ObjectId();
      
			const mockWorkgroup: Workgroup = { 
				_id: new ObjectId(), 
				name: 'Test Workgroup', 
				owner: 'old.owner@test.com', 
				Repo: new ObjectId(repoId), 
				Members: [{ email: newOwnerEmail, canEdit: true }] 
			};
      
			const mockNewOwner = { _id: newOwnerId, email: newOwnerEmail };

			mockRepoCollection.findOne.mockResolvedValue(mockRepo);
			mockedWorkgroupService.getWorkgroup.mockResolvedValue(mockWorkgroup);
			mockedWorkgroupService.getMembers.mockResolvedValue({
				owner: { email: 'old.owner@test.com', canEdit: true },
				member: [{ email: newOwnerEmail, canEdit: true }]
			});
			mockUserCollection.findOne.mockResolvedValue(mockNewOwner);
			mockRepoCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

			// B. Act
			const result = await repositoryService.deleteRepository(repoId, ownerId);

			// C. Assert
			expect(result.status).toBe('ownership_transferred');
			expect(result.newOwner).toBe(newOwnerEmail);
			expect(mockRepoCollection.updateOne).toHaveBeenCalledWith(
				{ _id: new ObjectId(repoId) },
				{ $set: { owner: newOwnerId } }
			);
			expect(mockedWorkgroupService.promoteNewOwner).toHaveBeenCalledWith(repoId, newOwnerEmail);
			expect(mockedStoryService.deleteStory).not.toHaveBeenCalled();
			expect(mockRepoCollection.deleteOne).not.toHaveBeenCalled();
		});
	});

	// --- Tests for dbProjects (error propagation) ---

	describe('dbProjects', () => {
		it('should return an empty array for an empty userId', async () => {
			const result = await repositoryService.dbProjects('');
			expect(result).toEqual([]);
			expect(mockDb.collection).not.toHaveBeenCalled();
		});

		it('should propagate database errors instead of swallowing them', async () => {
			const dbError = new Error('Connection lost');
			mockUserCollection.findOne.mockRejectedValue(dbError);

			await expect(repositoryService.dbProjects(new ObjectId().toHexString()))
				.rejects.toThrow('Connection lost');
		});

		it('should filter to only db-source repositories', async () => {
			const userId = new ObjectId().toHexString();
			const dbRepo = { _id: new ObjectId(), repoName: 'DB Repo', repoType: 'db', owner: new ObjectId(userId), stories: [], groups: [] };
			const githubRepo = { _id: new ObjectId(), repoName: 'GitHub Repo', repoType: 'github', owner: new ObjectId(userId), stories: [], groups: [] };

			// getRepository path: find user, find owned repos, find workgroup memberships
			mockUserCollection.findOne.mockResolvedValue({ _id: new ObjectId(userId), email: 'test@test.de' });
			mockRepoCollection.find.mockReturnValue({ toArray: vi.fn().mockResolvedValue([dbRepo, githubRepo]) });
			mockDb.collection.mockImplementation((name: string) => {
				if (name === 'Repositories') return mockRepoCollection;
				if (name === 'User') return mockUserCollection;
				if (name === 'Workgroups') return { find: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }) };
				throw new Error(`Unexpected collection: ${name}`);
			});

			const result = await repositoryService.dbProjects(userId);

			expect(result).toHaveLength(1);
			expect(result[0].repoName).toBe('DB Repo');
			expect(result[0].source).toBe('db');
		});
	});

	// --- Tests for deleteRepository edge cases ---

	describe('deleteRepository - edge cases', () => {
		it('should throw if the repository does not exist', async () => {
			mockRepoCollection.findOne.mockResolvedValue(null);

			await expect(repositoryService.deleteRepository('aabbccddeeff001122334455', new ObjectId().toHexString()))
				.rejects.toThrow('Repository not found or user is not the owner.');
		});
	});

	// --- uniqueRepositories (pure function) ---

	describe('uniqueRepositories', () => {
		it('should deduplicate by _id', () => {
			const id1 = new ObjectId();
			const id2 = new ObjectId();
			const repos = [
				{ _id: id1, name: 'A' },
				{ _id: id2, name: 'B' },
				{ _id: id1, name: 'A duplicate' }
			];

			const result = repositoryService.uniqueRepositories(repos);

			expect(result).toHaveLength(2);
			expect(result[0].name).toBe('A');
		});

		it('should skip entries without _id', () => {
			const repos = [{ name: 'no id' }, { _id: new ObjectId(), name: 'has id' }];
			const result = repositoryService.uniqueRepositories(repos);
			expect(result).toHaveLength(1);
			expect(result[0].name).toBe('has id');
		});

		it('should return empty array for empty input', () => {
			expect(repositoryService.uniqueRepositories([])).toEqual([]);
		});
	});

	// --- Simple DB lookups ---

	describe('getOneRepositoryById', () => {
		it('should return repo when found', async () => {
			const repo = { _id: new ObjectId(REPO_ID), repoName: 'Test' };
			mockRepoCollection.findOne.mockResolvedValue(repo);

			const result = await repositoryService.getOneRepositoryById(REPO_ID);

			expect(result).toEqual(repo);
			expect(mockRepoCollection.findOne).toHaveBeenCalledWith({ _id: new ObjectId(REPO_ID) });
		});

		it('should return null when not found', async () => {
			mockRepoCollection.findOne.mockResolvedValue(null);
			const result = await repositoryService.getOneRepositoryById(REPO_ID);
			expect(result).toBeNull();
		});
	});

	describe('getRepoByStoryId', () => {
		it('should find repo containing the story', async () => {
			const storyId = new ObjectId().toHexString();
			const repo = { _id: new ObjectId(), stories: [new ObjectId(storyId)] };
			mockRepoCollection.findOne.mockResolvedValue(repo);

			const result = await repositoryService.getRepoByStoryId(storyId);

			expect(result).toEqual(repo);
			expect(mockRepoCollection.findOne).toHaveBeenCalledWith({ stories: new ObjectId(storyId) });
		});
	});

	describe('getOneRepository', () => {
		it('should find by owner and name', async () => {
			const repo = { _id: new ObjectId(), repoName: 'MyRepo' };
			mockRepoCollection.findOne.mockResolvedValue(repo);

			const result = await repositoryService.getOneRepository(OWNER_ID, 'MyRepo');

			expect(mockRepoCollection.findOne).toHaveBeenCalledWith({
				owner: new ObjectId(OWNER_ID),
				repoName: 'MyRepo'
			});
			expect(result).toEqual(repo);
		});
	});

	describe('getRepoSettingsById', () => {
		it('should return settings when repo exists', async () => {
			mockRepoCollection.findOne.mockResolvedValue({ settings: { browser: 'chromium' } });
			const result = await repositoryService.getRepoSettingsById(REPO_ID);
			expect(result).toEqual({ browser: 'chromium' });
		});

		it('should return null when repo has no settings', async () => {
			mockRepoCollection.findOne.mockResolvedValue({});
			const result = await repositoryService.getRepoSettingsById(REPO_ID);
			expect(result).toBeNull();
		});

		it('should return null when repo not found', async () => {
			mockRepoCollection.findOne.mockResolvedValue(null);
			const result = await repositoryService.getRepoSettingsById(REPO_ID);
			expect(result).toBeNull();
		});
	});

	describe('getRepoAiConfigById', () => {
		it('should return aiConfig when present', async () => {
			const config = { textPreparation: { provider: 'openai' } };
			mockRepoCollection.findOne.mockResolvedValue({ aiConfig: config });
			const result = await repositoryService.getRepoAiConfigById(REPO_ID);
			expect(result).toEqual(config);
		});

		it('should return null when aiConfig absent', async () => {
			mockRepoCollection.findOne.mockResolvedValue({});
			const result = await repositoryService.getRepoAiConfigById(REPO_ID);
			expect(result).toBeNull();
		});
	});

	// --- Ownership Transfer ---

	describe('updateOwnerInRepo', () => {
		it('should update owner and transfer workgroup', async () => {
			const oldOwner = { _id: new ObjectId(OWNER_ID), email: 'old@test.de' };
			const newOwner = { _id: new ObjectId(), email: 'new@test.de' };
			mockedUserService.getUserById
				.mockResolvedValueOnce(oldOwner)
				.mockResolvedValueOnce(newOwner);
			mockRepoCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

			const result = await repositoryService.updateOwnerInRepo(REPO_ID, newOwner._id.toHexString(), OWNER_ID);

			expect(result).toBe('Success');
			expect(mockRepoCollection.updateOne).toHaveBeenCalled();
			expect(mockedWorkgroupService.transferOwnership).toHaveBeenCalledWith(REPO_ID, 'new@test.de', 'old@test.de');
		});

		it('should throw when user not found', async () => {
			mockedUserService.getUserById.mockResolvedValue(null);

			await expect(repositoryService.updateOwnerInRepo(REPO_ID, OWNER_ID, OWNER_ID))
				.rejects.toThrow('Could not find one or both users');
		});
	});

	// --- Story Array Operations ---

	describe('insertStoryIdIntoRepo', () => {
		it('should push story id into repo', async () => {
			const storyId = new ObjectId().toHexString();
			mockRepoCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

			await repositoryService.insertStoryIdIntoRepo(storyId, REPO_ID);

			expect(mockRepoCollection.updateOne).toHaveBeenCalledWith(
				{ _id: new ObjectId(REPO_ID) },
				{ $push: { stories: new ObjectId(storyId) } },
				expect.anything()
			);
		});
	});

	describe('updateStoriesArrayInRepo', () => {
		it('should replace stories array', async () => {
			const ids = [new ObjectId().toHexString(), new ObjectId().toHexString()];
			mockRepoCollection.findOneAndUpdate.mockResolvedValue({ stories: ids.map(id => new ObjectId(id)) });

			const result = await repositoryService.updateStoriesArrayInRepo(REPO_ID, ids);

			expect(result).toBeDefined();
			expect(mockRepoCollection.findOneAndUpdate).toHaveBeenCalledWith(
				{ _id: new ObjectId(REPO_ID) },
				expect.objectContaining({ $set: expect.objectContaining({ stories: expect.any(Array) }) }),
				expect.objectContaining({ returnDocument: 'after' })
			);
		});
	});

	// --- Story Group Functions ---

	describe('getAllStoryGroups', () => {
		it('should return groups from repo', async () => {
			const groupId = new ObjectId();
			const groups = [{ _id: new ObjectId(), name: 'Group 1', member_stories: [] }];
			mockRepoCollection.findOne.mockResolvedValue({ groups });

			const result = await repositoryService.getAllStoryGroups(REPO_ID);

			expect(result).toEqual([{ _id: expect.any(String), name: 'Group 1', member_stories: [] }]);
			expect(mockRepoCollection.findOne).toHaveBeenCalledWith(
				{ _id: new ObjectId(REPO_ID) },
				expect.objectContaining({ projection: { groups: 1 } })
			);
		});

		it('should return empty array when repo has no groups', async () => {
			mockRepoCollection.findOne.mockResolvedValue({});
			const result = await repositoryService.getAllStoryGroups(REPO_ID);
			expect(result).toEqual([]);
		});

		it('should return empty array when repo not found', async () => {
			mockRepoCollection.findOne.mockResolvedValue(null);
			const result = await repositoryService.getAllStoryGroups(REPO_ID);
			expect(result).toEqual([]);
		});
	});

	describe('getOneStoryGroup', () => {
		it('should find group by id', async () => {
			const groupId = new ObjectId();
			const groups = [
				{ _id: new ObjectId(), name: 'Other' },
				{ _id: groupId, name: 'Target' }
			];
			mockRepoCollection.findOne.mockResolvedValue({ groups });

			const result = await repositoryService.getOneStoryGroup(REPO_ID, groupId.toHexString());

			expect(result?.name).toBe('Target');
		});

		it('should return undefined when group not found', async () => {
			mockRepoCollection.findOne.mockResolvedValue({ groups: [] });
			const result = await repositoryService.getOneStoryGroup(REPO_ID, new ObjectId().toHexString());
			expect(result).toBeUndefined();
		});
	});

	describe('createStoryGroup', () => {
		it('should create group and return its id', async () => {
			const groupId = new ObjectId();
			mockRepoCollection.findOneAndUpdate.mockResolvedValue({
				groups: [{ _id: groupId, name: 'New Group' }]
			});

			const result = await repositoryService.createStoryGroup(REPO_ID, 'New Group', [], false);

			expect(result).toEqual(groupId);
			expect(mockRepoCollection.findOneAndUpdate).toHaveBeenCalledWith(
				{ _id: new ObjectId(REPO_ID) },
				expect.objectContaining({ $push: expect.anything() }),
				expect.objectContaining({ upsert: false, returnDocument: 'after' })
			);
		});

		it('should throw when repo not found', async () => {
			mockRepoCollection.findOneAndUpdate.mockResolvedValue(null);

			await expect(repositoryService.createStoryGroup(REPO_ID, 'Group', [], false))
				.rejects.toThrow('not found');
		});
	});

	describe('updateStoryGroup', () => {
		it('should update group at correct index', async () => {
			const groupId = new ObjectId();
			const repo = {
				groups: [{ _id: groupId, name: 'Old Name', member_stories: [] }]
			};
			mockRepoCollection.findOne.mockResolvedValue(repo);
			mockRepoCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

			const updated = { name: 'New Name', member_stories: [], isSequential: true };
			const result = await repositoryService.updateStoryGroup(REPO_ID, groupId.toHexString(), updated);

			expect(result.name).toBe('New Name');
			expect(mockRepoCollection.updateOne).toHaveBeenCalled();
		});

		it('should throw when repo not found', async () => {
			mockRepoCollection.findOne.mockResolvedValue(null);

			await expect(repositoryService.updateStoryGroup(REPO_ID, new ObjectId().toHexString(), {} as any))
				.rejects.toThrow('Repository not found');
		});

		it('should throw when group not found in repo', async () => {
			mockRepoCollection.findOne.mockResolvedValue({ groups: [] });

			await expect(repositoryService.updateStoryGroup(REPO_ID, new ObjectId().toHexString(), {} as any))
				.rejects.toThrow('Group not found');
		});
	});

	describe('deleteStoryGroup', () => {
		it('should pull group by id', async () => {
			mockRepoCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
			const groupId = new ObjectId().toHexString();

			await repositoryService.deleteStoryGroup(REPO_ID, groupId);

			expect(mockRepoCollection.updateOne).toHaveBeenCalledWith(
				{ _id: new ObjectId(REPO_ID) },
				{ $pull: { groups: { _id: new ObjectId(groupId) } } }
			);
		});
	});

	describe('addToStoryGroup', () => {
		it('should push story into group', async () => {
			const groupId = new ObjectId().toHexString();
			const storyId = new ObjectId().toHexString();
			mockRepoCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

			await repositoryService.addToStoryGroup(REPO_ID, groupId, storyId);

			expect(mockRepoCollection.updateOne).toHaveBeenCalledWith(
				{ _id: new ObjectId(REPO_ID), 'groups._id': new ObjectId(groupId) },
				{ $push: { 'groups.$.member_stories': new ObjectId(storyId) } }
			);
		});
	});

	describe('removeFromStoryGroup', () => {
		it('should pull story from group', async () => {
			const groupId = new ObjectId().toHexString();
			const storyId = new ObjectId().toHexString();
			mockRepoCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

			await repositoryService.removeFromStoryGroup(REPO_ID, groupId, storyId);

			expect(mockRepoCollection.updateOne).toHaveBeenCalledWith(
				{ _id: new ObjectId(REPO_ID), 'groups._id': new ObjectId(groupId) },
				{ $pull: { 'groups.$.member_stories': new ObjectId(storyId) } }
			);
		});
	});

	describe('updateStoryGroupsArray', () => {
		it('should replace the entire groups array', async () => {
			const groupId = new ObjectId();
			const storyId = new ObjectId().toHexString();
			const groups = [{ _id: groupId.toHexString(), name: 'G1', member_stories: [storyId] }, { _id: new ObjectId().toHexString(), name: 'G2', member_stories: [] }] as any;
			mockRepoCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

			await repositoryService.updateStoryGroupsArray(REPO_ID, groups);

			expect(mockRepoCollection.updateOne).toHaveBeenCalledWith(
				{ _id: new ObjectId(REPO_ID) },
				{ $set: { groups: expect.arrayContaining([
					expect.objectContaining({
						name: 'G1',
						member_stories: expect.arrayContaining([expect.any(ObjectId)])
					})
				])} }
			);
		});
	});

	// --- Source-specific functions ---

	describe('getOneGitRepository', () => {
		it('should find by name and github type', async () => {
			const repo = { _id: new ObjectId(), repoName: 'my-repo', repoType: 'github' };
			mockRepoCollection.findOne.mockResolvedValue(repo);

			const result = await repositoryService.getOneGitRepository('my-repo');

			expect(result).toEqual(repo);
			expect(mockRepoCollection.findOne).toHaveBeenCalledWith({ repoName: 'my-repo', repoType: 'github' });
		});
	});

	describe('getOneJiraRepository', () => {
		it('should find by name and jira type', async () => {
			mockRepoCollection.findOne.mockResolvedValue({ repoName: 'JIRA-Project', repoType: 'jira' });

			const result = await repositoryService.getOneJiraRepository('JIRA-Project');

			expect(mockRepoCollection.findOne).toHaveBeenCalledWith({ repoName: 'JIRA-Project', repoType: 'jira' });
			expect(result?.repoName).toBe('JIRA-Project');
		});
	});

	describe('getAllSourceReposFromDb', () => {
		it('should find all repos of a given type', async () => {
			const repos = [{ repoName: 'R1' }, { repoName: 'R2' }];
			mockRepoCollection.find.mockReturnValue({ toArray: vi.fn().mockResolvedValue(repos) });

			const result = await repositoryService.getAllSourceReposFromDb('github');

			expect(result).toEqual(repos);
			expect(mockRepoCollection.find).toHaveBeenCalledWith({ repoType: 'github' });
		});
	});

	describe('createJiraRepo', () => {
		it('should create repo with jira type and empty owner', async () => {
			mockRepoCollection.insertOne.mockResolvedValue({ insertedId: new ObjectId() });

			await repositoryService.createJiraRepo('My Jira Project');

			expect(mockRepoCollection.insertOne).toHaveBeenCalledWith(
				expect.objectContaining({
					repoName: 'My Jira Project',
					repoType: 'jira',
					owner: '',
					stories: []
				})
			);
		});
	});

	describe('createGitRepo', () => {
		it('should set owner when user is the github owner', async () => {
			const userId = new ObjectId().toHexString();
			mockRepoCollection.insertOne.mockResolvedValue({ insertedId: new ObjectId() });

			await repositoryService.createGitRepo('12345', 'my-repo', 12345, userId);

			expect(mockRepoCollection.insertOne).toHaveBeenCalledWith(
				expect.objectContaining({
					repoName: 'my-repo',
					repoType: 'github',
					gitOwner: '12345',
					owner: new ObjectId(userId)
				})
			);
		});

		it('should leave owner empty when user is not the github owner', async () => {
			const userId = new ObjectId().toHexString();
			mockRepoCollection.insertOne.mockResolvedValue({ insertedId: new ObjectId() });

			await repositoryService.createGitRepo('99999', 'their-repo', 12345, userId);

			expect(mockRepoCollection.insertOne).toHaveBeenCalledWith(
				expect.objectContaining({
					owner: '',
					gitOwner: '99999'
				})
			);
		});
	});

	// --- getRepository (complex, multi-query) ---

	describe('getRepository', () => {
		it('should return empty array when user not found', async () => {
			mockUserCollection.findOne.mockResolvedValue(null);
			const result = await repositoryService.getRepository(OWNER_ID);
			expect(result).toEqual([]);
		});

		it('should combine owned and member repos, deduplicating', async () => {
			const userId = OWNER_ID;
			const repoId1 = new ObjectId();
			const repoId2 = new ObjectId();
			const user = { _id: new ObjectId(userId), email: 'test@test.de' };

			mockUserCollection.findOne.mockResolvedValue(user);

			// Owned repos
			const ownedRepo = { _id: repoId1, repoName: 'Owned', repoType: 'db', owner: new ObjectId(userId) };
			// Member repos (overlapping repoId1 to test dedup)
			const memberRepo = { _id: repoId2, repoName: 'Shared', repoType: 'db', owner: new ObjectId() };

			mockRepoCollection.find.mockReturnValueOnce({ toArray: vi.fn().mockResolvedValue([ownedRepo]) });

			// Workgroup query
			const mockWorkgroupCol = {
				find: vi.fn().mockReturnValue({
					toArray: vi.fn().mockResolvedValue([{ Repo: repoId2, Members: [{ email: 'test@test.de', canEdit: true }] }])
				})
			};
			mockDb.collection.mockImplementation((name: string) => {
				if (name === 'Repositories') return mockRepoCollection;
				if (name === 'User') return mockUserCollection;
				if (name === 'Workgroups') return mockWorkgroupCol;
				throw new Error(`Unexpected: ${name}`);
			});

			mockRepoCollection.find.mockReturnValueOnce({ toArray: vi.fn().mockResolvedValue([memberRepo]) });

			const result = await repositoryService.getRepository(userId);

			expect(result).toHaveLength(2);
			expect(result.map(r => r.repoName)).toContain('Owned');
			expect(result.map(r => r.repoName)).toContain('Shared');
		});
	});
});