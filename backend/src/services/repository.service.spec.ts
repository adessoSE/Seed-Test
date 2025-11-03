// src/services/repository.service.spec.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';

// --- 1. Import types only. DO NOT import implementation files. ---
import type { AiConfig } from '@shared/models/RepositoryContainer';
import type { Workgroup } from './workgroup.service';
import type { Repository } from '@shared/models/Repository'; // Import this type

// --- 2. Mock all external dependencies ---
// These are hoisted by Vitest and run before all imports.

const mockDb = {
  collection: vi.fn(),
};
vi.mock('../database/DbConnector', () => ({
  getConnection: vi.fn(() => mockDb),
}));

const mockedStoryService = {
  deleteStory: vi.fn().mockResolvedValue({ ok: 1 }),
};
vi.mock('./story.service', () => mockedStoryService);

const mockedWorkgroupService = {
  getWorkgroup: vi.fn(),
  getMembers: vi.fn(),
  promoteNewOwner: vi.fn().mockResolvedValue({ ok: 1 }),
  transferOwnership: vi.fn().mockResolvedValue('Success'),
};
vi.mock('./workgroup.service', () => mockedWorkgroupService);

const mockedUserService = {
  getUserById: vi.fn(),
};
vi.mock('./user.service', () => mockedUserService);

const mockedCryptoHelper = {
  encrypt: vi.fn((text: string) => `encrypted(${text})`),
};
vi.mock('../helpers/cryptoHelper', () => mockedCryptoHelper);

// --- 3. Define mock collections ---
const mockRepoCollection = {
  findOne: vi.fn(),
  find: vi.fn(),
  insertOne: vi.fn(),
  updateOne: vi.fn(),
  deleteMany: vi.fn(),
  deleteOne: vi.fn(),
  findOneAndUpdate: vi.fn(),
};
const mockUserCollection = {
  findOne: vi.fn(),
};
const mockWorkgroupCollection = {
  findOne: vi.fn(),
  deleteOne: vi.fn(),
};
const mockBlocksCollection = {
  deleteMany: vi.fn(),
};


// --- 4. The Test Suite ---
describe('RepositoryService', () => {
  
  // Define a variable to hold the dynamically imported service
  let repositoryService: typeof import('./repository.service');

  // Reset all mocks before each individual test
  beforeEach(async () => {
    // Dynamically import the service *inside* beforeEach.
    // This guarantees all vi.mock() calls above have already run
    // and breaks the circular dependency loading-issue.
    repositoryService = await vi.importActual<typeof import('./repository.service')>('./repository.service');

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

    it('should return an error string if the name is taken', async () => {
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

      // B. Act
      const result = await repositoryService.createRepo(ownerId, repoName);

      // C. Assert
      expect(result).toBe("You already own a repository with this name!");
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
        apiKey: textKey || 'default-text-key',
      },
      jsonConversion: {
        provider: 'custom',
        name: 'cloud',
        modelName: 'gpt-3',
        baseURL: 'http://api.com',
        apiKey: jsonKey || 'default-json-key',
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

    it('should NOT encrypt placeholder AI API keys', async () => {
      // A. Arrange
      const repoId = new ObjectId().toHexString();
      const aiConfig = createMockAiConfig('key:****', 'another-key');
      
      mockRepoCollection.findOneAndUpdate.mockResolvedValue({ value: { ...aiConfig } });

      // B. Act
      await repositoryService.updateRepository(repoId, undefined, undefined, aiConfig);

      // C. Assert
      expect(mockedCryptoHelper.encrypt).toHaveBeenCalledWith('another-key');
      expect(mockedCryptoHelper.encrypt).not.toHaveBeenCalledWith('key:****');
      
      const savedConfig = mockRepoCollection.findOneAndUpdate.mock.calls[0][1].$set.aiConfig;
      expect(savedConfig.textPreparation.apiKey).toBe('key:****'); 
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
      repoType: 'db',
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
});