const mongo = require('../../src/database/DbServices');
import { jiraDecryptPassword } from './userManagement';
const emptyScenario = require('../../src/models/emptyScenario');
const emptyBackground = require('../../src/models/emptyBackground');
import { writeFile } from '../../src/serverHelper';
import { XMLHttpRequest } from 'xmlhttprequest';

enum Sources {
    GITHUB = "github",
    JIRA = "jira",
    DB = "db"
}

class Group {
    _id: string
    name: string
    member_stories: Array<string>
    isSequential: boolean
}

class Repository {
    _id: string
    owner: string
    gitOwner: string
    stories: Array<string>
    repoType: Enumerator<Sources>
    customBlocks: Array<string>
    groups: Array<Group>
}

/**
 * get repo names from jira
 * @param jiraUser only jira part of user
 * @returns 
 */
async function getJiraRepos(jiraUser: any) {
    if(!jiraUser)return []
    let { Host, AccountName, Password, Password_Nonce, Password_Tag } = jiraUser;
    const jiraClearPassword = jiraDecryptPassword(Password, Password_Nonce, Password_Tag);
    const repos = await requestJiraRepos(Host, AccountName, jiraClearPassword);
    return await storeJiraRepos(repos)
}

/**
 * Makes the Request to fetch jira repos
 * @param host 
 * @param username 
 * @param jiraClearPassword 
 * @returns 
 */
async function requestJiraRepos(host: string, username: string, jiraClearPassword: string) {
    const auth = Buffer.from(`${username}:${jiraClearPassword}`).toString('base64');
    const reqoptions = {
        method: 'GET',
        qs: {
            type: 'page',
            title: 'title'
        },
        headers: {
            'cache-control': 'no-cache',
            Authorization: `Basic ${auth}`
        }
    };
    // use GET /rest/api/2/project instead of GET /rest/api/2/issue/createmeta
    // https://docs.atlassian.com/software/jira/docs/api/REST/7.6.1/#api/2/project-getAllProjects
    return await fetch(`http://${host}/rest/api/2/project`, reqoptions)
    .then((response) => response.json())
    .then(async (json) => {
        const projects = [];
        for (const project of json) {
            projects.push(project["name"])
        }
        return projects
    }).catch((error) => { console.error(error); return [] })
}

/**
 * store and  cumulate jira repos
 * @param projects 
 * @returns 
 */
async function storeJiraRepos(projects:Array<any>){
    const source = Sources.JIRA
    let repos = [];
    let jiraRepo;
    const jiraReposFromDb = await mongo.getAllSourceReposFromDb(source);
    if (projects.length !== 0) {
        for (const projectName of projects) {
            if (!jiraReposFromDb.some((entry) => entry.repoName === projectName)) {
                jiraRepo = await mongo.createJiraRepo(projectName.name);
            } else {
                jiraRepo = jiraReposFromDb.find((element) => element.repoName === projectName);
            }
            repos.push({ name: projectName, _id: jiraRepo._id });
        }
        return repos.map<{_id:string, value:string, source:string}>
        ((value) => ({
            _id: value._id.to,
            value: value.name,
            source
        }));
    }
}
function dbProjects(userId: string) {
	return new Promise((resolve) => {
		if (typeof userId === undefined || userId === '') resolve([]);
		mongo.getRepository(userId).then((json) => {
			const projects = [];
			if (Object.keys(json).length === 0) resolve([]);
			for (const repo of json) if (repo.repoType === 'db') {
				const proj = {
					_id: repo._id,
					value: repo.repoName,
					source: repo.repoType,
					canEdit: repo.canEdit
				};
				projects.push(proj);
			}
			resolve(projects);
		});
	});
}

function uniqueRepositories(repositories) {
	const uniqueIds = [];
	const unique = [];
	for (const i in repositories) {
		if (uniqueIds.indexOf(repositories[i]._id.toString()) <= -1) {
			uniqueIds.push(repositories[i]._id.toString());
			unique.push(repositories[i]);
		}
	}
	return unique;
}

function execRepositoryRequests(link, user, password, ownerId, githubId) {
	return new Promise((resolve, reject) => {
		const request = new XMLHttpRequest(); // use fetch
		// get Issues from GitHub
		request.open('GET', link, true, user, password);
		request.send();
		request.onreadystatechange = async () => {
			if (request.readyState !== 4) return;
			if (request.status !== 200) { reject(this.status); return; }
			const data = JSON.parse(request.responseText);
			const projects = [];
			const gitReposFromDb = await mongo.getAllSourceReposFromDb('github');
			let mongoRepo;
			for (const repo of data) {
				// if this Repository is not in the DB create one in DB
				if (!gitReposFromDb.some((entry) => entry.repoName === repo.full_name)) {
					mongoRepo = await mongo.createGitRepo(repo.owner.id, repo.full_name, githubId, ownerId);
				} else {
					mongoRepo = gitReposFromDb.find((element) => element.repoName === repo.full_name); // await mongo.getOneGitRepository(repo.full_name)
					if (mongoRepo.gitOwner === githubId) mongo.updateOwnerInRepo(mongoRepo._id, ownerId, mongoRepo.owner);
				}
				const repoName = repo.full_name;
				const proj = {
					_id: mongoRepo._id,
					value: repoName,
					source: 'github'
				};
				projects.push(proj);
			}
			resolve(projects);
		};
	});
}

function ownRepositories(ownerId, githubId, githubName, token) {
	if (!githubName && !token) return Promise.resolve([]);
	return execRepositoryRequests('https://api.github.com/user/repos?per_page=100', githubName, token, ownerId, githubId);
}

function starredRepositories(ownerId, githubId, githubName, token) {
	if (!githubName && !token) return Promise.resolve([]);
	return execRepositoryRequests(`https://api.github.com/users/${githubName}/starred`, githubName, token, ownerId, githubId);
}

async function fuseStoryWithDb(story) {
	const result = await mongo.getOneStory(parseInt(story.story_id, 10), story.storySource);
	if (result !== null) {
		story.scenarios = result.scenarios;
		story.background = result.background;
		story.lastTestPassed = result.lastTestPassed;
	} else {
		story.scenarios = [emptyScenario()];
		story.background = emptyBackground();
	}
	story.story_id = parseInt(story.story_id, 10);
	if (story.storySource !== 'jira') story.issue_number = parseInt(story.issue_number, 10);

	const finalStory = await mongo.upsertEntry(story.story_id, story, story.storySource);
	story._id = finalStory._id;
	// Create & Update Feature Files
	writeFile(story);
	return story;
}

module.exports = {
    getJiraRepos,
    dbProjects,
	uniqueRepositories,
	starredRepositories,
	ownRepositories,
	fuseStoryWithDb
};