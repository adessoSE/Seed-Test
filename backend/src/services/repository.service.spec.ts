// src/services/repository.service.spec.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';

// --- 1. Import types and the module under test ---
import type { AiConfig } from '@shared/models/RepositoryContainer.js';
import type { Workgroup } from './workgroup.service.js';
import type { Repository } from '@shared/models/Repository.js';

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
				apiKey: textKey || 'default-text-key'
			},
			jsonConversion: {
				provider: 'custom',
				name: 'cloud',
				modelName: 'gpt-3',
				baseURL: 'http://api.com',
				apiKey: jsonKey || 'default-json-key'
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
});