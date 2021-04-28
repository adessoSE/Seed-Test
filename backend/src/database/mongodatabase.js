/* eslint-disable no-unused-vars */
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectID;
const emptyScenario = require('../models/emptyScenario');
const emptyBackground = require('../models/emptyBackground');

if (!process.env.NODE_ENV) {
  const dotenv = require('dotenv').config();
}

const uri = process.env.DATABASE_URI;
const dbName = 'Seed';
const userCollection = 'User';
const storiesCollection = 'TestStories';
const testreportCollection = 'TestReport';
const repositoriesCollection = 'TestRepositories'
const steptypesCollection = 'stepTypes'
const PwResetReqCollection = 'PwResetRequests'
const CustomBlocksCollection = 'CustomBlocks'
const WorkgroupsCollection = "TestWorkgroups"
// ////////////////////////////////////// API Methods /////////////////////////////////////////////
// async function createTTLIndex(){
//   let db = await connectDb()
//   let dbo = db.db(dbName);
//   let collection = await dbo.collection("PwResetRequests")
//   collection.createIndex({"createdAt": 1 }, { expireAfterSeconds: 3600 } )
//   db.close()
// }

async function createResetRequest(request) {
  let db;
  try {
    let db = await connectDb()
    let dbo = db.db(dbName);
    let collection = await dbo.collection(PwResetReqCollection)
    let result = await collection.insertOne(request)
    return result
  } catch (e) {
    console.log("UPS!!!!FEHLER im ResetRequest: " + e)
  } finally {
    if (db) db.close()
  }
}

async function getResetRequest(id) {
  let db;
  try {
    let db = await connectDb()
    let dbo = db.db(dbName);
    let collection = await dbo.collection(PwResetReqCollection)
    let result = await collection.findOne({ uuid: id })
    return result
  } catch (e) {
    console.log("UPS!!!! FEHLER in getResetRequest: " + e)
  } finally {
    if (db) db.close()
  }
}

async function getResetRequestByEmail(mail) {
  let db;
  try {
    let db = await connectDb()
    let dbo = db.db(dbName);
    let collection = await dbo.collection(PwResetReqCollection)
    let result = await collection.findOne({ email: mail })
    return result
  } catch (e) {
    console.log("UPS!!!! FEHLER in getResetRequestByEmail: " + e)
  } finally {
    if (db) db.close()
  }
}

async function deleteRequest(mail) {
  let db;
  try {
    let db = await connectDb()
    let dbo = db.db(dbName);
    let collection = await dbo.collection(PwResetReqCollection)
    let result = await collection.deleteOne({ email: mail })
    return result
  } catch (e) {
    console.log("UPS!!!! FEHLER in deleteRequest: " + e)
  } finally {
    if (db) db.close()
  }
}


async function registerUser(user) {
  let db = await connectDb()
  let dbo = db.db(dbName);
  let collection = await dbo.collection(userCollection)
  let dbUser = await getUserByEmail(user.email);
  let result;
  if (dbUser !== null) {
    throw Error('User already exists')
  } else {
    if (user.userId) {
      result = await collection.update({ _id: ObjectId(user.userId) }, { $set: { email: user.email, password: user.password } });
    } else {
      delete user.userId;
      result = await collection.insertOne(user);
    }
  }
  if (db) db.close()
  return result;
}

async function registerGithubUser(user) {
  let db;
  try {
    let db = await connectDb()
    let dbo = db.db(dbName);
    let collection = await dbo.collection(userCollection)
    let result = await collection.insertOne({ github: user });
    return result;
  } catch (e) {
    console.log("UPS!!!! FEHLER in registerGithubUser: " + e)
  } finally {
    if (db) db.close()
  }
}

