const { Collections } = require('../../dist/database/Collections');
const mongoId = require ('mongodb');

jest.mock('../database/projectDBServices', () => ({
  createStoryGroup: jest.fn(),
  updateStoryGroup: jest.fn(),
  updateStoryGroupsArray: jest.fn(),
  deleteStoryGroup: jest.fn(),
  getAllStoryGroups: jest.fn(),
  getOneStoryGroup: jest.fn(),
  addToStoryGroup: jest.fn(),
  removeFromStoryGroup : jest.fn()
}));

const { createStoryGroup, updateStoryGroup, updateStoryGroupsArray, deleteStoryGroup,
  getAllStoryGroups, getOneStoryGroup, addToStoryGroup, removeFromStoryGroup} = require('../../dist/helpers/groups');

let mockDb2;
let mockRepoCollection2 = {
  find: jest.fn().mockReturnThis(),
  findOne: jest.fn().mockReturnThis(),
  insertOne: jest.fn().mockReturnThis(),
  updateOne: jest.fn().mockReturnThis(),
  findOneAndUpdate: jest.fn().mockReturnThis(),
  deleteOne: jest.fn().mockReturnThis(),
  toArray: jest.fn().mockReturnThis(),
};

mockDb2 = {
  collection: jest.fn((name) => {
    if (name === 'Repositories') return mockRepoCollection2;
  }),
};

const dbConnector2 = require ('../../src/database/DbConnector');
jest.spyOn(dbConnector2, 'getConnection').mockReturnValue(mockDb2);

