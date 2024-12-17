import * as mongoTs from "../database/projectDBServices"
import {Sources, CustomProject, JiraProject } from "../models/project";
import mongo from "../../src/database/DbServices";
import dbConnector from "../../src/database/dbConnector";
import { jiraDecryptPassword } from "./userManagement";
import emptyScenario from "../../src/models/emptyScenario";
import emptyBackground from "../../src/models/emptyBackground";
import { writeFile } from "../../src/serverHelper";
import AdmZip from "adm-zip";
import path from "path";

/**
 * get repo names from jira
 * @param jiraUser only jira part of user
 * @returns
 */
async function fetchJiraProjects(jiraUser: any) {
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
  let jiraResponse = await requestJiraProjects(
    Host,
    AccountName,
    jiraClearPassword,
    AuthMethod
  );

  
  jiraResponse = checkForXray(jiraResponse)
  
  const projectNames = jiraResponse.map((project: { name: string, isXray: boolean }) => ({[project.name]: project.isXray}))

  return await storeJiraRepos(projectNames);
}

/**
 * Makes the Request to fetch jira repos
 * @param host
 * @param username
 * @param jiraClearPassword
 * @returns
 */
async function requestJiraProjects(host: string, username: string, jiraClearPassword: string, authMethod: string) {
	// Prepare Jira-Auth
  let authString: string = `Bearer ${jiraClearPassword}`
	if(authMethod === 'basic'){ 
		const auth = Buffer.from(`${username}:${jiraClearPassword}`).toString('base64');
		authString = `Basic ${auth}`
	}

  // use GET /rest/api/2/project instead of GET /rest/api/2/issue/createmeta
  // https://docs.atlassian.com/software/jira/docs/api/REST/7.6.1/#api/2/project-getAllProjects
	const url = `https://${host}/rest/api/2/project`
  const reqOptions = {
    method: 'GET',
    headers: {
      'cache-control': 'no-cache',
      'Authorization': authString
    }
  };
	
  const jiraProjects =  await fetch(url, reqOptions)
		.then((response) => response.json())
		.catch((error) => { console.error(error.stack); return [] })

  return jiraProjects
}

/**
 * Checks if the Jira projects are Xray projects and adds an `isXray` property.
 * @param {Array<any>} jiraProjects - The Jira projects.
 * @returns {Array<any>} - The Jira projects with the `isXray` property.
 */
function checkForXray(jiraProjects: Array<any>): Array<any> {
  jiraProjects.forEach((project: any) => {
    if (project.projectCategory && project.projectCategory.name === "XRAY") {
      project.isXray = true;
    } else {
      project.isXray = false;
    }
  });
  return jiraProjects;
}

/**
 * store and cumulate jira repos
 * @param fetchedProjects
 * @returns
 */
async function storeJiraRepos(fetchedProjects: Array<{ name: string, isXray: boolean }>) {
  if (fetchedProjects.length === 0) return [];
  // get existing JiraProjects
  const existingJiraProjects = await mongoTs.getAllSourceProjectsFromDb(Sources.JIRA);

  let jiraProjects: Array<JiraProject> = [];

  fetchedProjects.forEach( async (project) =>  {
    const projectName: string = Object.keys(project)[0];
    const isXray: boolean = project[projectName];
    let jiraProject: JiraProject;

    // if is is a new Project
    if (!existingJiraProjects.some((existingProject: JiraProject) => existingProject.repoName === projectName)) {
      // create new Jira Project
      if (!isXray) {
        jiraProject = await mongoTs.createJiraProject(projectName);
      } else {
        jiraProject = await mongoTs.createXrayProject(projectName);
      }
    } else {
      // add existing Jira Project to list
      jiraProject = existingJiraProjects.find(
        (project: JiraProject) => project.repoName === projectName
      );
    }
    jiraProjects.push(jiraProject);
  });

  return jiraProjects.map<{ _id: string; value: string; source: string }>(
    (jiraProject) => ({
      _id: jiraProject._id,
      value: jiraProject.repoName,
      source: jiraProject.repoType,
    })
  );
}