async function mergeGithub(userId, login, id) {
  let db;
  try {
    let db = await connectDb()
    let dbo = db.db(dbName);
    let collection = await dbo.collection(userCollection)
    let githubAccount = await getUserByGithub(login, id)
    let seedAccount = await getUserById(userId);
    seedAccount.github = githubAccount.github;
    if (githubAccount.hasOwnProperty('jira') && !seedAccount.hasOwnProperty('jira')) {
      seedAccount.jira = githubAccount.jira;
    }

    if (githubAccount.email) {
      delete githubAccount.github
      await replaceUser(githubAccount, collection);
    } else {
      let deletedGithub = await deleteUser(githubAccount._id);
    }

    let result = await replaceUser(seedAccount, collection);
    return result;
  } catch (e) {
    console.log("UPS!!!! FEHLER in mergeGithub: " + e)
  } finally {
    if (db) db.close()
  }
}

async function getUserByEmail(email) {
  let db;
  try {
    let db = await connectDb()
    let dbo = await db.db(dbName)
    let collection = await dbo.collection(userCollection)
    let result = await collection.findOne({ email: email })
    return result
  } catch (e) {
    console.log("UPS!!!! FEHLER in getUserByEmail: " + e)
  } finally {
    if (db) db.close()
  }
}

async function getUserByGithub(login, id) {
  let db = await connectDb()
  let dbo = await db.db(dbName)
  let collection = await dbo.collection(userCollection)
  let result = await collection.findOne({ $and: [{ 'github.id': id }, { 'github.login': login }] })
  db.close();
  return result
}

async function getUserById(id) {
  let db = await connectDb()
  let dbo = await db.db(dbName)
  let collection = await dbo.collection(userCollection)
  let result = await collection.findOne({ _id: ObjectId(id) })
  db.close();
  return result
}

async function findOrRegister(user) {
  let result = await getUserByGithub(user.login, user.id)
  if (!result) {
    result = await registerGithubUser(user)
  } else {
    result = await updateGithubToken(result._id, user.githubToken)
  }
  return result
}

async function updateGithubToken(objId, updatedToken) {
  let db = await connectDb()
  let dbo = await db.db(dbName)
  let collection = await dbo.collection(userCollection)
  let user = await collection.updateOne({ "_id": ObjectId(objId) }, { $set: { 'github.githubToken': updatedToken } })
  db.close()
  return user
}

function connectDb() {
  return new Promise((resolve, reject) => {
    MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
      if (err) {
        reject(err);
      } else {
        resolve(db);
      }
    });
  });
}
function selectRepositoryCollection(db) {
  dbo = db.db(dbName);
  return new Promise((resolve, reject) => {
    dbo.collection(repositoriesCollection, (err, collection) => {
      if (err) {
        reject(err);
      } else {
        resolve(collection);
      }
    })
  })
}
function selectStoriesCollection(db) {
  dbo = db.db(dbName);
  return new Promise((resolve, reject) => {
    dbo.collection(storiesCollection, (err, collection) => {
      if (err) {
        reject(err);
      } else {
        resolve(collection);
      }
    })
  })
}
function selectUsersCollection(db) {
  dbo = db.db(dbName);
  return new Promise((resolve, reject) => {
    dbo.collection(userCollection, (err, collection) => {
      if (err) {
        reject(err);
      } else {
        resolve(collection);
      }
    })
  })
}

function findStory(storyId, storySource, collection) {

  const id = ObjectId(storyId)
  return new Promise((resolve, reject) => {
    collection.findOne({ _id: id, storySource: storySource }, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    })
  })
}


function replace(story, collection) {
  const myObjt = {
    _id: story._id,
    storySource: story.storySource,
  };
  return new Promise((resolve, reject) => {
    collection.findOneAndReplace(myObjt, story, { returnOriginal: false }, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result.value);
      }
    })
  })
}

async function disconnectGithub(user) {
  let db = await connectDb()
  let dbo = await db.db(dbName)
  let collection = await dbo.collection(userCollection)
  let removedUser = await replaceUser(user, collection);
  return removedUser;
}