describe('Groups Helper Functions', () => {
  const repoId = '507f1f77bcf86cd799439020';
  const groupId = '507f1f77bcf86cd799439021';
  const storyId = '507f1f77bcf86cd799439022';
  const group = {
    _id: groupId,
    name: 'Test Group',
    member_stories: [storyId],
    isSequential: true,
    xrayTestSet: false,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createStoryGroup', () => {
    it('should create a new story group', async () => {
      mockRepoCollection2.findOneAndUpdate.mockResolvedValue({ value: { groups: [group] } });

      const result = await createStoryGroup(repoId, group.name, group.member_stories, group.isSequential, false);

      expect(mockDb2.collection).toHaveBeenCalledWith(Collections.REPOSITORIES);
      expect(mockRepoCollection2.findOneAndUpdate).toHaveBeenCalled();
      expect(result).toBe(group._id.toString());
    });

    it('should return null if an error occurs', async () => {
      mockRepoCollection2.findOneAndUpdate.mockRejectedValue(new Error('Database error'));

      const result = await createStoryGroup(repoId, group.name, group.member_stories, group.isSequential, false);

      expect(result).toBeNull();
    });
  });

  describe('updateStoryGroup', () => {
    it('should update a story group', async () => {
      mockRepoCollection2.findOne.mockResolvedValue({ groups: [group] });
      mockRepoCollection2.updateOne.mockResolvedValue({});

      const result = await updateStoryGroup(repoId, groupId, group);

      expect(mockDb2.collection).toHaveBeenCalledWith(Collections.REPOSITORIES);
      expect(mockRepoCollection2.findOne).toHaveBeenCalledWith({ _id: new mongoId.ObjectId(repoId) });
      expect(mockRepoCollection2.updateOne).toHaveBeenCalled();
      expect(result).toEqual(group);
    });

    it('should return null if an error occurs', async () => {
      mockRepoCollection2.findOne.mockRejectedValue(new Error('Database error'));

      const result = await updateStoryGroup(repoId, groupId, group);

      expect(result).toBeNull();
    });
  });

  describe('updateStoryGroupsArray', () => {
    it('should update the story groups array', async () => {
      mockRepoCollection2.findOneAndUpdate.mockResolvedValue({});

      await updateStoryGroupsArray(repoId, [group]);

      expect(mockDb2.collection).toHaveBeenCalledWith(Collections.REPOSITORIES);
      expect(mockRepoCollection2.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: new mongoId.ObjectId(repoId) },
        { $set: { groups: [group] } },
        { projection: { groups: 1 } }
      );
    });

    it('should log an error if an error occurs', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockRepoCollection2.findOneAndUpdate.mockRejectedValue(new Error('Database error'));

      await updateStoryGroupsArray(repoId, [group]);

      expect(consoleErrorSpy).toHaveBeenCalledWith('ERROR in updateStoryGroupsArray: Error: Database error');
      consoleErrorSpy.mockRestore();
    });
  });

  describe('deleteStoryGroup', () => {
    it('should delete a story group', async () => {
      mockRepoCollection2.findOne.mockResolvedValue({ groups: [group] });
      mockRepoCollection2.updateOne.mockResolvedValue({});

      await deleteStoryGroup(repoId, groupId);

      expect(mockDb2.collection).toHaveBeenCalledWith(Collections.REPOSITORIES);
      expect(mockRepoCollection2.findOne).toHaveBeenCalledWith({ _id: new mongoId.ObjectId(repoId) });
      expect(mockRepoCollection2.updateOne).toHaveBeenCalled();
    });

    it('should log an error if an error occurs', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockRepoCollection2.findOne.mockRejectedValue(new Error('Database error'));

      await deleteStoryGroup(repoId, groupId);

      expect(consoleErrorSpy).toHaveBeenCalledWith('ERROR in deleteStoryGroup: Error: Database error');
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getAllStoryGroups', () => {
    it('should get all story groups', async () => {
      mockRepoCollection2.findOne.mockResolvedValue({ groups: [group] });

      const result = await getAllStoryGroups(repoId);

      expect(mockDb2.collection).toHaveBeenCalledWith(Collections.REPOSITORIES);
      expect(mockRepoCollection2.findOne).toHaveBeenCalledWith(
        { _id: new mongoId.ObjectId(repoId) },
        { projection: { groups: 1 } }
      );
      expect(result).toEqual([group]);
    });

    it('should return an empty array if an error occurs', async () => {
      mockRepoCollection2.findOne.mockRejectedValue(new Error('Database error'));

      const result = await getAllStoryGroups(repoId);

      expect(result).toEqual([]);
    });
  });

  describe('getOneStoryGroup', () => {
    it('should get a story group by ID', async () => {
      mockRepoCollection2.findOne.mockResolvedValue({ groups: [group] });

      const result = await getOneStoryGroup(repoId, groupId);

      expect(mockDb2.collection).toHaveBeenCalledWith(Collections.REPOSITORIES);
      expect(mockRepoCollection2.findOne).toHaveBeenCalledWith(
        { _id: new mongoId.ObjectId(repoId) },
        { projection: { groups: 1 } }
      );
      expect(result).toEqual(group);
    });

    it('should return null if the group is not found', async () => {
      mockRepoCollection2.findOne.mockResolvedValue({ groups: [] });

      const result = await getOneStoryGroup(repoId, groupId);

      expect(result).toBeNull();
    });

    it('should return null if an error occurs', async () => {
      mockRepoCollection2.findOne.mockRejectedValue(new Error('Database error'));

      const result = await getOneStoryGroup(repoId, groupId);

      expect(result).toBeNull();
    });
  });

  describe('addToStoryGroup', () => {
    it('should add a story to a group', async () => {
      mockRepoCollection2.findOne.mockResolvedValue({ groups: [group] });
      mockRepoCollection2.updateOne.mockResolvedValue({});

      const result = await addToStoryGroup(repoId, groupId, storyId);

      expect(mockDb2.collection).toHaveBeenCalledWith(Collections.REPOSITORIES);
      expect(mockRepoCollection2.findOne).toHaveBeenCalledWith(
        { _id: new mongoId.ObjectId(repoId) },
        { projection: { groups: 1 } }
      );
      expect(mockRepoCollection2.updateOne).toHaveBeenCalled();
      expect(result).toEqual(group);
    });

    it('should return null if the group is not found', async () => {
      mockRepoCollection2.findOne.mockResolvedValue({ groups: [] });

      const result = await addToStoryGroup(repoId, groupId, storyId);

      expect(result).toBeNull();
    });

    it('should return null if an error occurs', async () => {
      mockRepoCollection2.findOne.mockRejectedValue(new Error('Database error'));

      const result = await addToStoryGroup(repoId, groupId, storyId);

      expect(result).toBeNull();
    });
  });

  describe('removeFromStoryGroup', () => {
    it('should remove a story from a group', async () => {
      mockRepoCollection2.findOne.mockResolvedValue({ groups: [group] });
      mockRepoCollection2.updateOne.mockResolvedValue({});

      const result = await removeFromStoryGroup(repoId, groupId, storyId);

      expect(mockDb2.collection).toHaveBeenCalledWith(Collections.REPOSITORIES);
      expect(mockRepoCollection2.findOne).toHaveBeenCalledWith(
        { _id: new mongoId.ObjectId(repoId) },
        { projection: { groups: 1 } }
      );
      expect(mockRepoCollection2.updateOne).toHaveBeenCalled();
      expect(result).toEqual(group);
    });

    it('should return null if the group is not found', async () => {
      mockRepoCollection2.findOne.mockResolvedValue({ groups: [] });

      const result = await removeFromStoryGroup(repoId, groupId, storyId);

      expect(result).toBeNull();
    });

    it('should return null if an error occurs', async () => {
      mockRepoCollection2.findOne.mockRejectedValue(new Error('Database error'));

      const result = await removeFromStoryGroup(repoId, groupId, storyId);

      expect(result).toBeNull();
    });
  });
});