/**
 * Retrieves custom projects for a user.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<Array>} - A promise that resolves to an array of custom projects.
 */
function getCustomProjects(userId: string): Promise<Array<any>> {
  return new Promise((resolve) => {
    if (typeof userId === 'undefined' || userId === "") resolve([]);
    mongo.getAllSourceReposFromDb(Sources.DB).then((dbProjects: Array<CustomProject>) => {
      if (dbProjects.length === 0) resolve([]);
      const projects = [];
      dbProjects.forEach((proj: CustomProject) => {
        projects.push({
          _id: proj._id,
          value: proj.repoName,
          source: proj.repoType,
          // canEdit: proj.canEdit // deprecated i guess ????
        });
      });
      resolve(projects);
    });
  });
}

/**
 * Filters unique repositories from a list of repositories.
 * @param {Array<any>} repositories - The list of repositories.
 * @returns {Array<any>} - An array of unique repositories.
 */
function uniqueRepositories(repositories: Array<any>): Array<any> {
  const uniqueIds = [];
  const uniqueRepos = [];
  for (const i in repositories) {
    try {
        if (uniqueIds.indexOf(repositories[i]._id.toString()) <= -1) {
          uniqueIds.push(repositories[i]._id.toString());
          uniqueRepos.push(repositories[i]);
        }
    } catch (error){
      throw Error (`Could not Read Project ${i}`)
    }
  }
  
  return uniqueRepos;
}

/**
 * Executes repository requests.
 * @param {string} url - The API link.
 * @param {string} user - The username.
 * @param {string} password - The password.
 * @param {string} ownerId - The owner ID.
 * @param {number} githubId - The GitHub ID.
 * @returns {Promise<Array<any>>} - A promise that resolves to an array of repositories.
 */
