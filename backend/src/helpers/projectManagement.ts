import mongo from "../../src/database/DbServices";
import dbConnector from "../../src/database/dbConnector";
import { jiraDecryptPassword } from "./userManagement";
import emptyScenario from "../../src/models/emptyScenario";
import emptyBackground from "../../src/models/emptyBackground";
import { writeFile } from "../../src/serverHelper";
import { XMLHttpRequest } from "xmlhttprequest";
import AdmZip from "adm-zip";
import path from "path";
import fetch from "node-fetch";

enum Sources {
  GITHUB = "github",
  JIRA = "jira",
  DB = "db",
}

class Group {
  _id: string;
  name: string;
  member_stories: Array<string>;
  isSequential: boolean;
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
async function requestJiraRepos(
  host: string,
  username: string,
  jiraClearPassword: string,
  authMethod: string
) {
  let authString: string = `Bearer ${jiraClearPassword}`;
  if (authMethod === "basic") {
    const auth = Buffer.from(`${username}:${jiraClearPassword}`).toString(
      "base64"
    );
    authString = `Basic ${auth}`;
  }
  console.log("auth ", authString);
  const reqoptions = {
    method: "GET",
    qs: {
      type: "page",
      title: "title",
    },
    headers: {
      "cache-control": "no-cache",
      Authorization: authString,
    },
  };
  // use GET /rest/api/2/project instead of GET /rest/api/2/issue/createmeta
  // https://docs.atlassian.com/software/jira/docs/api/REST/7.6.1/#api/2/project-getAllProjects
  return await fetch(`http://${host}/rest/api/2/project`, reqoptions)
    .then((response) => response.json())
    .then(async (json) => {
      const projects = [];
      for (const project of json) {
        projects.push(project["name"]);
      }
      return projects;
    })
    .catch((error) => {
      console.error(error);
      return [];
    });
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
    const request = new XMLHttpRequest(); // use fetch
    // get Issues from GitHub
    request.open("GET", link, true, user, password);
    request.send();
    request.onreadystatechange = async () => {
      if (request.readyState !== 4) return;
      //if (request.status == 401) resolve([]);
      //if (request.status == 403) resolve([]);
      if (request.status !== 200) {
        reject(request.status);
        return;
      }
      const data = JSON.parse(request.responseText);
      const projects = [];
      const gitReposFromDb = await mongo.getAllSourceReposFromDb("github");
      let mongoRepo;
      for (const repo of data) {
        // if this Repository is not in the DB create one in DB
        if (
          !gitReposFromDb.some((entry) => entry.repoName === repo.full_name)
        ) {
          mongoRepo = await mongo.createGitRepo(
            repo.owner.id,
            repo.full_name,
            githubId,
            ownerId
          );
        } else {
          mongoRepo = gitReposFromDb.find(
            (element) => element.repoName === repo.full_name
          ); // await mongo.getOneGitRepository(repo.full_name)
          if (mongoRepo.gitOwner === githubId)
            mongo.updateOwnerInRepo(mongoRepo._id, ownerId, mongoRepo.owner);
        }
        const repoName = repo.full_name;
        const proj = {
          _id: mongoRepo._id,
          value: repoName,
          source: "github",
        };
        projects.push(proj);
      }
      resolve(projects);
    };
  });
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
  if (story.storySource !== "jira")
    story.issue_number = parseInt(story.issue_number, 10);

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