function replaceUser(newUser, collection) {
  const myObjt = { _id: ObjectId(newUser._id) }
  return new Promise((resolve, reject) => {
    collection.findOneAndReplace(myObjt, newUser, { returnOriginal: false }, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result.value);
      }
    })
  })
}

async function updateStory(updatedStuff) {
  let db;
  try {
    db = await connectDb()
    let collection = await selectStoriesCollection(db)
    let story = await replace(updatedStuff, collection)
    return story
  } catch (e) {
    console.log("UPS!!!! FEHLER updateStory: " + e)
  } finally {
    if (db) db.close()
  }
}

// get One Story
async function getOneStory(storyId, storySource) {
  let db;
  try {
    db = await connectDb()
    let collection = await selectStoriesCollection(db)
    let story = await collection.findOne({ _id: ObjectId(storyId), storySource: storySource })
    // TODO remove later when all used stories have the tag storySource
    if (!story) {
      story = await collection.findOne({ _id: ObjectId(storyId), storySource: undefined })
    }
    return story
  } catch (e) {
    console.log("UPS!!!! FEHLER in getOneStory: " + e)
  } finally {
    if (db) db.close();
  }
}


async function getOneStoryByStoryId(storyId, storySource) {
  let db;
  try {
    db = await connectDb()
    let collection = await selectStoriesCollection(db)
    let story = await collection.findOne({ story_id: storyId, storySource: storySource })
    // TODO remove later when all used stories have the tag storySource
    if (!story) {
      story = await collection.findOne({ story_id: storyId, storySource: undefined })
    }
    return story
  } catch (e) {
    console.log("UPS!!!! FEHLER in getOneStoryByStoryId: " + e)
  } finally {
    if (db) db.close();
  }
}

// GET all  Steptypes
async function showSteptypes() {
  let db;
  try {
    db = await connectDb()
    dbo = db.db(dbName)
    let collection = await dbo.collection(steptypesCollection)
    let result = await collection.find({}).toArray()
    return result
  } catch (e) {
    console.log("UPS!!!! FEHLER in showSteptypes: " + e)
  } finally {
    if (db) db.close()
  }
}

// UPDATE Background
async function updateBackground(storyId, storySource, updatedBackground) {
  let db;
  try {
    db = await connectDb()
    let collection = await selectStoriesCollection(db)
    let story = await findStory(storyId, storySource, collection)
    story.background = updatedBackground;
    let result = await replace(story, collection)
    return result
  } catch (e) {
    console.log("UPS!!!! FEHLER in updateBackground: " + e)
  } finally {
    if (db) db.close()
  }
}

// DELETE Background
async function deleteBackground(storyId, storySource) {
  let db;
  try {
    db = await connectDb()
    let collection = await selectStoriesCollection(db)
    let story = await findStory(storyId, storySource, collection)
    story.background = emptyBackground();
    let result = await replace(story, collection)
    return result
  } catch (e) {
    console.log("UPS!!!! FEHLER in deleteBackground: " + e)
  } finally {
    if (db) db.close()
  }
}

async function createStory(storyTitel, storyDescription, repoId) {   
  let db;
  let iNumberArray = [];
  let finalIssueNumber = 0;
  try {
    db = await connectDb();
    let repoCollection = await selectRepositoryCollection(db);
    let collection = await selectStoriesCollection(db);
    let repo = await repoCollection.findOne({ _id: ObjectId(repoId) })
    if (repo) {
      if (repo.stories.length > 0) {
        for (let storyId of repo.stories) {
          let story = await collection.findOne({ _id: ObjectId(storyId) })
          iNumberArray.push(story.issue_number)
        }
        for (let i = 0; i <= iNumberArray.length; i++) {
          let included = iNumberArray.includes(i)
          if (!included) {
            finalIssueNumber = i;
            break;
          }
        }
      }
    } 
    let emptyStory = {
      story_id: 0,
      assignee: 'unassigned',
      title: storyTitel,
      body: storyDescription,
      issue_number: finalIssueNumber,
      background: emptyBackground(),
      scenarios: [emptyScenario()],
      storySource: 'db',
      repo_type: 'db',
      state: 'open',
      assignee_avatar_url: null,
      lastTestPassed: null,
    }
    let result = await collection.insertOne(emptyStory)
    return result.insertedId
  } catch (e) {
    console.log("UPS!!!! FEHLER in createStory: " + e)
  } finally {
    if (db) db.close()
  }
}

