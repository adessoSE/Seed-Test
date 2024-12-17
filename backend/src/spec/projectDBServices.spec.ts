const { Sources } = require('../../dist/models/project');

jest.mock('../database/projectDBServices', () => ({
  createCustomProject: jest.fn(),
  createJiraProject: jest.fn(),
  createGitProject: jest.fn(),
  getUserProjects: jest.fn(),
  getOneProject: jest.fn(),
  getOneProjectById: jest.fn(),
  getOneGitProject: jest.fn(),
  getOneJiraProject: jest.fn(),
  getAllSourceProjectsFromDb: jest.fn(),
  getProjectSettingsById: jest.fn(),
  updateProject: jest.fn(),
  updateOwnerInProject: jest.fn(),
  deleteProject: jest.fn(),
  // Other methods
}));

let mockDb;
let mockUserCollection;
let mockRepoCollection;
let mockWGCollection;

mockUserCollection = {
  find: jest.fn().mockReturnThis(),
  findOne: jest.fn().mockReturnThis(),
  insertOne: jest.fn().mockReturnThis(),
  findOneAndUpdate: jest.fn().mockReturnThis(),
  deleteOne: jest.fn().mockReturnThis(),
  toArray: jest.fn().mockReturnThis(),
};
mockRepoCollection = {
  find: jest.fn().mockReturnThis(),
  findOne: jest.fn().mockReturnThis(),
  insertOne: jest.fn().mockReturnThis(),
  findOneAndUpdate: jest.fn().mockReturnThis(),
  deleteOne: jest.fn().mockReturnThis(),
  toArray: jest.fn().mockReturnThis(),
};
mockWGCollection = {
  find: jest.fn().mockReturnThis(),
  findOne: jest.fn().mockReturnThis(),
  insertOne: jest.fn().mockReturnThis(),
  findOneAndUpdate: jest.fn().mockReturnThis(),
  deleteOne: jest.fn().mockReturnThis(),
  toArray: jest.fn().mockReturnThis(),
};

mockDb = {
  collection: jest.fn((name) => {
    if (name === 'User') return mockUserCollection;
    if (name === 'Repositories') return mockRepoCollection;
    if (name === 'Workgroups') return mockWGCollection;
  }),
};
const dbConnector = require ('../../src/database/DbConnector');
jest.spyOn(dbConnector, 'getConnection').mockReturnValue(mockDb);

const projectDBServices = require ('../../dist/database/projectDBServices');
const { ObjectId } = require ('mongodb');