async function execRepositoryRequests(url: string, user: string, password: string, ownerId: string, githubId: number): Promise<Array<any>> {
  try {
    return await new Promise<any[]>((resolve, reject) => {
      const reqOptions = { headers: { 'Authorization': 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64') } };
      fetch(url, reqOptions)
        .then((response) => {
          if (response.status === 401) reject("github fetch failed (Unauthorized): " + response.status);
          return response;
        })
        .then((response_1) => {
          if (response_1.status !== 200) reject(response_1.status);
          return response_1;
        })
        .then((response_2) => response_2.json())
        .then(async (response_3) => {
          const projects = [];
          const gitReposFromDb = await mongo.getAllSourceReposFromDb(Sources.GITHUB);
          let mongoRepo: { gitOwner: number; _id: any; owner: any; };
          for (const repo of response_3) {
            // if this Repository is not in the DB create one in DB
            if (!gitReposFromDb.some((entry: { repoName: any; }) => entry.repoName === repo.full_name)) {
              mongoRepo = await mongo.createGitRepo(repo.owner.id, repo.full_name, githubId, ownerId);
            } else {
              mongoRepo = gitReposFromDb.find((element: { repoName: any; }) => element.repoName === repo.full_name);
              if (mongoRepo.gitOwner === githubId) mongo.updateOwnerInRepo(mongoRepo._id, ownerId, mongoRepo.owner);
            }
            const repoName = repo.full_name;
            const proj = {
              _id: mongoRepo._id,
              value: repoName,
              source: Sources.GITHUB
            };
            projects.push(proj);
          }
          resolve(projects);
        }).catch((reason) => { console.error("problem getting the github projects"); resolve([]); return []; });
    });
  } catch {
    return [];
  }
}

/**
 * Fetches the user's own repositories.
 * @param {string} ownerId - The owner ID.
 * @param {number} githubId - The GitHub ID.
 * @param {string} githubName - The GitHub username.
 * @param {string} token - The authentication token.
 * @returns {Promise<Array<any>>} - A promise that resolves to an array of repositories.
 */
function ownRepositories(ownerId: string, githubId: number, githubName: string, token: string): Promise<Array<any>> {
  if (!githubName && !token) return Promise.resolve([]);
  return execRepositoryRequests(
    "https://api.github.com/user/repos?per_page=100",
    githubName,
    token,
    ownerId,
    githubId
  );
}

/**
 * Fetches the user's starred repositories.
 * @param {string} ownerId - The owner ID.
 * @param {number} githubId - The GitHub ID.
 * @param {string} githubName - The GitHub username.
 * @param {string} token - The authentication token.
 * @returns {Promise<Array<any>>} - A promise that resolves to an array of repositories.
 */
function starredRepositories(ownerId: string, githubId: number, githubName: string, token: string): Promise<Array<any>> {
  if (!githubName && !token) return Promise.resolve([]);
  return execRepositoryRequests(
    `https://api.github.com/users/${githubName}/starred`,
    githubName,
    token,
    ownerId,
    githubId
  );
}

/**
 * Merges test run steps from the database and Jira.
 * @param {Array<any>} dbTestRunSteps - The database test run steps.
 * @param {Array<any>} jiraTestRunSteps - The Jira test run steps.
 * @returns {Array<any>} - The merged test run steps.
 */
function mergeTestRunSteps(dbTestRunSteps: Array<any>, jiraTestRunSteps: Array<any>): Array<any> {
  if (dbTestRunSteps !== jiraTestRunSteps) {
      return jiraTestRunSteps; }
  else {
      return dbTestRunSteps;
  }
}

/**
 * Merges step definitions from the database and Jira.
 * @param {any} dbStepDefinitions - The database step definitions.
 * @param {any} jiraStepDefinitions - The Jira step definitions.
 * @returns {any} - The merged step definitions.
 */
function mergeStepDefinitions(dbStepDefinitions: any, jiraStepDefinitions: any): any {
  const mergedStepDefinitions = {};
  ['given', 'when', 'then', 'example'].forEach(stepType => {
    const dbSteps = dbStepDefinitions[stepType] || [];
    const jiraSteps = jiraStepDefinitions[stepType] || [];

    const allJiraInDb = jiraSteps.every((jiraStep: { id: any; }) => 
      dbSteps.some((dbStep: { id: any; }) => dbStep.id === jiraStep.id)
    );

    if (allJiraInDb) {
      mergedStepDefinitions[stepType] = dbSteps.map((dbStep: { id: any; }) => {
        const jiraStep = jiraSteps.find((jStep: { id: any; }) => jStep.id === dbStep.id);
        return jiraStep ? {...dbStep, ...jiraStep} : dbStep;
      });
    } else {
      mergedStepDefinitions[stepType] = [
        ...jiraSteps, 
        ...dbSteps.filter((dbStep: { id: any; }) => !jiraSteps.some((jStep: { id: any; }) => jStep.id === dbStep.id))
      ];
    }
  });

  return mergedStepDefinitions;
}

/**
 * Merges stories from the database and Jira.
 * @param {any} dbStory - The database story.
 * @param {any} jiraStory - The Jira story.
 * @returns {any} - The merged story.
 */
function mergeStories(dbStory: any, jiraStory: any): any {
  const mergedStory = { ...dbStory };
  const dbScenarios = dbStory.scenarios;
  const jiraScenarios = jiraStory.scenarios;

  const dbScenarioMap = new Map();
  dbScenarios.forEach((scenario: { scenario_id: any; }) => dbScenarioMap.set(scenario.scenario_id, scenario));

  const jiraScenarioMap = new Map();
  jiraScenarios.forEach((scenario: { scenario_id: any; }) => jiraScenarioMap.set(scenario.scenario_id, scenario));

  // inidicates if all xray jira scenarios are in db
  const allJiraInDb = jiraScenarios.every((jiraScenario: { scenario_id: any; }) => dbScenarioMap.has(jiraScenario.scenario_id));

  const mergedScenarios = [];

  // if all jira scenarios are in db, we keep db order and merge jira scenarios
  if (allJiraInDb) {
  
    dbScenarios.forEach((dbScenario: { scenario_id: any; stepDefinitions: any; testRunSteps: any[]; }) => {
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
    jiraScenarios.forEach((jiraScenario: { scenario_id: any; name: any; stepDefinitions: any; testRunSteps: any[]; testKey: any; }) => {
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
    dbScenarios.forEach((dbScenario: { scenario_id: any; }) => {
      if (!jiraScenarioMap.has(dbScenario.scenario_id)) {
        mergedScenarios.push(dbScenario);
      }
    });
  }

  mergedStory.scenarios = mergedScenarios;

  return mergedStory;
}

/**
 * Fuses a story with the database.
 * @param {any} story - The story to fuse.
 * @returns {Promise<any>} - A promise that resolves to the fused story.
 */
async function fuseStoryWithDb(story: any): Promise<any> {
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

/**
 * Exports a project to a zip file.
 * @param {string} repo_id - The repository ID.
 * @param {string} versionID - The version ID.
 * @returns {Promise<Buffer | null>} - A promise that resolves to the zip buffer or null if no repo is found.
 */
async function exportProject(repo_id: string, versionID: string): Promise<Buffer | null> {
  try {
    const repo = await mongo.getOneRepositoryById(repo_id);
    if (!repo?.stories) {
      console.log("No repo to corresonding ID found!");
      return null;
    }
    //Collect stories for export
    let exportStories = [];
    let keyStoryIds = []; //Needed for goup-story link
    for (const element of repo.stories) {
      let story = await mongo.getOneStory(element);
      if (!story) {
        throw new Error(`Story ${element} not found`);
      }
      keyStoryIds.push(story._id.toString());
      delete story._id;
      //story.story_id = index; Das ist die Git/Jira Story ID - lieber nicht entfernen
      exportStories.push(story);
    }

    //Collect blocks for export
    let repoBlocks = await mongo.getBlocks(repo_id);

    //Falls sich die getBlocks Blöcke wider Erwarten von den customBlocks in dem repo unterscheiden, müssen wir ggf. anders loopen und zwischenabfragen
    for (const element of repoBlocks) {
      delete element._id;
    }

    //Collect & adjust groups for export
    let repoGroups = [...repo.groups];
    for (const element of repoGroups) {
      delete element._id;
      //change memberStories references to indices
      for (
        let sub_index = 0;
        sub_index < element.member_stories.length;
        sub_index++
      ) {
        element.member_stories[sub_index] = keyStoryIds.indexOf(
          element.member_stories[sub_index]
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
/**
 * Checks for possible renaming suffixes and adds them if necessary.
 * @param {string} name - The original name.
 * @param {Array<string>} conflictingNameList - The list of conflicting names.
 * @returns {string} - The new name with a suffix if necessary.
 */
function checkAndAddSuffix(name: string, conflictingNameList: Array<string>): string {
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
/**
 * Finds the associated ID from a conflict list.
 * @param {string} name - The name to find the associated ID for.
 * @param {Array<any>} data - The conflict list data.
 * @returns {string | null} - The associated ID or null if not found.
 */
function findAssociatedID(name: string, data: Array<any>): string | null {
  for (const { conflictingName, associatedID } of data) {
    if (conflictingName === name) {
      return associatedID;
    }
  }
  return null; // Indicate ID not found
}

/**
 * Imports a project from a zip file.
 * @param {any} file - The zip file.
 * @param {string} [repo_id] - The repository ID.
 * @param {string} [projectName] - The project name.
 * @param {string} [importMode] - The import mode.
 * @returns {Promise<string>} - A promise that resolves to an empty string.
 */
async function importProject(file: any, repo_id?: string, projectName?: string, importMode?: string): Promise<string> {
  // Create a MongoDB client and start a session
  const client = await dbConnector.establishConnection();
  const session = client.startSession();
  const zip = new AdmZip(file.buffer);
  const importModeBool = importMode !== "false";
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

    const repoData = JSON.parse(zip.readAsText("repo.json"));
    const mappingData = JSON.parse(zip.readAsText("keyStoryIds.json"));
    const repoBlocksData = JSON.parse(zip.readAsText("repoBlocks.json"));
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
      console.log(existingStories);
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
        importModeBool
          ? "We are renaming."
          : "We are overwriting."
      );

      //Begin Transaction!
      await session.withTransaction(async (session: any) => {
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
          importModeBool,
          checkAndAddSuffix,
          findAssociatedID,
          client,
          file,
          allConflicts
        );

        await mongo.importBlocks(
          false,
          repo_id,
          repoData.repoName,
          session,
          existingNameList,
          repoBlocksData,
          importModeBool,
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
          importModeBool,
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
      await session.withTransaction(async (session: any) => {
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
        };
        
        await mongo.importStories(
          true,
          newRepo.toHexString(),
          session,
          storyFiles,
          groupMapping,
          existingNameList,
          importModeBool,
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
          importModeBool,
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
          importModeBool,
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

/**
 * Updates test sets in the database.
 * @param {Array<any>} testSets - The test sets to update.
 * @param {string} projectId - The repository ID.
 * @returns {Promise<void>} - A promise that resolves when the update is complete.
 */
async function updateTestSets(testSets: Array<any>, projectId: string): Promise<void> {
  // Get repository where groups should be updated
  const project = await mongoTs.getOneProjectById(projectId);

	for (const testSet of testSets) {
    // Case: Empty Test Set:
    if (testSet.tests.length === 0) {
      console.log(`No stories found for Xray Test Set ${testSet.testSetKey}. Skipping group creation.`);
      continue;
    }

		try {
			const storyIds = await getStorysByIssue(testSet.tests);
			// Find existing group by testSetKey
      let existingGroup = undefined;
      try{
        existingGroup = project.groups.find((group: { name: any; }) => group.name === testSet.testSetKey);
      } catch (error){
        console.log(`Project ${project.repoName} has no existing groups yet. Will create first.`);
      }			

			if (existingGroup) {
        // Update existing group
        const updatedGroup = { ...existingGroup, member_stories: storyIds }; 
        await mongo.updateStoryGroup(projectId, existingGroup._id.toString(), updatedGroup);
        console.log(`Updated group for Test Set: ${testSet.testSetKey}`);
      } else {
        // Create a new group if it does not exist
        await mongo.createStoryGroup(
          projectId,
          testSet.testSetKey,
          storyIds,
          true,
          testSet.xrayTestSet
          );
          console.log(`New Group created for Test Set: ${testSet.testSetKey}`);
        }
      } catch (e) {
        console.error(`Unexpected Error while processing Groups for Test Set: ${testSet.testSetKey}:`, e);
      }
  }
}

/**
 * Gets story IDs by issue keys.
 * @param {Array<string>} issueKeys - The issue keys.
 * @returns {Promise<Array<string>>} - A promise that resolves to an array of story IDs.
 */
async function getStorysByIssue(issueKeys: Array<string>): Promise<Array<string>> {
	try {
		const storiesIds = await mongo.getStoriesByIssueKeys(issueKeys);
		return storiesIds
	} catch (error) {
		console.error("Error fetching stories by issue keys:", error);
		return [];
	}
}

export = {
  getJiraRepos: fetchJiraProjects,
  dbProjects: getCustomProjects,
  uniqueRepositories,
  starredRepositories,
  ownRepositories,
  fuseStoryWithDb,
  exportProject,
  importProject,
  checkAndAddSuffix,
  findAssociatedID,
	updateTestSets,
  checkForXray
};
