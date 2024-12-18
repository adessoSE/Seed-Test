import { GitHubProject, JiraProject, Sources } from "../models/project";
import projectMng from "./projectManagement";
import * as xray from "./xray";
import { jiraDecryptPassword } from "./userManagement";
import db from "../../src/database/DbServices";

/**
 * Fetches stories from GitHub and updates the database.
 * @param {string} githubName - The GitHub username.
 * @param {string} githubRepo - The GitHub repository name.
 * @param {string} token - The GitHub authentication token.
 * @param {string} repoName - The repository name in the database.
 * @returns {Promise<void>} - A promise that resolves when the operation is complete.
 */
export async function getGitHubStories(
  githubName: string,
  githubRepo: string,
  token: string,
  repoName: string
): Promise<any> {
  const githubRepoUrl = `${githubName}/${githubRepo}`;
  const tmpStories = new Map<string, any>();
  const tmpStoryIds: Array<string> = [];

  let gitHubProject: GitHubProject;
  const headers = {
    Authorization: `token ${token}`,
  };

  // Fetch issues from GitHub with the label "story"
  const response = await fetch(
    `https://api.github.com/repos/${githubRepoUrl}/issues?labels=story`,
    { headers }
  );

  if (response.status === 401) throw new Error("GitHub Status 401");

  if (response.status === 200) {
    gitHubProject = await db.getOneGitRepository(repoName);
    const githubJsonBody = await response.json();

    for (const issue of githubJsonBody) {
      const story = {
        story_id: issue.id,
        title: issue.title,
        body: issue.body,
        state: issue.state,
        issue_number: issue.number,
        storySource: Sources.GITHUB,
        assignee: issue.assignee ? issue.assignee.login : "unassigned",
        assignee_avatar_url: issue.assignee ? issue.assignee.avatar_url : null,
      };

      const fusedStory = await projectMng.fuseStoryWithDb(story);
	  // [key: ObjectId as String, value: Story from DB]
      tmpStories.set(fusedStory._id.toString(), fusedStory);
      tmpStoryIds.push(fusedStory._id);
    }

    return Promise.all(tmpStoryIds)
      .then((storyIdList) => {
        return matchOrder(storyIdList, tmpStories, gitHubProject);
      })
      .catch((error) => {
        console.error(error);
      });
  }
}

/**
 * Matches the order of stories based on the repository's existing order.
 * @param {Array<string>} storyIdList - The list of story IDs.
 * @param {Map<string, any>} storyMap - The map of story IDs to story objects.
 * @param {any} repo - The repository object.
 * @returns {Array<any>} - The ordered list of stories.
 */
function matchOrder(
  storyIdList: Array<string>,
  storyMap: Map<string, any>,
  repo: any
): Array<any> {
  // Create a set of unique story IDs from the combined list of new and existing stories
  const newStoryIds = new Set(
    storyIdList.concat(repo.stories).map((id) => id.toString())
  );

  // Remove existing story IDs from the set to get only the new story IDs
  for (const id of repo.stories) {
    newStoryIds.delete(id.toString());
  }

  // Combine the existing story IDs with the new story IDs
  const combinedStoryList = repo.stories.concat([...newStoryIds]);

  // Update the repository with the new order of stories
  if (repo) {
    db.updateStoriesArrayInRepo(repo._id, combinedStoryList);
  }

  // Map the combined story IDs to their corresponding story objects and filter out undefined values
  return combinedStoryList
    .map((id) => storyMap.get(id.toString()))
    .filter((story) => story !== undefined);
}

/**
 * Fetches Issues from Jira, fuses them with the database and returns them in order.
 * @param {any} jiraUser - The Jira user object.
 * @param {string} projectKey - The Jira project key.
 * @param {string} projectId - The project ID.
 * @returns {Promise<any>} - A promise that resolves when the operation is complete.
 */
