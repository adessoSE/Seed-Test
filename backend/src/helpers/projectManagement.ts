import mongo from "../../src/database/DbServices";
import dbConnector from "../../src/database/DbConnector";
import { jiraDecryptPassword } from "./userManagement";
import emptyScenario from "../../src/models/emptyScenario";
import emptyBackground from "../../src/models/emptyBackground";
import { writeFile } from "../../src/serverHelper";
import AdmZip from "adm-zip";
import path from "path";

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
	xrayTestSet: boolean
}

class Repository {
  _id: string;
  owner: string;
  gitOwner: string;
  stories: Array<string>;
  repoType: Enumerator<Sources>;
  customBlocks: Array<string>;
  groups: Array<Group>;
}

/**
 * get repo names from jira
 * @param jiraUser only jira part of user
 * @returns
 */
async function getJiraRepos(jiraUser: any) {
  if (!jiraUser) return [];
  let {
    Host,
    AccountName,
    Password,
    Password_Nonce,
    Password_Tag,
    AuthMethod,
  } = jiraUser;
  const jiraClearPassword = jiraDecryptPassword(
    Password,
    Password_Nonce,
    Password_Tag
  );
  const repos = await requestJiraRepos(
    Host,
    AccountName,
    jiraClearPassword,
    AuthMethod
  );
  return await storeJiraRepos(repos);
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
	
    const reqOptions = {
      method: 'GET',
      headers: {
        'cache-control': 'no-cache',
        'Authorization': authString
      }
    };
	const url = `https://${host}/rest/api/2/project`
    // use GET /rest/api/2/project instead of GET /rest/api/2/issue/createmeta
    // https://docs.atlassian.com/software/jira/docs/api/REST/7.6.1/#api/2/project-getAllProjects
  const jiraProjects =  await fetch(url, reqOptions)
		.then((response) => response.json())
		.catch((error) => { console.error(error.stack); return [] })
	const projects = jiraProjects.map((project) => project.name)
	return projects
}

/**
 * store and  cumulate jira repos
 * @param projects
 * @returns
 */