async function insertStoryIdIntoRepo(storyId, repoId) {
  let db;
  try {
    db = await connectDb()
    let collectionRepo = await selectRepositoryCollection(db)
    let resultRepo = await collectionRepo.findOneAndUpdate({ _id: ObjectId(repoId) }, { $push: { stories: { storyId } } })
    return resultRepo
  } catch (e) {
    console.log("UPS!!!! FEHLER in insertStoryIdIntoRepo: " + e)
  } finally {
    if (db) db.close()
  }
}

async function getAllStoriesOfRepo(ownerId, repoName, repoId) {
  let db
  let storiesArray = []
  try {
    db = await connectDb()
    let collectionRepo = await selectRepositoryCollection(db)
    let collectionStories = await selectStoriesCollection(db)
    let repo = await collectionRepo.findOne({ _id: ObjectId(repoId) })
    if (repo) {
      for (let entry of repo.stories) {
        let story = await collectionStories.findOne({ _id: ObjectId(entry) })
        storiesArray.push(story)
      }
    }
    return storiesArray
  } catch (e) {
    console.log("UPS!!!! FEHLER in getAllStoriesOfRepo: " + e)
  } finally {
    if (db) db.close()
  }
}

// CREATE Scenario
async function createScenario(storyId, storySource) {
  let db;
  try {
    db = await connectDb()
    let collection = await selectStoriesCollection(db)
    let story = await findStory(storyId, storySource, collection)
    const lastScenarioIndex = story.scenarios.length;
    const tmpScenario = emptyScenario();
    if (story.scenarios.length === 0) {
      story.scenarios.push(tmpScenario);
    } else {
      tmpScenario.scenario_id = story.scenarios[lastScenarioIndex - 1].scenario_id + 1;
      story.scenarios.push(tmpScenario);
    }
    await replace(story, collection)
    return tmpScenario
  } catch (e) {
    console.log("UPS!!!! FEHLER in createScenario: " + e)
  } finally {
    if (db) db.close()
  }
}

// DELETE Scenario
async function deleteScenario(storyId, storySource, scenarioID) {
  let db;
  try {
    db = await connectDb()
    let collection = await selectStoriesCollection(db)
    let story = await findStory(storyId, storySource, collection)
    for (let i = 0; i < story.scenarios.length; i++) {
      if (story.scenarios[i].scenario_id === scenarioID) {
        story.scenarios.splice(i, 1);
      }
    }
    let result = await replace(story, collection)
    db.close()
    return result
  } catch (e) {
    console.log("UPS!!!! FEHLER in deleteScenario: " + e)
  } finally {
    if (db) db.close()
  }
}

// POST Scenario
async function updateScenario(storyId, storySource, updatedScenario) {
  let db;
  try {
    db = await connectDb()
    let collection = await selectStoriesCollection(db)
    let story = await findStory(storyId, storySource, collection)
    for (const scenario of story.scenarios) {
      if (story.scenarios.indexOf(scenario) === story.scenarios.length) {
        story.scenarios.push(scenario);
        break;
      }
      if (scenario.scenario_id === updatedScenario.scenario_id) {
        story.scenarios.splice(story.scenarios.indexOf(scenario), 1, updatedScenario);
        break;
      }
    }
    let result = await replace(story, collection)
    return result
  } catch (e) {
    console.log("UPS!!!! FEHLER in updateScenario: " + e)
  } finally {
    if (db) db.close()
  }
}