describe('projectDBServices', () => {
  
  beforeAll(() => {
    
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createProject', () => {
    it('should create a new project', async () => {
      const ownerId = '507f1f77bcf86cd799439011';
      const name = 'Test Project';
      const insertedId = new ObjectId();
      mockRepoCollection.findOne.mockResolvedValue(null);
      mockRepoCollection.insertOne.mockResolvedValue(insertedId);

      const result = await projectDBServices.createCustomProject(ownerId, name);

      expect(mockDb.collection).toHaveBeenCalledWith('Repositories');
      expect(mockRepoCollection.insertOne).toHaveBeenCalled();
      expect(result).toBe(insertedId);
    });
  });

  describe('createJiraProject', () => {
    it('should create a new Jira project', async () => {
      const projectName = 'Jira Project';
      const insertedId = new ObjectId();
      mockRepoCollection.insertOne.mockResolvedValue(insertedId.toString());

      const result = await projectDBServices.createJiraProject(projectName);

      expect(mockDb.collection).toHaveBeenCalledWith('Repositories');
      expect(mockRepoCollection.insertOne).toHaveBeenCalled();
      expect(result).toBe(insertedId.toString());
    });
  });

  describe('createGitProject', () => {
    it('should create a new GitHub project', async () => {
      const gitOwnerId = 12345;
      const repoName = 'GitHub Project';
      const userGithubId = 67890;
      const userId = '507f1f77bcf86cd799439011';
      const insertedId = new ObjectId();
      mockRepoCollection.insertOne.mockResolvedValue(insertedId.toString());

      const result = await projectDBServices.createGitProject(gitOwnerId, repoName, userGithubId, userId);

      expect(mockDb.collection).toHaveBeenCalledWith('Repositories');
      expect(mockRepoCollection.insertOne).toHaveBeenCalled();
      expect(result).toBe(insertedId.toString());
    });
  });

  describe('getUserProjects', () => {
    it('should get all projects of a user', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const userEmail = 'test@example.com';
      const userObjectId = new ObjectId(userId);
      const positiveWorkgroupsId = new ObjectId('507f1f77bcf86cd799439012');
      const negativeWorkgroupsId = new ObjectId('507f1f77bcf86cd799439013');


      const user = { _id: userObjectId, email: userEmail };
      mockUserCollection.findOne.mockResolvedValue(user);

      const positiveWorkgroups = [{ Repo: '507f1f77bcf86cd799439012' }];
      const negativeWorkgroups = [{ Repo: '507f1f77bcf86cd799439013' }];
      const userRepos = [{ _id: '507f1f77bcf86cd799439014', owner: userObjectId }];

      mockWGCollection.toArray
        .mockResolvedValueOnce(positiveWorkgroups)
        .mockResolvedValueOnce(negativeWorkgroups);
      mockRepoCollection.toArray
        .mockResolvedValueOnce([{ _id: positiveWorkgroupsId, canEdit: true }])
        .mockResolvedValueOnce([{ _id: negativeWorkgroupsId, canEdit: false }])
        .mockResolvedValueOnce(userRepos);

      const result = await projectDBServices.getUserProjects(userId);

      expect(mockDb.collection).toHaveBeenCalledWith('User');
      expect(mockDb.collection).toHaveBeenCalledWith('Repositories');
      expect(mockDb.collection).toHaveBeenCalledWith('Workgroups');
      expect(mockUserCollection.findOne).toHaveBeenCalledWith({ _id: userObjectId });
      // new ObjectId('507f1f77bcf86cd799439014')
      expect(result).toEqual([
        { _id: '507f1f77bcf86cd799439014', owner: userObjectId, canEdit: true },
        { _id: positiveWorkgroupsId, canEdit: true },
        { _id: negativeWorkgroupsId, canEdit: false },
      ]);
    });
  });

  describe('getOneProject', () => {
    it('should get a project by owner ID and name', async () => {
      const ownerId = '507f1f77bcf86cd799439011';
      const name = 'Test Project';
      const project = { _id: new ObjectId(), repoName: name };
      mockRepoCollection.findOne.mockResolvedValue(project);

      const result = await projectDBServices.getOneProject(ownerId, name);

      expect(mockDb.collection).toHaveBeenCalledWith('Repositories');
      expect(mockRepoCollection.findOne).toHaveBeenCalledWith({ owner: new ObjectId(ownerId), repoName: name });
      expect(result).toEqual(project);
    });

    it('should return null if no project is found', async () => {
      const ownerId = '507f1f77bcf86cd799439011';
      const name = 'Nonexistent Project';
      mockRepoCollection.findOne.mockResolvedValue(null);

      const result = await projectDBServices.getOneProject(ownerId, name);

      expect(mockDb.collection).toHaveBeenCalledWith('Repositories');
      expect(mockRepoCollection.findOne).toHaveBeenCalledWith({ owner: new ObjectId(ownerId), repoName: name });
      expect(result).toBeNull();
    });

    it('should throw an error if the database operation fails', async () => {
      const ownerId = '507f1f77bcf86cd799439011';
      const name = 'Test Project';
      const errorMessage = 'Database error';
      mockRepoCollection.findOne.mockRejectedValue(new Error(errorMessage));

      await expect(projectDBServices.getOneProject(ownerId, name)).rejects.toThrow(errorMessage);

      expect(mockDb.collection).toHaveBeenCalledWith('Repositories');
      expect(mockRepoCollection.findOne).toHaveBeenCalledWith({ owner: new ObjectId(ownerId), repoName: name });
    });
  });

  describe('getOneProjectById', () => {
    it('should get a project by ID', async () => {
      const projectId = '507f1f77bcf86cd799439011';
      const project = { _id: new ObjectId(projectId), repoName: 'Test Project' };
      mockRepoCollection.findOne.mockResolvedValue(project);

      const result = await projectDBServices.getOneProjectById(projectId);

      expect(mockDb.collection).toHaveBeenCalledWith('Repositories');
      expect(mockRepoCollection.findOne).toHaveBeenCalledWith({ _id: new ObjectId(projectId) });
      expect(result).toEqual(project);
    });
  });

  describe('getOneGitProject', () => {
    it('should get a GitHub project by name', async () => {
      const name = 'GitHub Project';
      const project = { _id: new ObjectId(), repoName: name };
      mockRepoCollection.findOne.mockResolvedValue(project);

      const result = await projectDBServices.getOneGitProject(name);

      expect(mockDb.collection).toHaveBeenCalledWith('Repositories');
      expect(mockRepoCollection.findOne).toHaveBeenCalledWith({ repoName: name, repoType: Sources.GITHUB });
      expect(result).toEqual(project);
    });
  });

  describe('getOneJiraProject', () => {
    it('should get a Jira project by name', async () => {
      const name = 'Jira Project';
      const project = { _id: new ObjectId(), repoName: name };
      mockRepoCollection.findOne.mockResolvedValue(project);

      const result = await projectDBServices.getOneJiraProject(name);

      expect(mockDb.collection).toHaveBeenCalledWith('Repositories');
      expect(mockRepoCollection.findOne).toHaveBeenCalledWith({ repoName: name, repoType: Sources.JIRA });
      expect(result).toEqual(project);
    });
  });

  describe('getAllSourceProjectsFromDb', () => {
    it('should get all projects of a specific source', async () => {
      const source = Sources.GITHUB;
      const projects = [{ _id: new ObjectId(), repoName: 'Project 1' }];
      mockRepoCollection.toArray.mockResolvedValue(projects);

      const result = await projectDBServices.getAllSourceProjectsFromDb(source);

      expect(mockDb.collection).toHaveBeenCalledWith('Repositories');
      expect(mockRepoCollection.find).toHaveBeenCalledWith({ repoType: source });
      expect(mockRepoCollection.toArray).toHaveBeenCalled();
      expect(result).toEqual(projects);
    });
  });

  describe('getProjectSettingsById', () => {
    it('should get the settings of a project by ID', async () => {
      const projectId = '507f1f77bcf86cd799439011';
      const settings = { stepWaitTime: 5 };
      const project = { _id: new ObjectId(projectId), settings };
      mockRepoCollection.findOne.mockResolvedValue(project);

      const result = await projectDBServices.getProjectSettingsById(projectId);

      expect(mockDb.collection).toHaveBeenCalledWith('Repositories');
      expect(mockRepoCollection.findOne).toHaveBeenCalledWith({ _id: new ObjectId(projectId) });
      expect(result).toEqual(settings);
    });
  });

  describe('updateProject', () => {
    it('should update a project', async () => {
      const projectId = '507f1f77bcf86cd799439011';
      const newName = 'Updated Project';
      const globalSettings = { stepWaitTime: 5 };
      const updatedProject = { _id: new ObjectId(projectId), repoName: newName, settings: globalSettings };
      mockRepoCollection.findOneAndUpdate.mockResolvedValue({ value: updatedProject });

      const result = await projectDBServices.updateProject(projectId, newName, globalSettings);

      expect(mockDb.collection).toHaveBeenCalledWith('Repositories');
      expect(mockRepoCollection.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: new ObjectId(projectId) },
        { $set: { repoName: newName, settings: globalSettings } },
        { returnDocument: 'after' }
      );
      expect(result).toEqual(updatedProject);
    });
  });

  describe('updateOwnerInProject', () => {
    it('should update the owner of a project', async () => {
      const repoId = '507f1f77bcf86cd799439011';
      const newOwnerId = '507f1f77bcf86cd799439012';
      const oldOwnerId = '507f1f77bcf86cd799439013';
      const successMessage = 'Success';
      mockUserCollection.findOne.mockResolvedValueOnce({ email: 'old@example.com' });
      mockUserCollection.findOne.mockResolvedValueOnce({ email: 'new@example.com' });
      mockRepoCollection.findOneAndUpdate.mockResolvedValue({});
      mockWGCollection.findOneAndUpdate = jest.fn().mockResolvedValue({});

      const result = await projectDBServices.updateOwnerInProject(repoId, newOwnerId, oldOwnerId);

      expect(mockDb.collection).toHaveBeenCalledWith('Repositories');
      expect(mockRepoCollection.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: new ObjectId(repoId) },
        { $set: { owner: new ObjectId(newOwnerId) } }
      );
      expect(mockWGCollection.findOneAndUpdate).toHaveBeenCalledWith(
        { Repo: new ObjectId(repoId) },
        { $pull: { Members: { email: 'new@example.com' } } }
      );
      expect(mockWGCollection.findOneAndUpdate).toHaveBeenCalledWith(
        { Repo: new ObjectId(repoId) },
        { $set: { owner: 'new@example.com' }, $push: { Members: { email: 'old@example.com', canEdit: true } } }
      );
      expect(result).toEqual(successMessage);
    });
  });

  describe('deleteProject', () => {
    it('should delete a project', async () => {
      const projectId = '507f1f77bcf86cd799439011';
      const ownerId = '507f1f77bcf86cd799439012';
      const deleteResult = { deletedCount: 1 };
      mockRepoCollection.deleteOne.mockResolvedValue(deleteResult);

      const result = await projectDBServices.deleteProject(projectId, ownerId);

      expect(mockDb.collection).toHaveBeenCalledWith('Repositories');
      expect(mockRepoCollection.deleteOne).toHaveBeenCalledWith({
        owner: new ObjectId(ownerId),
        _id: new ObjectId(projectId),
      });
      expect(result).toEqual(deleteResult);
    });
  });
});