async function storeJiraRepos(projects: Array<any>) {
  const source = Sources.JIRA;
  let repos = [];
  let jiraRepo;
  const jiraReposFromDb = await mongo.getAllSourceReposFromDb(source);
  if (projects.length !== 0) {
    for (const projectName of projects) {
      if (!jiraReposFromDb.some((entry) => entry.repoName === projectName)) {
        jiraRepo = await mongo.createJiraRepo(projectName);
      } else {
        jiraRepo = jiraReposFromDb.find(
          (element) => element.repoName === projectName
        );
      }
      repos.push({ name: projectName, _id: jiraRepo._id });
    }
    return repos.map<{ _id: string; value: string; source: string }>(
      (value) => ({
        _id: value._id,
        value: value.name,
        source,
      })
    );
  } else return [];
}
function dbProjects(userId: string) {
  return new Promise((resolve) => {
    if (typeof userId === undefined || userId === "") resolve([]);
    mongo.getRepository(userId).then((json) => {
      const projects = [];
      if (Object.keys(json).length === 0) resolve([]);
      for (const repo of json)
        if (repo.repoType === "db") {
          const proj = {
            _id: repo._id,
            value: repo.repoName,
            source: repo.repoType,
            canEdit: repo.canEdit,
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
		const reqOptions = {headers: {'Authorization': 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64')}}
		fetch(link, reqOptions)
			.then((response) => {
				if (response.status === 401) reject("github fetch failed (Unauthorized): " + response.status)
				return response})
			.then((response) => {
				if (response.status !== 200) reject(response.status); 
				return response})
			.then((response) => response.json())
			.then(async (response) => {
				const projects = [];
				const gitReposFromDb = await mongo.getAllSourceReposFromDb('github');
				let mongoRepo;
				for (const repo of response) {
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
			}).catch((reason) => {console.error("problem getting the github projects");resolve([]);return []});
	}).catch(() => [])
}

function ownRepositories(ownerId, githubId, githubName, token) {
  if (!githubName && !token) return Promise.resolve([]);
  return execRepositoryRequests(
    "https://api.github.com/user/repos?per_page=100",
    githubName,
    token,
    ownerId,
    githubId
  );
}

function starredRepositories(ownerId, githubId, githubName, token) {
  if (!githubName && !token) return Promise.resolve([]);
  return execRepositoryRequests(
    `https://api.github.com/users/${githubName}/starred`,
    githubName,
    token,
    ownerId,
    githubId
  );
}

function mergeTestRunSteps(dbTestRunSteps, jiraTestRunSteps) {
  if (dbTestRunSteps !== jiraTestRunSteps) {
      return jiraTestRunSteps; }
  else {
      return dbTestRunSteps;
  }
}

function mergeStepDefinitions(dbStepDefinitions, jiraStepDefinitions) {
  const mergedStepDefinitions = {};
  ['given', 'when', 'then', 'example'].forEach(stepType => {
    const dbSteps = dbStepDefinitions[stepType] || [];
    const jiraSteps = jiraStepDefinitions[stepType] || [];

    const allJiraInDb = jiraSteps.every(jiraStep => 
      dbSteps.some(dbStep => dbStep.id === jiraStep.id)
    );

    if (allJiraInDb) {
      mergedStepDefinitions[stepType] = dbSteps.map(dbStep => {
        const jiraStep = jiraSteps.find(jStep => jStep.id === dbStep.id);
        return jiraStep ? {...dbStep, ...jiraStep} : dbStep;
      });
    } else {
      mergedStepDefinitions[stepType] = [
        ...jiraSteps, 
        ...dbSteps.filter(dbStep => !jiraSteps.some(jStep => jStep.id === dbStep.id))
      ];
    }
  });

  return mergedStepDefinitions;
}


function mergeStories(dbStory, jiraStory) {
  const mergedStory = { ...dbStory };
  const dbScenarios = dbStory.scenarios;
  const jiraScenarios = jiraStory.scenarios;

  const dbScenarioMap = new Map();
  dbScenarios.forEach(scenario => dbScenarioMap.set(scenario.scenario_id, scenario));

  const jiraScenarioMap = new Map();
  jiraScenarios.forEach(scenario => jiraScenarioMap.set(scenario.scenario_id, scenario));

  // inidicates if all xray jira scenarios are in db
  const allJiraInDb = jiraScenarios.every(jiraScenario => dbScenarioMap.has(jiraScenario.scenario_id));

  const mergedScenarios = [];

  // if all jira scenarios are in db, we keep db order and merge jira scenarios
  if (allJiraInDb) {
  
    dbScenarios.forEach(dbScenario => {
      const jiraScenario = jiraScenarioMap.get(dbScenario.scenario_id);
      if (jiraScenario) {
        mergedScenarios.push({
          ...dbScenario,
          name: jiraScenario.name,
          stepDefinitions: mergeStepDefinitions(dbScenario.stepDefinitions, jiraScenario.stepDefinitions),
          testRunSteps: mergeTestRunSteps(dbScenario.testRunSteps, jiraScenario.testRunSteps),
          testKey: jiraScenario.testKey
        });
      } else {
        mergedScenarios.push(dbScenario);
      }
    });
    // if not all jira scenarios are in db, we keep jira order first and add db scenarios
  } else {
    jiraScenarios.forEach(jiraScenario => {
      const dbScenario = dbScenarioMap.get(jiraScenario.scenario_id);
      if (dbScenario) {
        mergedScenarios.push({
          ...dbScenario,
          name: jiraScenario.name,
          stepDefinitions: mergeStepDefinitions(dbScenario.stepDefinitions, jiraScenario.stepDefinitions),
          testRunSteps: mergeTestRunSteps(dbScenario.testRunSteps, jiraScenario.testRunSteps),
          testKey: jiraScenario.testKey
        });
      } else {
        mergedScenarios.push(jiraScenario);
      }
    });

    // add remaining db scenarios that were not processed
    dbScenarios.forEach(dbScenario => {
      if (!jiraScenarioMap.has(dbScenario.scenario_id)) {
        mergedScenarios.push(dbScenario);
      }
    });
  }

  mergedStory.scenarios = mergedScenarios;

  return mergedStory;
}


async function fuseStoryWithDb(story) {
	const result = await mongo.getOneStory(parseInt(story.story_id, 10));

	if (result !== null) {
    
		const mergedStory = mergeStories(result, story);
		story.scenarios = mergedStory.scenarios;
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
    const repo = await mongo.getOneRepositoryById(repo_id);
    if (!repo || !repo.stories) {
      console.log("No repo to corresonding ID found!");
      return null;
    }
    //Collect stories for export
    let exportStories = [];
    let keyStoryIds = []; //Needed for goup-story link
    for (let index = 0; index < repo.stories.length; index++) {
      let story = await mongo.getOneStory(repo.stories[index]);
      if (!story) {
        throw new Error(`Story ${repo.stories[index]} not found`);
      }
      keyStoryIds.push(story._id.toString());
      delete story._id;
      //story.story_id = index; Das ist die Git/Jira Story ID - lieber nicht entfernen
      exportStories.push(story);
    }

    //Collect blocks for export
    let repoBlocks = await mongo.getBlocks(repo_id);

    //Falls sich die getBlocks Blöcke wider Erwarten von den customBlocks in dem repo unterscheiden, müssen wir ggf. anders loopen und zwischenabfragen
    for (let index = 0; index < repoBlocks.length; index++) {
      delete repoBlocks[index]._id;
    }

    //Collect & adjust groups for export
    let repoGroups = [...repo.groups];
    for (let index = 0; index < repoGroups.length; index++) {
      delete repoGroups[index]._id;
      //change memberStories references to indices
      for (
        let sub_index = 0;
        sub_index < repoGroups[index].member_stories.length;
        sub_index++
      ) {
        repoGroups[index].member_stories[sub_index] = keyStoryIds.indexOf(
          repoGroups[index].member_stories[sub_index]
        );
      }
    }

    const zip = new AdmZip();
    // Create separate folders for stories and groups
    const storiesFolder = "stories_data";
    for (let index = 0; index < exportStories.length; index++) {
      zip.addFile(
        path.join(`${storiesFolder}/story_${index}.json`),
        Buffer.from(JSON.stringify(exportStories[index]), "utf8")
      );
    }

    const groupsFolder = "groups_data";
    for (let index = 0; index < repoGroups.length; index++) {
      zip.addFile(
        path.join(`${groupsFolder}/group_${index}.json`),
        Buffer.from(JSON.stringify(repoGroups[index]), "utf8")
      );
    }

    // Write the rest of the data as individual JSON files
    zip.addFile("repo.json", Buffer.from(JSON.stringify(repo), "utf8"));
    zip.addFile(
      "repoBlocks.json",
      Buffer.from(JSON.stringify(repoBlocks), "utf8")
    );
    zip.addFile(
      "keyStoryIds.json",
      Buffer.from(JSON.stringify(keyStoryIds), "utf8")
    );

    return zip.toBuffer();
  } catch (error) {
    console.error("Error exporting project: ", error.message);
    throw error;
  }
}

//General function to check for possible Renaming suffixes
function checkAndAddSuffix(name, conflictingNameList) {
  let suffix = 1;
  let newName = name;

  // Check for existing titles with suffix
  while (conflictingNameList.includes(newName)) {
    newName = name + suffix;
    suffix++;
  }

  // Add the new name (with or without suffix) to the list
  conflictingNameList.push(newName);
  return newName;
}

//Get the associatedId from conflict list
function findAssociatedID(name, data) {
  for (const { conflictingName, associatedID } of data) {
    if (conflictingName === name) {
      return associatedID;
    }
  }
  return null; // Indicate ID not found
}

async function importProject(file, repo_id?, projectName?, importMode?) {
  // Create a MongoDB client and start a session
  const client = await dbConnector.establishConnection();
  const session = await client.startSession();
  const zip = new AdmZip(file.buffer);
  importMode = importMode === "false" ? false : true;
  try {
    // Extract the stories and groups data
    const storiesFolder = "stories_data";
    const groupsFolder = "groups_data";

    const storyFiles = zip
      .getEntries()
      .filter((entry) => entry.entryName.startsWith(storiesFolder));
    const groupFiles = zip
      .getEntries()
      .filter((entry) => entry.entryName.startsWith(groupsFolder));

    // Sort Files by filename - important for keyStoryId assignment
    storyFiles.sort((a, b) => {
      const filenameA = a.entryName;
      const filenameB = b.entryName;
      return filenameA.localeCompare(filenameB);
    });
    groupFiles.sort((a, b) => {
      const filenameA = a.entryName;
      const filenameB = b.entryName;
      return filenameA.localeCompare(filenameB);
    });
    const repoJsonData = zip.readAsText("repo.json");
    const repoData = JSON.parse(repoJsonData);
    const mappingJsonData = zip.readAsText("keyStoryIds.json");
    const mappingData = JSON.parse(mappingJsonData);
    const repoBlocksJsonData = zip.readAsText("repoBlocks.json");
    const repoBlocksData = JSON.parse(repoBlocksJsonData);
    let groupMapping = [];
    //Needed for automatic renaming
    let existingNameList: string[] = [];

    //Füllen der KeyStoryIds in Array -> ArrayIndex für Gruppenzuweisung wichtig!
    for (const singularMapping of mappingData) {
      const mappingObject = {
        oldID: singularMapping,
        //To be filled during story creation process
        newID: "",
      };
      groupMapping.push(mappingObject);
    }

    async function nameCheckStory() {
      let conflictingNames = [];
      const existingStories = await mongo.getAllStoriesOfRepo(repo_id);
      const existingNames = existingStories.map(({ title, _id }) => ({
        existingName: title,
        associatedID: _id.toHexString(),
      }));

      const newData = existingNames.map(({ existingName }) => existingName);
      existingNameList = existingNameList.concat(newData);
      for (const storyFile of storyFiles) {
        const storyData = zip.readAsText(storyFile.entryName);
        const storyObject = JSON.parse(storyData);
        for (const { existingName, associatedID } of existingNames) {
          if (storyObject.title === existingName) {
            conflictingNames.push({
              conflictingName: storyObject.title,
              associatedID: associatedID,
            });
            break;
          }
        }
      }
      return conflictingNames;
    }

    async function nameCheckBlock() {
      let conflictingNames = [];
      const existingRepoBlocks = await mongo.getBlocks(repo_id);
      const existingNames = existingRepoBlocks.map(({ name, _id }) => ({
        existingName: name,
        associatedID: _id.toHexString(),
      }));

      const newData = existingNames.map(({ existingName }) => existingName);
      existingNameList = existingNameList.concat(newData);
      for (const singularBlock of repoBlocksData) {
        for (const { existingName, associatedID } of existingNames) {
          if (singularBlock.name === existingName) {
            conflictingNames.push({
              conflictingName: singularBlock.name,
              associatedID: associatedID,
            });
            break;
          }
        }
      }
      return conflictingNames;
    }

    async function nameCheckGroup() {
      let conflictingNames = [];
      const existingGroups = await mongo.getAllStoryGroups(repo_id);
      const existingNames = existingGroups.groups.map(({ name, _id }) => ({
        existingName: name,
        associatedID: _id.toHexString(),
      }));

      const newData = existingNames.map(({ existingName }) => existingName);
      existingNameList = existingNameList.concat(newData);
      for (const groupFile of groupFiles) {
        const groupData = zip.readAsText(groupFile.entryName);
        const groupObject = JSON.parse(groupData);
        for (const { existingName, associatedID } of existingNames) {
          if (groupObject.name === existingName) {
            conflictingNames.push({
              conflictingName: groupObject.name,
              associatedID: associatedID,
            });
            break;
          }
        }
      }
      return conflictingNames;
    }

    if (repo_id && repo_id != "undefined") {
      // Perform a PUT request for an existing project
      console.log("Performing a PUT request for an existing project");
      console.log(
        importMode
          ? "We are renaming."
          : "We are overwriting."
      );

      //Begin Transaction!
      await session.withTransaction(async (session) => {
        // Check for duplicate names
        const storyConflicts = await nameCheckStory();
        const blockConflicts = await nameCheckBlock();
        const groupConflicts = await nameCheckGroup();

        // Concatenate the results into a single array
        const allConflicts = storyConflicts.concat(
          blockConflicts,
          groupConflicts
        );

        console.log("All conflicting names:", allConflicts);

        await mongo.importStories(
          false,
          repo_id,
          session,
          storyFiles,
          groupMapping,
          existingNameList,
          importMode,
          checkAndAddSuffix,
          findAssociatedID,
          client,
          file,
          allConflicts
        );
        await mongo.importBlocks(
          false,
          repo_id,
          await mongo.getOneRepositoryById(repo_id).repoName,
          session,
          existingNameList,
          repoBlocksData,
          importMode,
          checkAndAddSuffix,
          findAssociatedID,
          client,
          allConflicts
        );
        await mongo.importGroups(
          false,
          repo_id,
          session,
          groupFiles,
          groupMapping,
          existingNameList,
          importMode,
          repo_id,
          checkAndAddSuffix,
          findAssociatedID,
          client,
          file,
          allConflicts
        );
      });

      return "";
    } else {
      // Perform a POST request for a new project
      console.log("Performing a POST request for a new project");

      //Begin Transaction!
      await session.withTransaction(async (session) => {
        //Create new repo with some exported information
        const newRepo = await mongo.createRepo(
          repoData.owner,
          projectName,
          session,
          client
        );
        if (
          typeof newRepo === "string" &&
          newRepo.startsWith(
            "Sie besitzen bereits ein Repository mit diesem Namen!"
          )
        ) {
          console.log("Repository already existing!");
          throw new Error(newRepo); // Throw an error with the message
        }
        await mongo.importStories(
          true,
          newRepo.toHexString(),
          session,
          storyFiles,
          groupMapping,
          existingNameList,
          importMode,
          checkAndAddSuffix,
          findAssociatedID,
          client,
          file
        );
        
        await mongo.importBlocks(
          true,
          newRepo.toHexString(),
          projectName,
          session,
          existingNameList,
          repoBlocksData,
          importMode,
          checkAndAddSuffix,
          findAssociatedID,
          client
        );
        await mongo.importGroups(
          true,
          newRepo.toHexString(),
          session,
          groupFiles,
          groupMapping,
          existingNameList,
          importMode,
          repo_id,
          checkAndAddSuffix,
          findAssociatedID,
          client,
          file
        );
      });

      return "";
    }
  } catch (error) {
    console.error("Import failed:", error);
    if (session.inTransaction()) {
      console.log("Import transaction is being aborted.");
      await session.abortTransaction();
    }
  } finally {
    await session.endSession();
    await client.close();
  }
}
async function updateTestSets(testSets, repo_id) {
	for (const testSet of testSets) {
		try {
			const storyIds = await getStorysByIssue(testSet.tests);

			if (storyIds.length === 0) {
				console.log(`No stories found for Test Set ${testSet.testSetKey}. Skipping group creation.`);
				continue;
			}

			// Get repository to update groups
			const repository = await mongo.getOneRepositoryById(repo_id);

			// Find existing group by testSetKey
			let existingGroup = repository.groups.find(group => group.name === testSet.testSetKey);

			if (existingGroup) {
                // Update existing group
                const updatedGroup = { ...existingGroup, member_stories: storyIds }; 
                await mongo.updateStoryGroup(repo_id, existingGroup._id.toString(), updatedGroup);
                console.log(`Updated group for Test Set: ${testSet.testSetKey}`);
            } else {
                // Create a new group if it does not exist
                const groupId = await mongo.createStoryGroup(
                    repo_id,
                    testSet.testSetKey,
                    storyIds,
                    true,
					testSet.xrayTestSet
                );
                console.log(`Group created for Test Set: ${testSet.testSetKey}`);
            }
        } catch (e) {
            console.error(`Error processing group for Test Set: ${testSet.testSetKey}:`, e);
        }
    }
}

async function getStorysByIssue(issueKeys) {
	try {
		const storiesIds = await mongo.getStoriesByIssueKeys(issueKeys);
		return storiesIds
	} catch (error) {
		console.error("Error fetching stories by issue keys:", error);
		return [];
	}
}

module.exports = {
  getJiraRepos,
  dbProjects,
  uniqueRepositories,
  starredRepositories,
  ownRepositories,
  fuseStoryWithDb,
  exportProject,
  importProject,
  checkAndAddSuffix,
  findAssociatedID,
	updateTestSets
};