//gets all Repositories of one user
async function getRepository(userID) {
  let db;
  try {
    const myObjt = { owner: ObjectId(userID) };
    db = await connectDb();
    let dbo = db.db(dbName);
    let wGCollection = await dbo.collection(WorkgroupsCollection)
    let repoCollection = await selectRepositoryCollection(db);
    let userCollection = await selectUsersCollection(db)
    let user = await userCollection.findOne({ _id: ObjectId(userID) })
    let positiveWorkgroups = await wGCollection.find({ Members: { $elemMatch: { email: user.email, canEdit: true } } }).toArray()
    let PWgArray = positiveWorkgroups.map(entry => ObjectId(entry.Repo))
    let PWgRepos = await repoCollection.find({ _id: { $in: PWgArray } }).toArray()
    PWgRepos.forEach(function (element) {
      element.canEdit = true;
    });
    let negativeWorkgroups = await wGCollection.find({ Members: { $elemMatch: { email: user.email, canEdit: false } } }).toArray()
    let NWgArray = negativeWorkgroups.map(entry => ObjectId(entry.Repo))
    let NWgRepos = await repoCollection.find({ _id: { $in: NWgArray } }).toArray()
    NWgRepos.forEach(function (element) {
      element.canEdit = false;
    });
    let result = await repoCollection.find(myObjt).toArray();
    result.forEach(function (element) {
      element.canEdit = true;
    });
    let finalResult = result.concat(PWgRepos, NWgRepos)
    return finalResult;
  } catch (e) {
    console.log("UPS!!!! FEHLER in getRepository" + e)
  } finally {
    if (db) db.close()
  }
}

//deletes all Repositories of own User
async function deleteRepositorys(ownerID) {
  let db;
  try {
    const myObjt = { owner: ObjectId(ownerID) };
    let db = await connectDb();
    let collection = await selectRepositoryCollection(db);
    let result = await collection.deleteMany(myObjt);
    return result;
  } catch (e) {
    console.log("UPS!!!! FEHLER in deleteRepositorys" + e)
  } finally {
    db.close();
  }
}

async function getOneRepository(ownerId, name) {
  try {
    const myObjt = { owner: ObjectId(ownerId), repoName: name };
    let db = await connectDb();
    let collection = await selectRepositoryCollection(db);
    let result = await collection.findOne(myObjt);
    db.close();
    return result;
  } catch (e) {
    console.log("UPS!!!! FEHLER in getOneRepository" + e)
  }
}

async function getOneGitRepository(name) {
  try {
    const myObjt = { repoName: name, repoType: "github" };
    let db = await connectDb();
    let collection = await selectRepositoryCollection(db);
    let result = await collection.findOne(myObjt);
    db.close();
    return result;
  } catch (e) {
    console.log("UPS!!!! FEHLER in getOneGitRepository" + e)
  }
}

async function createRepo(ownerId, name) {
  let emptyRepo = { owner: ownerId, repoName: name, stories: [], repoType: "db", customBlocks: [] }
  let db = await connectDb();
  let collection = await selectRepositoryCollection(db);
  let result = await collection.findOne({ owner: ObjectId(ownerId), repoName: name })
  if (result !== null) {
    return "Sie besitzen bereits ein Repository mit diesem Namen!"
  } else {
    collection.insertOne(emptyRepo);
  }
}

async function createJiraRepoIfNonenExists(repoName, source) {
  let db;
  try {
    db = await connectDb();
    let collection = await selectRepositoryCollection(db);
    let result = await collection.findOne({ repoName: repoName, repoType: source })
    if (result === null) {
      let myObjt = { owner: "", repoName: repoName, stories: [], repoType: source, customBlocks: [] }
      result = await collection.insertOne(myObjt)
      return result.insertedId
    } else {
      return result._id
    }
  } catch (e) {
    console.log("UPS!!!! FEHLER in createJiraRepoIfNonenExists" + e)
  } finally {
    db.close();
  }
}


