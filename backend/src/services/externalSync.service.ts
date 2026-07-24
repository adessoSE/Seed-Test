import { ObjectId } from 'mongodb';

import { jiraDecryptPassword, buildAuthString, checkValidGithubFormat } from './externalAccount.service';
import * as repositoryService from './repository.service';
import * as storyService from './story.service';
import * as featureFileService from './feature-file.service';
import * as xrayService from './xray.service';

import { emptyScenario } from '../models/emptyScenario';
import { emptyBackground } from '../models/emptyBackground';
import { Story } from '@shared/models/Story';
import { Scenario } from '@shared/models/Scenario';
import { StepType } from '@shared/models/StepType';
import { StepDefinition } from '@shared/models/StepDefinition';
import { User } from '@shared/models/User';
import { oid } from '../types/mongo.types';


enum Sources {
	GITHUB = 'github',
	JIRA = 'jira',
	DB = 'db'
}

//### JIRA REPO SYNC ###

/**
 * Gets repository names from Jira for the given user credentials.
 * @param jiraUser User's Jira credentials object.
 * @returns Array of repository objects { _id, repoName, source }.
 */
export async function getJiraRepos(jiraUser: any): Promise<{ _id: string; repoName: string; source: string }[]> {
	if (!jiraUser) return [];
	const {
		Host,
		AccountName,
		Password,
		Password_Nonce,
		Password_Tag,
		AuthMethod
	} = jiraUser;
	const jiraClearPassword = jiraDecryptPassword(
		Password,
		Password_Nonce,
		Password_Tag
	);
	const repoNames = await requestJiraRepos(
		Host,
		AccountName,
		jiraClearPassword,
		AuthMethod
	);
	return await storeJiraRepos(repoNames);
}

/**
 * Makes the request to fetch Jira repository names.
 * @param host Jira host URL.
 * @param username Jira username.
 * @param jiraClearPassword Decrypted password or token.
 * @param authMethod Authentication method ('basic' or 'bearer').
 * @returns Array of repository names.
 */
async function requestJiraRepos(host: string, username: string, jiraClearPassword: string, authMethod: string): Promise<string[]> {
	let authString: string = `Bearer ${jiraClearPassword}`;
	if (authMethod === 'basic'){ 
		const auth = Buffer.from(`${username}:${jiraClearPassword}`).toString('base64');
		authString = `Basic ${auth}`;
	}
	
	const reqOptions: RequestInit = {
		method: 'GET',
		headers: {
			'cache-control': 'no-cache',
			'Authorization': authString
		}
	};
	const url = `https://${host}/rest/api/2/project`;
	// use GET /rest/api/2/project instead of GET /rest/api/2/issue/createmeta
	// https://docs.atlassian.com/software/jira/docs/api/REST/7.6.1/#api/2/project-getAllProjects
	try {
		const response = await fetch(url, reqOptions);
		if (!response.ok) 
			throw new Error(`Jira API request failed: ${response.status}`);
        
		const jiraProjects = await response.json();
		return jiraProjects.map((project: any) => project.name);
	} catch (error: any) {
		console.error('Error fetching Jira projects:', error.stack || error); 
		return [];
	}
}

/**
 * Ensures Jira repositories exist in the DB and returns their info.
 * @param projectNames Array of Jira project names.
 * @returns Array of repository objects { _id, repoName, source }.
 */
async function storeJiraRepos(projectNames: string[]): Promise<{ _id: string; repoName: string; source: string }[]> {
	const source = Sources.JIRA;
	const repos = [];
  
	if (projectNames.length === 0) return [];

	const jiraReposFromDb = await repositoryService.getAllSourceReposFromDb(source); 
  
	for (const projectName of projectNames) {
		let jiraRepo: any = jiraReposFromDb.find(
			(element: any) => element.repoName === projectName
		);

		if (!jiraRepo) {
			const insertResult = await repositoryService.createJiraRepo(projectName); 
			jiraRepo = { _id: insertResult.insertedId || insertResult._id, repoName: projectName }; 
		}
		repos.push({ name: projectName, _id: jiraRepo._id });
	}
  
	return repos.map((value) => ({
		_id: value._id.toString(),
		repoName: value.name,
		source
	})
	);
}

//### GITHUB REPO SYNC ###