async function importProject(file, repo_id?, projectName?, importMode?) {
  // Create a MongoDB client and start a session
  const client = await dbConnector.establishConnection();
  //client.runCommand( { killAllSessions: [] })
  const session = await client.startSession();
  console.log(session.inTransaction());
  const zip = new AdmZip(file.buffer);
  importMode == "false" ? (importMode = false) : (importMode = true);
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

    /* console.log(zip.getEntries().toString());
    console.log(storyFiles[0]);
    console.log(storyFiles.map((entry) => entry.entryName));
    console.log(groupFiles[0]);
    console.log(groupFiles.map((entry) => entry.entryName)); */

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
    console.log(repoData);
    const mappingJsonData = zip.readAsText("keyStoryIds.json");
    const mappingData = JSON.parse(mappingJsonData);
    console.log(mappingData);
    const repoBlocksJsonData = zip.readAsText("repoBlocks.json");
    const repoBlocksData = JSON.parse(repoBlocksJsonData);
    let groupMapping = [];
    //Needed for automatic renaming
    let existingNameList: String[] = [];

    //Füllen der KeyStoryIds in Array -> ArrayIndex für Gruppenzuweisung wichtig!
    for (const singularMapping of mappingData) {
      const mappingObject = {
        oldID: singularMapping,
        //To be filled during story creation process
        newID: "",
      };
      groupMapping.push(mappingObject);
    }
    // Function to insert newID based on oldID
    function insertNewId(oldID, newID) {
      for (const mapping of groupMapping) {
        if (mapping.oldID === oldID) {
          mapping.newID = newID;
          return; // Exit the loop after successful insertion
        }
      }
      console.error(
        `Mapping with oldID: ${oldID} not found for newID insertion.`
      );
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
      console.log(conflictingNameList);
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

    //Function to add stories
    async function importStories(
      post: Boolean,
      importRepo: String,
      allConflicts?
    ) {
      // Iterate through each story file
      for (const storyFile of storyFiles) {
        const storyData = zip.readAsText(storyFile.entryName);
        const storyObject = JSON.parse(storyData);
        let name = storyObject.title;
        if (!post && importMode) {
          name = checkAndAddSuffix(storyObject.title, existingNameList);
          storyObject.title = name;
        }

        if (post || importMode) {
          const newStory = await mongo.createStory(
            name,
            storyObject.body === null ? undefined : storyObject.body,
            importRepo
          );
          //Insert new ID corresponding to old one
          insertNewId(
            groupMapping[storyFiles.indexOf(storyFile)].oldID,
            newStory.toHexString()
          );
          //Get newly created StoryID and paste it into "old" story to replace newly generated one with same id
          storyObject._id = newStory;
          const importedStory = await mongo.updateStory(storyObject);
          const insertedId = await mongo.insertStoryIdIntoRepo(
            newStory,
            importRepo
          );
        }
        //Apply same logic for override
        if (!post && !importMode && findAssociatedID(name, allConflicts)) {
          storyObject._id = findAssociatedID(name, allConflicts);
          const importedStory = await mongo.updateStory(storyObject);
        }
      }
    }

      //RepoBlocks creation and assignment function
      async function importBlocks(
        post: Boolean,
        importRepo: String,
        repoName: String,
        allConflicts?
      ) {
        for (const singularBlock of repoBlocksData) {
          if (!post && importMode)
            singularBlock.name = checkAndAddSuffix(
              singularBlock.name,
              existingNameList
            );
          singularBlock.repository = repoName;
          singularBlock.repositoryId = importRepo;
          if (!post && !importMode && singularBlock._id) {
            singularBlock._id = findAssociatedID(
              singularBlock.name,
              allConflicts
            );
            await mongo.updateBlock(singularBlock._id, singularBlock);
          } else {
            await mongo.saveBlock(singularBlock);
          }
        }
      }

      //Group creation and assignment function
      // TODO: Ggf. Export anpassen -> Ersatz von StoryIds durch indices vermutlich unnötig
      async function importGroups(
        post: Boolean,
        importRepo: String,
        allConflicts?
      ) {
        for (const groupFile of groupFiles) {
          const groupData = zip.readAsText(groupFile.entryName);
          const groupObject = JSON.parse(groupData);
          for (let i = 0; i < groupObject.member_stories.length; i++) {
            groupObject.member_stories[i] =
              groupMapping[groupObject.member_stories[i]].newID;
          }
          let name = groupObject.name;
          if (!post && importMode)
            name = checkAndAddSuffix(name, existingNameList);
          if (!post && !importMode && findAssociatedID(name, allConflicts)) {
            groupObject._id = findAssociatedID(name, allConflicts);
            let oldGroup = await mongo.getOneStoryGroup(
              repo_id,
              groupObject._id
            );
            groupObject.member_stories = oldGroup.member_stories;
            const updatedGroup = await mongo.updateStoryGroup(
              repo_id,
              groupObject._id,
              groupObject
            );
            console.log("Group " + name + " has been updated: " + updatedGroup);
          } else {
            const newGroup = await mongo.createStoryGroup(
              importRepo,
              name,
              groupObject.member_stories,
              groupObject.isSequential
            );
            console.log("Group " + name + " inserted into: " + importRepo);
          }
        }
      }

      async function nameCheckStory() {
        let conflictingNames = [];
        const existingStories = await mongo.getAllStoriesOfRepo(repo_id);
        const existingNames = existingStories.map(({ title, _id }) => ({
          existingName: title,
          associatedID: _id.toHexString(),
        }));
        console.log(existingNames);
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
        console.log(existingNames);
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
        console.log(existingNames);
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
        //TODO: Return Array of Strings/Ids needed for name change? but needs async validator in frontend => still not final thought; as of now predetermined modes
        console.log("Performing a PUT request for an existing project");
        console.log(
          importMode == true
            ? "We are renaming. State: " + importMode
            : "We are overwriting. State: " + importMode
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

          await importStories(false, repo_id, allConflicts);
          await importBlocks(
            false,
            repo_id,
            await mongo.getOneRepositoryById(repo_id).repoName,
            allConflicts
          );
          await importGroups(false, repo_id, allConflicts);
        });

        return "";
      } else {
        // Perform a POST request for a new project
        console.log("Performing a POST request for a new project");

        //Begin Transaction!
        await session.withTransaction(async (session) => {
          //Create new repo with some exported information
          const newRepo = await mongo.createRepo(repoData.owner, projectName);
          if (
            typeof newRepo === "string" &&
            newRepo.startsWith(
              "Sie besitzen bereits ein Repository mit diesem Namen!"
            )
          ) {
            console.log("Repository already existing!");
            throw new Error(newRepo); // Throw an error with the message
          }
          await importStories(true, newRepo.toHexString());
          console.log(groupMapping);
          await importBlocks(true, newRepo.toHexString(), projectName);
          await importGroups(true, newRepo.toHexString());
        });

        return ""; //As we are in POST, we just return an empty String, e.g. no names have to be changed
      }
  } catch (error) {
    console.error("Import failed:", error);
    if (session.inTransaction()) {
      console.log(session);
      console.log(session.inTransaction());
      console.log("Import transaction is being aborted.");
      await session.abortTransaction();
      console.log(session.inTransaction());
    }
  } finally {
    await session.endSession();
    await client.close();
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
};