export async function getJiraStories(
  jiraUser: any,
  projectKey: string,
  projectId: string
): Promise<any> {
  let jiraProject: JiraProject = await db.getOneJiraRepository(projectKey);

  const options = await getJiraOptions(jiraUser);
  const {Host} = jiraUser;
  const jiraResponseBody = await fetchJiraIssues(options, Host, projectKey);

  const testSets: Array<any> = [];
  const preConditions: Array<any> = [];

  try {
    const asyncHandleTestIssue = jiraResponseBody.issues.map(async (issue: any) => {
      switch (issue.fields.issuetype.name) {
        case "Test Set":
          testSets.push({
            testSetKey: issue.key,
            testSetId: issue.id,
            tests: issue.fields.customfield_14233 || [],
            xrayTestSet: true,
          });
          return null;

        case "Pre-Condition":
          const preCondition = {
            preConditionKey: issue.key,
            preConditionName: issue.fields.summary,
            testSet: [],
          };
          for (const link of issue.fields.issuelinks) {
            if (link.inwardIssue && link.type.inward === "tested by") {
              preCondition.testSet.push(link.inwardIssue.key);
            }
          }
          preConditions.push(preCondition);
          return null;

        case "Test":
          return xray.handleTestIssue(issue, options, Host);

        default:
          return { scenarioList: [], testStepDescription: "" };
      }
    });

    const lstDesc = await Promise.all(asyncHandleTestIssue);

    const stories: Array<any> = [];

    for (const [index, issue] of jiraResponseBody.issues.entries()) {
      if (!lstDesc[index]) continue;

      let preConditionList: Array<string> = [];
      if (issue.fields.customfield_14229) {
        preConditionList = issue.fields.customfield_14229;
      }

      const finalPreConditions = preConditions.filter((preCondition) =>
        preConditionList.includes(preCondition.preConditionKey)
      );

      const { scenarioList, testStepDescription } = lstDesc[index];
      const issueDescription = issue.fields.description ? issue.fields.description : "";

      const story = {
        story_id: issue.id,
        title: issue.fields.summary,
        body: issueDescription + testStepDescription,
        scenarios: scenarioList,
        state: issue.fields.status.name,
        issue_number: issue.key,
        storySource: Sources.JIRA,
        host: Host,
        preConditions: finalPreConditions,
        assignee: issue.fields.assignee
          ? issue.fields.assignee.name
          : "unassigned",
        assignee_avatar_url: issue.fields.assignee
          ? issue.fields.assignee.avatarUrls["32x32"]
          : null,
      };

      stories.push(story);
    }

    // update Test Sets - Xray
    projectMng.updateTestSets(testSets, projectId);
    
    const storyIds: Array<string> = [];
    const tmpStoryMap = new Map<string, any>();

    // fuse Jira Issues with stories with db
    await Promise.all(stories.map((story) => projectMng.fuseStoryWithDb(story)))
      .then((fusedStories) => {
        fusedStories.forEach((fusedStory) => {
          tmpStoryMap.set(fusedStory._id.toString(), fusedStory);
          storyIds.push(fusedStory._id);
        });
      });

    // order Jira Issue based on the repository's existing story order
    return Promise.all(storyIds)
      .then((storiesIdList) => {
        // return jira Issues as Stories in Order
        return matchOrder(storiesIdList, tmpStoryMap, jiraProject);
      })
      .catch((error) => {
        console.error('Error while matching order in Jira issues', error);
      });
	} catch (e) {
		console.error("Error while getting Jira issues:", e);
	}
}

/**
 * Fetches issues from Jira.
 * @param {any} options - The request options.
 * @param {string} host - The Jira host.
 * @param {string} projectKey - The Jira project key.
 * @returns {Promise<any>} - The Jira response body.
 */
async function fetchJiraIssues(options: any, host: string, projectKey: string): Promise<any> {
  const url = `https://${host}/rest/api/2/search?jql=project="${projectKey}"+AND+(labels=Seed-Test+OR+issuetype=Test+OR+issuetype="Test Set"+OR+issuetype="Pre-Condition")&startAt=0&maxResults=200`;

  try {
    const response = await fetch(url, options);
    return response.json();
  } catch (error) {
    console.error("Error while fetching Jira issues:", error);
  }
}

/**
 * Generates the request options for Jira.
 * @param {any} jiraUser - The Jira user object.
 * @returns {Promise<any>} - The request options.
 */
async function getJiraOptions(jiraUser: any): Promise<any> {
  const { Password, Password_Nonce, Password_Tag } = jiraUser;
  const clearPass = jiraDecryptPassword(Password, Password_Nonce, Password_Tag);
  const { AccountName, AuthMethod } = jiraUser;

  let authString = `Bearer ${clearPass}`;
  if (AuthMethod === "basic") {
    const auth = Buffer.from(`${AccountName}:${clearPass}`).toString("base64");
    authString = `Basic ${auth}`;
  }

  return {
    method: "GET",
    headers: {
      "cache-control": "no-cache",
      Authorization: authString,
    },
  };
}

module.exports = {
  getGitHubStories,
  getJiraStories,
};