async function createGitOwnerRepoIfNonenExists(ownerId, githubId, gOId, repoName, source) {
  let db;
  try {
    db = await connectDb();
    let collection = await selectRepositoryCollection(db);
    let result = await collection.findOne({ owner: ObjectId(ownerId), repoName: repoName })
    if (result === null) {
      let resu = await collection.findOne({ gitOwner: gOId, repoName: repoName })
      if (resu === null) {
        let myObjt = { owner: "", gitOwner: gOId, repoName: repoName, stories: [], repoType: source, customBlocks: [] }
        resu = await collection.insertOne(myObjt)
        return resu.insertedId
      } else {
        if (resu.gitOwner === githubId) resu.owner = ObjectId(ownerId)
        return resu._id
      }
    } else {
      return resu._id
    }
  } catch (e) {
    console.log("UPS!!!! FEHLER in createGitOwnerRepoIfNonenExists" + e)
  } finally {
    db.close();
  }
}


async function updateStoriesArrayInRepo(repoId, storiesArray) {
  let db
  try {
    db = await connectDb();
    let collection = await selectRepositoryCollection(db);
    return await collection.findOneAndUpdate({ _id: ObjectId(repoId) }, { $set: { stories: storiesArray } }, { returnNewDocument: true })
  } catch (e) {
    console.log("UPS!!!! FEHLER in updateStoriesArrayInRepo" + e)
  } finally {
    if (db) db.close()
  }
}


async function upsertEntry(storyId, updatedContent, storySource) {
  let db;
  try {
    const myObjt = {
      story_id: storyId,
      storySource: storySource,
    };
    db = await connectDb()
    let collection = await selectStoriesCollection(db)
    let result = await collection.findOneAndUpdate(myObjt, { $set: updatedContent }, {
      returnOriginal: false,
      upsert: false,
    })
    // TODO remove later when all used stories have the tag storySource
    if (!result.value) {
      myObjt.storySource = undefined;
      result = await collection.findOneAndUpdate(myObjt, { $set: updatedContent }, {
        returnOriginal: false,
        upsert: true,
      })
    }
    return result.value;
  } catch (e) {
    console.log("UPS!!!! FEHLER in upsertEntry: " + e)
  } finally {
    if (db) db.close()
  }
}

async function uploadReport(reportData) {
  let db;
  try {
    db = await connectDb()
    dbo = db.db(dbName)
    let collection = await dbo.collection(testreportCollection)
    let result = await collection.insertOne(reportData);
    db.close();
    return result;
  } catch (e) {
    console.log("UPS!!!! FEHLER in uploadReport", e)
  }
}

async function getReport(reportName) {
  let db;
  try {
    let report = { reportName }
    db = await connectDb()
    dbo = db.db(dbName)
    let collection = await dbo.collection(testreportCollection)
    let result = await collection.findOne(report);
    db.close();
    return result;
  } catch (e) {
    console.log("UPS!!!! FEHLER in getReport", e)
  }
}

// create User in DB needs JsonObject User returns JsonObject(user)
async function createUser(user) {
  let db;
  try {
    db = await connectDb()
    let collection = await selectUsersCollection(db)
    let result = await collection.insertOne(user)
    console.log(result.ops[0])
    return result
  } catch (e) {
    console.log("UPS!!!! FEHLER in createUser: " + e)
  } finally {
    if (db) db.close()
  }
}

// delete User in DB needs ID TODO: Chris alles überarbeiten!!!!
async function deleteUser(userID) {
  let db;
  try {
    oId = ObjectId(userID)
    const myObjt = { _id: oId }
    db = await connectDb()
    let collection = await selectUsersCollection(db);
    let collectionRepo = await selectRepositoryCollection(db);
    let collectionStories = await selectStoriesCollection(db);
    let repos = await collectionRepo.find({ owner: oId }).toArray();
    if (repos) {
      for (const repo of repos) {
        for (const storyID of repo.stories) {
          await collectionStories.deleteOne({ _id: ObjectId(storyID) });
        }
      }
      let resultRepo = await collectionRepo.deleteMany({ owner: oId });
      let resultUser = await collection.deleteOne(myObjt);
      return resultUser + resultRepo
    }
    return result

  } catch (e) {
    console.log("UPS!!!! FEHLER in deleteUser: " + e)
  } finally {
    if (db) db.close()
  }
}



