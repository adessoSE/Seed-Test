const { getGitHubStories, getJiraStories } = require('../../dist/helpers/ticketManagement');
const db = require('../../src/database/DbServices');
const projectMng = require('../../dist/helpers/projectManagement');
const xray = require('../../dist/helpers/xray');
const userMngmt = require('../../dist/helpers/userManagement');

jest.mock('../../src/database/DbServices');
jest.mock('./projectManagement');
jest.mock('./xray');
jest.mock('../../dist/helpers/userManagement');

describe('ticketManagement', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getGitHubStories', () => {
    it('should fetch GitHub stories and update the database', async () => {
      const githubName = 'testUser';
      const githubRepo = 'testRepo';
      const token = 'testToken';
      const repoName = 'testRepoName';
      const mockResponse = [
        {
          id: 1,
          title: 'Story 1',
          body: 'Description 1',
          state: 'open',
          number: 1,
          assignee: { login: 'assignee1', avatar_url: 'url1' },
        },
      ];
      const mockRepo = { _id: '507f1f77bcf86cd799439011', stories: [] };

      global.fetch = jest.fn().mockResolvedValue(
        {
            status: 200,
            json: jest.fn().mockResolvedValue(mockResponse),
          } );
        
      db.getOneGitRepository.mockResolvedValue(mockRepo);
      projectMng.fuseStoryWithDb = jest.fn().mockResolvedValue({ _id: '507f1f77bcf86cd799439012' });
      db.updateStoriesArrayInRepo.mockResolvedValue();

      await getGitHubStories(githubName, githubRepo, token, repoName);

      expect(fetch).toHaveBeenCalledWith(
        `https://api.github.com/repos/${githubName}/${githubRepo}/issues?labels=story`,
        { headers: { Authorization: `token ${token}` } }
      );
      expect(db.getOneGitRepository).toHaveBeenCalledWith(repoName);
      expect(projectMng.fuseStoryWithDb).toHaveBeenCalledWith(expect.objectContaining({ story_id: 1 }));
      // TODO: Check if updateStoriesArrayInRepo is functional?
      // expect(db.updateStoriesArrayInRepo).toHaveBeenCalledWith(mockRepo._id, ['507f1f77bcf86cd799439012']);
    });

    it('should throw an error if GitHub returns 401', async () => {
      const githubName = 'testUser';
      const githubRepo = 'testRepo';
      const token = 'testToken';
      const repoName = 'testRepoName';

      global.fetch = jest.fn().mockResolvedValue({ status: 401 });

      await expect(getGitHubStories(githubName, githubRepo, token, repoName)).rejects.toThrow('GitHub Status 401');
    });
  });

  describe('getJiraStories', () => {
    it('should fetch Jira stories and update the database', async () => {
      const jiraUser = { Host: 'testHost', Password: 'testPass', Password_Nonce: Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
        Password_Tag: 'tag', AccountName: 'testAccount', AuthMethod: 'basic' };
      const projectKey = 'TEST';
      const projectId = '507f1f77bcf86cd799439011';
      const mockJiraResponse = {
        issues: [
          {
            id: '1',
            key: 'TEST-1',
            fields: {
              summary: 'Story 1',
              description: 'Description 1',
              status: { name: 'Open' },
              issuetype: { name: 'Test' },
              assignee: { name: 'assignee1', avatarUrls: { '32x32': 'url1' } },
            },
          },
        ],
      };
      const mockProject = { _id: '507f1f77bcf86cd799439011', stories: [] };

      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: jest.fn().mockResolvedValue(mockJiraResponse),

      });
      db.getOneJiraRepository.mockResolvedValue(mockProject);
      xray.handleTestIssue  = jest.fn().mockResolvedValue({ scenarioList: [], testStepDescription: '' });
      projectMng.fuseStoryWithDb = jest.fn().mockResolvedValue({ _id: '507f1f77bcf86cd799439012' });
      projectMng.updateTestSets = jest.fn().mockResolvedValue("OK")
      db.updateStoriesArrayInRepo = jest.fn().mockResolvedValue("OK");
      userMngmt.jiraDecryptPassword = jest.fn().mockReturnValue('testPass');

      await getJiraStories(jiraUser, projectKey, projectId);

      expect(fetch).toHaveBeenCalledWith(
        `https://${jiraUser.Host}/rest/api/2/search?jql=project="${projectKey}"+AND+(labels=Seed-Test+OR+issuetype=Test+OR+issuetype="Test Set"+OR+issuetype="Pre-Condition")&startAt=0&maxResults=200`,
        expect.any(Object)
      );
      expect(db.getOneJiraRepository).toHaveBeenCalledWith(projectKey);
      expect(xray.handleTestIssue).toHaveBeenCalledWith(expect.objectContaining({ key: 'TEST-1' }), expect.any(Object), jiraUser.Host);
      expect(projectMng.fuseStoryWithDb).toHaveBeenCalledWith(expect.objectContaining({ story_id: '1' }));
      expect(db.updateStoriesArrayInRepo).toHaveBeenCalledWith(mockProject._id, ['507f1f77bcf86cd799439012']);
    });

    it('should handle errors during Jira fetch', async () => {
      const jiraUser = { Host: 'testHost', Password: 'testPass', Password_Nonce: 'nonce', Password_Tag: 'tag', AccountName: 'testAccount', AuthMethod: 'basic' };
      const projectKey = 'TEST';
      const projectId = '507f1f77bcf86cd799439011';

      jest.spyOn(global, "fetch").mockRejectedValue(new Error('Fetch error'));
      jest.spyOn(console, 'error').mockImplementation(() => {});

      await getJiraStories(jiraUser, projectKey, projectId);

      expect(console.error).toHaveBeenCalledWith("Error while fetching Jira issues:", expect.any(Error));
    });
  });
  describe('fetchJiraIssues', () => {
    it('should handle errors during Jira fetch', async () => {
      const jiraUser = { Host: 'testHost', Password: 'testPass', Password_Nonce: 'nonce', Password_Tag: 'tag', AccountName: 'testAccount', AuthMethod: 'basic' };
      const projectKey = 'TEST';
      const projectId = '507f1f77bcf86cd799439011';

      jest.spyOn(global, "fetch").mockRejectedValue(new Error('Fetch error'));
      jest.spyOn(console, 'error').mockImplementation(() => {});

      await getJiraStories(jiraUser, projectKey, projectId);

      expect(console.error).toHaveBeenCalledWith("Error while fetching Jira issues:", expect.any(Error));
    });
  });
});
