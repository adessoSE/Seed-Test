const mongo = require('../../src/database/DbServices');
import { jiraDecryptPassword } from './userManagement';
const emptyScenario = require('../../src/models/emptyScenario');
const emptyBackground = require('../../src/models/emptyBackground');
import { writeFile } from '../../src/serverHelper';
import { XMLHttpRequest } from 'xmlhttprequest';
const fs = require('fs');
const path = require('path');

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
    let { Host, AccountName, Password, Password_Nonce, Password_Tag , AuthMethod} = jiraUser;
    const jiraClearPassword = jiraDecryptPassword(Password, Password_Nonce, Password_Tag);
    const repos = await requestJiraRepos(Host, AccountName, jiraClearPassword, AuthMethod);
    return await storeJiraRepos(repos)
}

/**
 * Makes the Request to fetch jira repos
 * @param host 
 * @param username 
 * @param jiraClearPassword 
 * @returns 
 */
async function requestJiraRepos(host: string, username: string, jiraClearPassword: string, authMethod: string) {
	let authString: string = `Bearer ${jiraClearPassword}`
	if(authMethod === 'basic'){ 
		const auth = Buffer.from(`${username}:${jiraClearPassword}`).toString('base64');
		authString = `Basic ${auth}`
	}
	console.log('auth ', authString);
    const reqoptions = {
        method: 'GET',
        qs: {
            type: 'page',
            title: 'title'
        },
        headers: {
            'cache-control': 'no-cache',
			'Authorization': authString
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
                jiraRepo = await mongo.createJiraRepo(projectName);
            } else {
                jiraRepo = jiraReposFromDb.find((element) => element.repoName === projectName);
            }
            repos.push({ name: projectName, _id: jiraRepo._id });
        }
        return repos.map<{_id:string, value:string, source:string}>
        ((value) => ({
            _id: value._id,
            value: value.name,
            source
        }));
    } else return [];
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
			//if (request.status == 401) resolve([]);
			//if (request.status == 403) resolve([]);
			if (request.status !== 200) { reject(request.status); return; }
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
	const result = await mongo.getOneStory(parseInt(story.story_id, 10));
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

	const finalStory = await mongo.upsertEntry(story.story_id, story);
	story._id = finalStory._id;
	// Create & Update Feature Files
	writeFile(story);
	return story;
}

async function exportProject(repo_id, versionID) {
	try {
		const repo = await mongo.getOneRepositoryById(repo_id).json();  //Neu definiert womöglich auch nur OneRepository nutzbar, dafür aber ownerID + repoName mitzugeben
		if (!repo || !repo.stories) {
			return null;
		}
		//Collect stories for export
		let exportStories = []
		let keyStoryIds = []	//falls doch nicht gebraucht: entfernen!
		for (let index = 0; index < repo.stories.length; index++) {
			let story = await mongo.getOneStory(repo.stories[index]).json();
			if (!story) {
				throw new Error(`Story ${repo.stories[index]} not found`);
			}
			keyStoryIds.push(story._id.toString())
			delete story._id;
			//story.story_id = index; Das ist die Git/Jira Story ID - womöglich nicht entfernen
			exportStories.push(story);
		}

		//Collect blocks for export
		let repoBlocks = await mongo.getBlocks(repo_id).json();
		
		//Falls sich die getBlocks Blöcke wider Erwarten von den customBlocks in dem repo unterscheiden, müssen wir ggf. anders loopen und zwischenabfragen
		for (let index = 0; index < repoBlocks.length; index++) {
			delete repoBlocks[index]._id;
		}

		//Collect & adjust groups for export
		let repoGroups = [...repo.groups];
		for (let index = 0; index < repoGroups.length; index++) {
			delete repoGroups[index]._id;
			//change memberStories references to indices
			for (let sub_index = 0; sub_index < repoGroups[index].member_stories.length; sub_index++) {
				repoGroups[index].member_stories[sub_index] = keyStoryIds.indexOf(repoGroups[index].member_stories[sub_index])
			}
		}
		
		console.log(repo);
		console.log(exportStories);
		console.log(repoBlocks);
		console.log(repoGroups);


		// Create separate folders for stories and groups
        const storiesFolder = 'stories_data';
        fs.mkdirSync(storiesFolder, { recursive: true });
        for (let index = 0; index < exportStories.length; index++) {
            fs.writeFileSync(path.join(storiesFolder, `story_${index}.json`), JSON.stringify(exportStories[index]));
        }

        const groupsFolder = 'groups_data';
        fs.mkdirSync(groupsFolder, { recursive: true });
        for (let index = 0; index < repoGroups.length; index++) {
            fs.writeFileSync(path.join(groupsFolder, `group_${index}.json`), JSON.stringify(repoGroups[index]));
        }

        // Write the rest of the data as individual JSON files
        fs.writeFileSync('repo.json', JSON.stringify(repo));
        fs.writeFileSync('repoBlocks.json', JSON.stringify(repoBlocks));
        fs.writeFileSync('keyStoryIds.json', JSON.stringify(keyStoryIds));


		return {
			storiesFolder,
            groupsFolder,
            repoFilePath: 'repo.json',
            repoBlocksFilePath: 'repoBlocks.json',
            keyStoryIdsFilePath: 'keyStoryIds.json'
		  };



	} catch (error) {
		console.error('Error exporting project: ', error.message);
		throw error;
	}
}



module.exports = {
	getJiraRepos,
	dbProjects,
	uniqueRepositories,
	starredRepositories,
	ownRepositories,
	fuseStoryWithDb,
	exportProject
};