// update a User in DB needs ID and JsonObject User returns altered JsonObject User
async function updateUser(userID, updatedUser) {
  let db;
  try {
    oId = ObjectId(userID)
    const myObjt = { _id: oId }
    db = await connectDb()
    let collection = await selectUsersCollection(db)
    let result = await collection.findOneAndReplace(myObjt, updatedUser, { returnOriginal: false })
    return result.value
  } catch (e) {
    console.log("UPS!!!! FEHLER in updateUser: " + e)
  } finally {
    if (db) db.close()
  }
}

//get UserData needs ID returns JsonObject User
async function getUserData(userID) {
  let db;
  try {
    const oId = ObjectId(userID);
    const myObjt = { _id: oId };
    db = await connectDb();
    let collection = await selectUsersCollection(db);
    let result = await collection.findOne(myObjt);
    return result
  } catch (e) {
    console.log("UPS!!!! FEHLERin getUserData: " + e)
  } finally {
    if (db) db.close()
  }
}

async function saveBlock(block) {
  let db;
  try {
    block.repositoryId = ObjectId(block.repositoryId);
    db = await connectDb();
    let dbo = db.db(dbName);
    let collection = await dbo.collection(CustomBlocksCollection)
    let result = await collection.insertOne(block)
    return result
  } catch (e) {
    console.log("UPS!!!! FEHLER in saveBlock: " + e)
  } finally {
    if (db) db.close()
  }
}

async function updateBlock(name, updatedBlock) {
  let db;
  const myObjt = { name: name };
  try {
    db = await connectDb()
    let dbo = db.db(dbName);
    let collection = await dbo.collection(CustomBlocksCollection)
    await collection.findOneAndReplace(myObjt, updatedBlock, { returnOriginal: false })
  } catch (e) {
    console.log("UPS!!!! FEHLER in updateBlock: " + e)
  } finally {
    if (db) db.close()
  }
}
//get all Blocks for designated Id need objectId returns Array with all found CustomBlocks
//async function getBlocksById(id, repo) {
//  //todo ObjectID
//  let db;
//  try {
//    db = await connectDb()
//    let dbo = db.db(dbName);
//    let collection = await dbo.collection(CustomBlocksCollection)
//    let result = await collection.find({ owner: id, repo: repo }).toArray()
//    return result
//  } catch (e) {
//    console.log("UPS!!!! FEHLER in getBlocksById: " + e)
//  } finally {
//    if (db) db.close()
//  }
//}
//get all Blocks by Id returns Array with all existing CustomBlocks
async function getBlocks(userId, repoId) {
  let db;
  try {
    db = await connectDb()
    let dbo = db.db(dbName);
    let collection = await dbo.collection(CustomBlocksCollection)
    let result = await collection.find({ repositoryId: ObjectId(repoId) }).toArray()
    return result
  } catch (e) {
    console.log("UPS!!!! FEHLER in getBlocks: " + e)
  } finally {
    if (db) db.close()
  }
}
//deletes the CustomBlock with the given Name, need the name
async function deleteBlock(blockId, userId) {
  let db;
  try {
    const myObjt = {
      _id: ObjectId(blockId),
      owner: ObjectId(userId)
    }
    db = await connectDb()
    let dbo = db.db(dbName);
    let collection = await dbo.collection(CustomBlocksCollection)
    let result = await collection.deleteOne(myObjt)
    //return result
  } catch (e) {
    console.log("UPS!!!! FEHLER in deleteBlock: " + e)
  } finally {
    if (db) db.close()
  }
}