/**
 * Fetches repositories owned by the GitHub user.
 * @param ownerId Seed-Test User ID.
 * @param githubId GitHub User ID.
 * @param githubName GitHub username.
 * @param token GitHub token.
 * @returns Array of repository objects { _id, value, source }.
 */
export function ownRepositories(ownerId: string, githubId: number, githubName: string, token: string): Promise<any[]> {
	if (!githubName || !token) return Promise.resolve([]);
	return execRepositoryRequests(
		'https://api.github.com/user/repos?per_page=100',
		githubName,
		token,
		ownerId,
		githubId
	);
}

/**
 * Fetches repositories starred by the GitHub user.
 * @param ownerId Seed-Test User ID.
 * @param githubId GitHub User ID.
 * @param githubName GitHub username.
 * @param token GitHub token.
 * @returns Array of repository objects { _id, value, source }.
 */
export function starredRepositories(ownerId: string, githubId: number, githubName: string, token: string): Promise<any[]> {
	if (!githubName || !token) return Promise.resolve([]);
	return execRepositoryRequests(
		`https://api.github.com/users/${githubName}/starred`,
		githubName,
		token,
		ownerId,
		githubId
	);
}

/**
 * Executes requests to fetch GitHub repositories (owned or starred).
 * Ensures repositories exist in the DB.
 * @param link GitHub API URL.
 * @param user GitHub username.
 * @param password GitHub token.
 * @param ownerId Seed-Test User ID.
 * @param githubId GitHub User ID.
 * @returns Array of repository objects { _id, value, source }.
 */