async function addMember(id, user) {
  let db;
  try {
    db = await connectDb()
    let dbo = db.db(dbName)
    let wGCollection = await dbo.collection(WorkgroupsCollection)
    let check = await wGCollection.findOne({ Repo: ObjectId(id), Members: { $elemMatch: { email: user.email } } })
    if (check) return "Dieser User ist bereits in der Workgroup"
    let rCollection = await dbo.collection(repositoriesCollection)
    let repo = await rCollection.findOne({ _id: ObjectId(id) })
    let result = await wGCollection.findOne({ Repo: ObjectId(id) })
    if (!result) {
      await wGCollection.insertOne({ name: repo.repoName, Repo: ObjectId(id), Members: [{ email: user.email, canEdit: user.canEdit }] })
      result = await wGCollection.findOne({ Repo: ObjectId(id) })
      return result.Members
    } else {
      await wGCollection.findOneAndUpdate({ Repo: ObjectId(id) }, { $push: {Members: user} })
      result = await wGCollection.findOne({ Repo: ObjectId(id) })
      return result.Members
    }
  } catch (e) {
    console.log("UPS!!!! FEHLER in addMember: " + e)
  } finally {
    if (db) db.close()
  }
}

async function updateMemberStatus(repoId, user) {
  let db;
  try {
    db = await connectDb()
    let dbo = db.db(dbName)
    let wGCollection = await dbo.collection(WorkgroupsCollection)
    let updatedWG = await wGCollection.findOneAndUpdate({ Repo: ObjectId(repoId) }, { $set: { "Members.$[elem].canEdit": user.canEdit } }, { arrayFilters: [{ "elem.email": user.email }] })
    if (updatedWG){
      result = await wGCollection.findOne({ Repo: ObjectId(id) })
      return result.Members
    } 
  } catch (e) {
    console.log("UPS!!!! FEHLER in updateMemberStatus: " + e)
  } finally {
    if (db) db.close()
  }
}

async function getMembers(id) {
  let db;
  try {
    db = await connectDb()
    let dbo = db.db(dbName)
    let wGcollection = await dbo.collection(WorkgroupsCollection)
    let result = await wGcollection.findOne({ Repo: ObjectId(id) })
    if (!result) return []
    return result.Members
  } catch (e) {
    console.log("UPS!!!! FEHLER in getMembers: " + e)
  } finally {
    if (db) db.close()
  }
}

async function removeFromWorkgroup(id, user) {
  let db;
  try {
    db = await connectDb()
    let dbo = db.db(dbName)
    let wGcollection = await dbo.collection(WorkgroupsCollection)
    let result = await wGcollection.findOneAndUpdate({ Repo: id }, { $pull: { Members: { email: user.email } } })
    if (result) {
      result = await wGCollection.findOne({ Repo: ObjectId(id) })
      return result.Members
    }
  } catch (e) {
    console.log("UPS!!!! FEHLER in removeFromWorkgroup: " + e)
  } finally {
    if (db) db.close()
  }
}

module.exports = {
  getReport,
  uploadReport,
  disconnectGithub,
  mergeGithub,
  findOrRegister,
  getUserByGithub,
  getUserById,
  registerUser,
  getUserByEmail,
  showSteptypes,
  //createBackground,
  deleteBackground,
  updateBackground,
  createScenario,
  deleteScenario,
  updateScenario,
  createStory,
  insertStoryIdIntoRepo,
  getOneStory,
  getOneStoryByStoryId,
  upsertEntry,
  updateStory,
  createUser,
  deleteUser,
  updateUser,
  getUserData,
  createGitOwnerRepoIfNonenExists,
  createJiraRepoIfNonenExists,
  updateStoriesArrayInRepo,
  getRepository,
  getOneRepository,
  getOneGitRepository,
  getAllStoriesOfRepo,
  createRepo,
  selectStoriesCollection,
  connectDb,
  createResetRequest,
  getResetRequest,
  deleteRequest,
  getResetRequestByEmail,
  saveBlock,
  updateBlock,
  
  getBlocks,
  deleteBlock,
  addMember,
  updateMemberStatus,
  getMembers,
  removeFromWorkgroup,
};