async function execRepositoryRequests(link: string, user: string, password: string, ownerId: string, githubId: number): Promise<any[]> {
	try {
		const reqOptions: RequestInit = {headers: {'Authorization': 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64')}};
		const response = await fetch(link, reqOptions);

		if (response.status === 401) throw new Error('GitHub fetch failed (Unauthorized)');
		if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
        
		const githubRepos = await response.json();
		const projects: any[] = [];
		const gitReposFromDb = await repositoryService.getAllSourceReposFromDb(Sources.GITHUB);
		
		for (const repo of githubRepos) {
			let mongoRepo: any = gitReposFromDb.find((element: any) => element.repoName === repo.full_name);

			if (!mongoRepo) {
				const insertResult = await repositoryService.createGitRepo(repo.owner.id.toString(), repo.full_name, githubId, ownerId);
				mongoRepo = { _id: insertResult.insertedId || insertResult._id, repoName: repo.full_name, gitOwner: repo.owner.id.toString() };
			} else if (mongoRepo.gitOwner === githubId.toString())  
				await repositoryService.updateOwnerInRepo(mongoRepo._id.toString(), ownerId, mongoRepo.owner?.toString());
			
            
			projects.push({
				_id: mongoRepo._id,
				repoName: repo.full_name,
				source: Sources.GITHUB
			});
		}
		return projects;
	} catch (reason) {
		console.error('Problem getting GitHub projects:', reason);
		return [];
	}
}


//### STORY SYNC ###

/**
 * Fetches stories from the specified source (GitHub or Jira).
 * @param user The authenticated user.
 * @param query Query parameters (source, githubName, repository, projectKey, id).
 * @returns A promise resolving to an array of synchronized stories.
 */
export async function getStoriesFromSource(user: User, query: { [key: string]: string }): Promise<Story[]> {
	console.log('getStoriesFromSource called for source:', query.source, 'userId:', user?._id);
	const { source, githubName, repository, projectKey, id: _id } = query;
    
	const tmpStories = new Map<string, Story>();
	const storiesArray: ObjectId[] = [];
	let repo: any;

	if (source === Sources.GITHUB) {
		if (!checkValidGithubFormat(githubName, repository))  // Use the helper
			throw new Error('Invalid GitHub username or repository name');
        
		const token = user?.github?.githubToken || process.env.TESTACCOUNT_TOKEN!;
		const githubRepoUrl = `${githubName}/${repository}`;
        
		repo = await repositoryService.getOneGitRepository(githubRepoUrl);
		if (!repo) throw new Error('Repository not found in DB');
        
		const headers = { Authorization: `token ${token}` };
		const response = await fetch(`https://api.github.com/repos/${githubRepoUrl}/issues?labels=story`, { headers });

		if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
        
		const issues = await response.json();
		console.log(`Fetched ${issues.length} issues from GitHub`);
		for (const issue of issues) {
			const story: Partial<Story> = {
				story_id: issue.id,
				title: issue.title,
				body: issue.body,
				state: issue.state,
				issue_number: issue.number,
				storySource: 'github',
				assignee: issue.assignee?.login || 'unassigned',
				assignee_avatar_url: issue.assignee?.avatar_url || null
			};
            
			const entry = await fuseStoryWithDb(story);
			tmpStories.set(entry._id.toString(), entry);
			storiesArray.push(oid(entry._id));
		}

	} else if (source === Sources.JIRA && user?.jira && projectKey !== 'null') {
		if (!/^[A-Za-z][A-Za-z0-9_-]+$/.test(projectKey)) 
			throw new Error('Invalid Jira project key format');
        
		const { AccountName, AuthMethod, Host, Password, Password_Nonce, Password_Tag } = user.jira;
		const clearPass = jiraDecryptPassword(Password, Password_Nonce, Password_Tag);
		const authString = buildAuthString(AccountName, clearPass, AuthMethod);

		const options: RequestInit = { method: 'GET', headers: { 'cache-control': 'no-cache', Authorization: authString } };

		repo = await repositoryService.getOneJiraRepository(projectKey);
		if (!repo) throw new Error('Jira repository not found in DB');

		const testSets: any[] = [];
		const preConditionMap: any[] = [];

		const jql = `project="${projectKey}" AND (labels=Seed-Test OR issuetype=Test OR issuetype="Test Set" OR issuetype="Pre-Condition")`;
		const searchUrl = `https://${Host}/rest/api/2/search?jql=${encodeURIComponent(jql)}&startAt=0&maxResults=200`;
		const response = await fetch(searchUrl, options);
		if (!response.ok) throw new Error(`Jira API error: ${response.status}`);
        
		const json = await response.json();
        
		const storyPromises = json.issues.map(async (issue: any): Promise<Story | null> => {
			if (issue.fields.issuetype.name === 'Test Set') {
				testSets.push({
					testSetKey: issue.key,
					testSetId: issue.id,
					tests: issue.fields.customfield_14233 || [],
					xrayTestSet: true
				});
				return null;
			}
            
			if (issue.fields.issuetype.name === 'Pre-Condition') {
				const preCondition = {
					preConditionKey: issue.key,
					preConditionName: issue.fields.summary,
					testSet: (issue.fields.issuelinks || [])
						.filter((link: any) => link.inwardIssue && link.type.inward === 'tested by')
						.map((link: any) => link.inwardIssue.key)
				};
				preConditionMap.push(preCondition);
				return null;
			}

			if (issue.fields.issuetype.name === 'Test') {
				const { scenarioList, testStepDescription } = await xrayService.handleTestIssue(issue, options, Host);
                
				const finalPreConditions = (issue.fields.customfield_14229 || [])
					.map((preConKey: string) => preConditionMap.find(p => p.preConditionKey === preConKey))
					.filter(Boolean);

				const story: Partial<Story> = {
					story_id: parseInt(issue.id, 10),
					title: issue.fields.summary,
					body: (issue.fields.description || ''),
					scenarios: scenarioList as Scenario[],
					state: issue.fields.status.name,
					issue_number: issue.key,
					storySource: 'jira',
					sourceSteps: testStepDescription,
					host: Host,
					preConditions: finalPreConditions,
					assignee: issue.fields.assignee?.name || 'unassigned',
					assignee_avatar_url: issue.fields.assignee?.avatarUrls['32x32'] || null
				};
				return story as Story;
			}
			return null;
		});

		const processedStories = (await Promise.all(storyPromises)).filter(Boolean) as Story[];
        
		// Update Test Sets in the background
		await updateTestSets(testSets, repo._id.toString());
        
		for (const story of processedStories) {
			const entry = await fuseStoryWithDb(story);
			tmpStories.set(entry._id.toString(), entry);
			storiesArray.push(oid(entry._id));
		}

	} else 
		throw new Error('Invalid source or missing credentials for story fetching.');
    

	// Match order and send response
	return await matchStoryOrder(storiesArray, tmpStories, repo);
}

/**
 * Matches the order of stories from the repo document with the fetched stories.
 * New stories are appended, and the order is updated in the DB.
 */
export async function matchStoryOrder(
	storiesIdList: ObjectId[], 
	storiesMap: Map<string, Story>, 
	repoDoc: any
): Promise<Story[]> {
	const dbStoryIds = (repoDoc.stories || []).map((s: ObjectId) => s.toString());
	const fetchedStoryIds = storiesIdList.map(s => s.toString());
    
	// 1. Find story IDs that are in the repo, but were NOT fetched in this sync
	const missingDbStoryIds = dbStoryIds.filter((id: string) => !storiesMap.has(id));

	// 2. Load these "missing" stories from the database to ensure the list is complete
	if (missingDbStoryIds.length > 0) {
		console.log(`Loading ${missingDbStoryIds.length} existing stories from DB that were not in the JQL sync...`);
        
		// Load missing stories (assuming story.service.ts has getOneStory)
		// A 'getStoriesByIds' would be more efficient, but this is safer
		const missingStories = await Promise.all(
			missingDbStoryIds.map(id => storyService.getOneStory(id))
		);
        
		// Add them to the storiesMap so they aren't lost
		missingStories.filter(Boolean).forEach((story: Story) => {
			if (story)  // Check if story was found
				storiesMap.set(story._id.toString(), story);
			else 
				console.warn('Failed to load story from DB with ID, it might be orphaned.');
            
		});
	}

	// 3. Determine the final list of story IDs
	// We take all stories now known (from repo)
	// and add any truly new stories (fetched but not in repo)
	const newStoryIds = fetchedStoryIds.filter((id: string) => !dbStoryIds.includes(id));
    
	// The final order: all stories that were in the repo, plus new ones
	const finalStoryIdList = [...dbStoryIds, ...newStoryIds];

	// 4. Update the repo's story array if new stories were added
	if (newStoryIds.length > 0 && repoDoc?._id) {
		// Filter final list to only include stories that actually exist
		const validFinalIdList = finalStoryIdList.filter(id => storiesMap.has(id));
         
		// Update the repo in the background, don't await
		repositoryService.updateStoriesArrayInRepo(repoDoc._id.toString(), validFinalIdList)
			.catch(err => console.error('Failed to update story order in repo:', err));
	}

	// 5. Return the complete list, mapped from the now-complete storiesMap
	return finalStoryIdList
		.map((id: string) => storiesMap.get(id)!) // Map all valid IDs
		.filter(Boolean); // Filter out any that were truly missing or orphaned
};


/**
 * Fetches a story from an external source (GitHub/Jira) and merges/updates it in the database.
 * @param story Partial story object from external source.
 * @returns The updated or newly created story object from the database.
 */
async function fuseStoryWithDb(story: Partial<Story>): Promise<Story> {
	// Use story_id (numeric) for lookup if available and valid
	const lookupId = typeof story.story_id === 'number' ? story.story_id : story._id;
	if (lookupId === undefined || lookupId === null) 
		throw new Error('Cannot fuse story without a valid story_id or _id.');
    
    
	let result: Story | null = null;
	try {
		result = await storyService.getOneStory(lookupId);
	} catch (_e) {
		console.warn(`Story with ID ${lookupId} not found in DB, will create new.`);
	}

	let finalStoryData: Partial<Story>;

	if (result) {
		// Merge external data into existing DB story
		finalStoryData = mergeStories(result, story as Story);
		finalStoryData._id = result._id; 
	} else {
		// Prepare new story data
		finalStoryData = {
			...story,
			scenarios: story.scenarios && story.scenarios.length > 0 ? story.scenarios : [emptyScenario()],
			background: story.background || emptyBackground()
		};
		// Remove potential invalid _id from external source if creating new
		delete finalStoryData._id; 
	}

	if (typeof finalStoryData.story_id === 'string') finalStoryData.story_id = parseInt(finalStoryData.story_id, 10);
	if (finalStoryData.storySource !== Sources.JIRA && typeof finalStoryData.issue_number === 'string') 
		finalStoryData.issue_number = parseInt(finalStoryData.issue_number, 10);
    

	const upsertResult = await storyService.upsertStoryByExternalId(finalStoryData.story_id!, finalStoryData);
    
	const finalId = upsertResult?.value?._id || upsertResult?.lastErrorObject?.upserted || finalStoryData._id;
	if (!finalId) 
		throw new Error('Failed to get story ID after upsert.');
    

	// Fetch the final state from DB to ensure consistency
	const finalStory = await storyService.getOneStory(finalId); 
	if (!finalStory) throw new Error('Failed to fetch story after upsert.');

	// Update feature file
	await featureFileService.writeFile(finalStory);
    
	return finalStory as Story;
}

/**
 * Merges a fresh story from Jira into an existing DB story structure.
 * This ensures external data (title, body, state) is updated,
 * while scenarios are merged intelligently.
 */
function mergeStories(dbStory: Story, jiraStory: Story): any {
	// Start with the DB story (to keep _id, background, lastTestPassed etc.)
	const mergedStory: any = { ...dbStory };

	mergedStory.title = jiraStory.title;
	mergedStory.body = jiraStory.body;
	mergedStory.state = jiraStory.state;
	mergedStory.issue_number = jiraStory.issue_number;
	mergedStory.storySource = jiraStory.storySource;
	mergedStory.host = jiraStory.host;
	mergedStory.preConditions = jiraStory.preConditions;
	mergedStory.assignee = jiraStory.assignee;
	mergedStory.assignee_avatar_url = jiraStory.assignee_avatar_url;

	// Now, perform the existing scenario merge logic
	const dbScenarios = dbStory.scenarios || [];
	const jiraScenarios = jiraStory.scenarios || [];
	const dbScenarioMap = new Map(dbScenarios.map(scenario => [scenario.scenario_id, scenario]));
	const mergedScenarios: any[] = [];

	// Iterate through Jira scenarios, update existing or add new
	jiraScenarios.forEach(jiraScenario => {
		const dbScenario = dbScenarioMap.get(jiraScenario.scenario_id);
		if (dbScenario) {
			// Merge existing scenario
			mergedScenarios.push({
				...dbScenario, 
				name: jiraScenario.name, // Ensure scenario name is also updated
				stepDefinitions: mergeStepDefinitions(dbScenario.stepDefinitions, jiraScenario.stepDefinitions),
				testRunSteps: mergeTestRunSteps(dbScenario.testRunSteps, jiraScenario.testRunSteps),
				testKey: jiraScenario.testKey 
			});
			dbScenarioMap.delete(jiraScenario.scenario_id); // Mark as processed
		} else 
		// Add new scenario from Jira
			mergedScenarios.push(jiraScenario);
        
	});

	// Add any remaining DB-only scenarios
	mergedScenarios.push(...Array.from(dbScenarioMap.values()));
    
	mergedStory.scenarios = mergedScenarios;
	return mergedStory;
}

/**
 * Merges step definitions from DB and Jira.
 * Tries to preserve DB order if all Jira steps are present in DB,
 * otherwise prioritizes Jira order and appends missing DB steps.
 * @param dbStepDefinitions Steps from the database (as StepDefinition object).
 * @param jiraStepDefinitions Steps from Jira/XRay (as StepDefinition object).
 * @returns Merged step definitions (as StepDefinition object).
 */
function mergeStepDefinitions(dbStepDefinitions?: Partial<StepDefinition>, jiraStepDefinitions?: Partial<StepDefinition>): Partial<StepDefinition> {
	const mergedStepDefinitions: Partial<StepDefinition> = {};

	// Define the keys explicitly for type safety
	const stepTypes: (keyof StepDefinition)[] = ['given', 'when', 'then', 'example'];

	stepTypes.forEach(stepType => {
		const dbSteps: StepType[] = dbStepDefinitions?.[stepType] || [];
		const jiraSteps: StepType[] = jiraStepDefinitions?.[stepType] || [];

		// Simple case: If either is empty, return the other
		if (jiraSteps.length === 0) {
			mergedStepDefinitions[stepType] = dbSteps;
			return;
		}
		if (dbSteps.length === 0) {
			mergedStepDefinitions[stepType] = jiraSteps;
			return;
		}

		// Create a unique key for each step (assuming combination is unique)
		const stepKey = (step: StepType): string => `${step.pre || ''}-${step.mid || ''}-${step.post || ''}`;
        
		// Explicitly type the Maps
		const dbStepMap = new Map<string, StepType>(dbSteps.map(step => [stepKey(step), step]));
		const jiraStepMap = new Map<string, StepType>(jiraSteps.map(step => [stepKey(step), step]));

		// Check if all Jira steps exist (based on key) in DB steps
		const allJiraInDb = jiraSteps.every(jiraStep => dbStepMap.has(stepKey(jiraStep)));

		let finalSteps: StepType[] = [];

		if (allJiraInDb) 
		// Keep DB order, merge Jira properties into matching DB steps
			finalSteps = dbSteps.map((dbStep) => {
				const key = stepKey(dbStep);
				const jiraStep = jiraStepMap.get(key); // Get potential match
				if (jiraStep) 
				// Merge: start with dbStep, overwrite with jiraStep properties
				// Both are now guaranteed to be StepType (or derived objects)
					return { ...dbStep, ...jiraStep };
				else 
					return dbStep; // Keep DB step if no Jira equivalent
                
			});
		else {
			// Prioritize Jira order, append DB steps that are not in Jira
			finalSteps = [...jiraSteps]; // Start with all Jira steps
			dbSteps.forEach((dbStep) => {
				if (!jiraStepMap.has(stepKey(dbStep))) 
					finalSteps.push(dbStep); // Add DB steps missing in Jira
                
			});
		}
		mergedStepDefinitions[stepType] = finalSteps;
	});

	return mergedStepDefinitions;
}

/**
 * Merges Jira test run steps (simple replacement).
 */
function mergeTestRunSteps(dbTestRunSteps: any, jiraTestRunSteps: any): any {
	return jiraTestRunSteps ?? dbTestRunSteps; // If jiraTestRunSteps is null/undefined, keep dbTestRunSteps
}


//### JIRA TEST SET SYNC ###

/**
 * Updates repository groups based on Jira Test Sets.
 * @param testSets Array of test set objects from Jira.
 * @param repo_id Repository ID to update.
 */
export async function updateTestSets(testSets: any[], repo_id: string): Promise<void> {
	const repository = await repositoryService.getOneRepositoryById(repo_id);
	if (!repository) {
		console.warn(`Repository ${repo_id} not found. Skipping all Test Set updates.`);
		return;
	}
	for (const testSet of testSets) 
		try {
            
			// 2. Find the existing group
			const existingGroup = repository.groups.find(group => group.name === testSet.testSetKey);

			// 3. Get the list of valid story IDs for this set
			const storyIds = await storyService.getStoriesByIssueKeys(testSet.tests); 

			// 4. Handle the case where the Test Set is now EMPTY
			if (storyIds.length === 0) {
				if (existingGroup) {
					// The Test Set is empty, but a group with old stories exists.
					// We MUST update it to be empty.
					console.log(`Test Set ${testSet.testSetKey} is empty. Clearing member stories from existing group.`);
					const updatedGroup = { ...existingGroup, member_stories: [] }; // Empty the array
					await repositoryService.updateStoryGroup(repo_id, existingGroup._id.toString(), updatedGroup);
				} else 
				// The Test Set is empty and no group exists. Do nothing.
					console.log(`No stories found for Test Set ${testSet.testSetKey}. Skipping group creation.`);
                
				continue; // Move to the next test set
			}

			// 5. Handle the case where the Test Set has stories
			if (existingGroup) {
				// Group exists, update it with the fresh list of IDs
				// updateStoryGroup expects Group (string[]) but MongoDB stores ObjectId[]
				const updatedGroup = { ...existingGroup, member_stories: storyIds.map(id => oid(id)) as any[] };
				await repositoryService.updateStoryGroup(repo_id, existingGroup._id.toString(), updatedGroup); 
				console.log(`Updated group for Test Set: ${testSet.testSetKey}`);
			} else {
				// Group does not exist, create it
				await repositoryService.createStoryGroup( 
					repo_id,
					testSet.testSetKey,
					storyIds,
					true, // Assuming sequential is true for test sets
					testSet.xrayTestSet
				);
				console.log(`Group created for Test Set: ${testSet.testSetKey}`);
			}
		} catch (e: any) {
			console.error(`Error processing group for Test Set ${testSet.testSetKey}:`, e.message || e);
		}
    
}