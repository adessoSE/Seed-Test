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
  let db;
  try {
    let db = await connectDb()
    let dbo = db.db(dbName);
    let collection = await dbo.collection(userCollection)
    let dbUser = await getUserByEmail(user.email);
    let result;
    if (dbUser !== null) {
      result = 'User already exists'
    } else {
      result = await collection.insertOne(user);
    }
    return result;
  } catch (e) {
    console.log("UPS!!!! FEHLER in registerUser: " + e)
  } finally {
    if (db) db.close()
  }
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
    let deletedGithub = await deleteUser(githubAccount._id);
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
  const myObjt = {
    _id: Object(storyId),
    storySource: storySource
  };
  return new Promise((resolve, reject) => {
    collection.findOne(myObjt, (err, result) => {
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
    story_id: story.story_id,
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
    let story = await findStory(storyId, storySource, collection)

    // TODO remove later when all used stories have the tag storySource
    if (!story) {
      story = await findStory(storyId, undefined, collection)
    }
    return story
  } catch (e) {
    console.log("UPS!!!! FEHLER in getOneStory: " + e)
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

// Create Background
//async function createBackground(storyId, storySource) {
//  let db;
//  try {
//    db = await connectDb()
//    let collection = await selectStoriesCollection(db)
//    let story = await findStory(storyId, storySource, collection)
//    const tmpBackground = emptyBackground();
//    story.background = tmpBackground;
//    let result = await replace(story, collection)
//    return result
//  } catch (e) {
//    console.log("UPS!!!! FEHLER: " + e)
//  } finally {
//    if(db) db.close()
//  }
//}

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

async function createStory(storyTitel, storyDescription) {        //, asigneeEmail
  let db;
  try {
    db = await connectDb();
    let collection = await selectStoriesCollection(db);
    let emptyStory = {
      story_id: '',
      asignee: '',
      titel: storyTitel,
      body: storyDescription,
      background: emptyBackground(),
      scenarios: [],
      storySource: 'db',
      repo_type: 'db',
      state: 'open',
      lastTestPassed: null,
    }
    let result = await collection.insertOne(emptyStory)
    console.log("Die Id der neuen Story ist: " + result.insertedId)
    return result.insertedId
  } catch (e) {
    console.log("UPS!!!! FEHLER in createStory: " + e)
  } finally {
    if (db) db.close()
  }
}

async function insertStoryIdIntoRepo(ownerId, repoName, storyId) {
  let db;
  try {
    db = await connectDb()
    let collectionRepo = await selectRepositoryCollection(db)
    let resultRepo = await collectionRepo.findOne({ owner: Object(ownerId), repoName: repoName })
    resultRepo.stories.push(storyId)
    let result = await collectionRepo.findOneAndUpdate({ owner: Object(ownerId), repoName: repoName }, { $set: resultRepo })
    return result
  } catch (e) {
    console.log("UPS!!!! FEHLER in insertStoryIdIntoRepo: " + e)
  } finally {
    if (db) db.close()
  }
}

async function getAllStoriesOfRepo(ownerId, repoName){
  let db
  let storiesArray = []
  try{
    db = await connectDb()
    let collectionRepo = await selectRepositoryCollection(db)
    let collectionStories = await selectStoriesCollection(db)
    let repo = await collectionRepo.findOne({owner: Object(ownerId), repoName: repoName})
    for(entry of repo.stories) {
      let story = await collectionStories.findOne( {_id: Object(entry)} )
      storiesArray.push(story)
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


async function createRepoIfNonenExists(ownerId, repoName, source) {
  let db;
  try {
    db = await connectDb();
    let collection = await selectRepositoryCollection(db);
    let result = await collection.findOne({ owner: Object(ownerId), repoName: repoName })
    if (result === null) {
      myObjt = { owner: ownerId, repoName: repoName, stories: [], repoType: source, customBlocks: [] }
      result = await collection.insertOne(myObjt)
      return result.insertedId
    } else {
      return result._id
    }
  } catch (e) {
    console.log("UPS!!!! FEHLER in createRepoIfNonenExists" + e)
  } finally {
    db.close();
  }
}

async function updateStoriesArrayInRepo(repoId, storiesArray) {
  let db
  try {
    db = await connectDb();
    let collection = await selectRepositoryCollection(db);
    let result = await collection.findOneAndUpdate({ _id: Object(repoId) }, { $set: { stories: storiesArray } }, { returnNewDocument: true })
    return result
  } catch (e) {
    console.log("UPS!!!! FEHLER in updateStoriesArrayInRepo" + e)
  } finally {
    if (db) db.close()
  }
}

//gets all Repositories of one user
async function getRepository(userID) {
  let db;
  try {
    const myObjt = { owner: Object(userID) };
    db = await connectDb();
    let collection = await selectRepositoryCollection(db);
    let result = await collection.find(myObjt).toArray();
    db.close();
    return result;
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
    const myObjt = { owner: Object(ownerID) };
    let db = await connectDb();
    let collection = await selectRepositoryCollection(db);
    let result = await collection.deleteMany(myObjt);
    db.close();
    return result;
  } catch (e) {
    console.log("UPS!!!! FEHLER in deleteRepositorys" + e)
  } finally {
    db.close();
  }
}

async function getOneRepository(ownerId, name) {
  try {
    const myObjt = {owner: Object(ownerId), name: name };
    let db = await connectDb();
    let collection = await selectRepositoryCollection(db);
    let result = await collection.findOne(myObjt);
    db.close();
    return result;
  } catch (e) {
    console.log("UPS!!!! FEHLER in getOneRepository" + e)
  }
}

async function createRepo(ownerId, name) {
  let emptyRepo = { owner: ownerId, repoName: name, stories: [], repoType: "db", customBlocks: [] } //{ 'name': name, 'owner': Object(ownerId), 'sotries': [] };
  let db = await connectDb();
  let collection = await selectRepositoryCollection(db);
  let result = await collection.findOne({ owner: Object(ownerId), repoName: name })
  if (result !== null) {
    return "Sie besitzen bereits ein Repository mit diesem Namen!"
  } else {
    collection.insertOne(emptyRepo);
  }
}

// async function addIssue(issue, name) {
//   try {
//     const myObjt = { name: name };
//     let db = await connectDb();
//     let collection = await selectRepositoryCollection(db);
//     let result = await collection.findOne(myObjt);
//     let issues = result.issues;
//     let highest = 0
//     if (issues.length > 0) {
//       issues.forEach((issue) => {
//         if (issue.id > highest) {
//           highest = issue.id;
//         }
//       })
//     }
//     issue.id = highest + 1;
//     issues[issue.id] = issue;
//     result.issues = issues;
//     collection.findOneAndUpdate(myObjt, { $set: result }, {
//       returnOriginal: false,
//       upsert: true,
//     }, (error) => {
//       if (error) throw error;
//       db.close();
//     });
//     db.close();
//     return result;
//   } catch (e) {
//     console.log("UPS!!!! FEHLER in addIssue" + e)
//   }
// }

async function upsertEntry(storyId, updatedContent, storySource) {
  let db;
  try {
    const myObjt = {
      _id: Object(storyId),
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
    return result;
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
async function deleteUser(userID, storyId, source) {
  let db;
  try {
    oId = ObjectId(userID)
    const myObjt = { _id: oId }
    db = await connectDb()
    let collection = await selectUsersCollection(db);
    let collection2 = await selectRepositoryCollection(db);
    let collection3 = await selectStoriesCollection(db);
    let resultUser = await collection.deleteOne(myObjt);
    let resultRepo = await collection2.deleteMany({ owner: oId });
    let resultScenario = await collection3.deleteMany({ story_id: storyId, storySource: source });
    let result = resultUser + resultRepo + resultScenario
    console.log(result)
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
    db = await connectDb()
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
async function getBlocksById(id, repo) {
  //todo ObjectID
  let db;
  try {
    db = await connectDb()
    let dbo = db.db(dbName);
    let collection = await dbo.collection(CustomBlocksCollection)
    let result = await collection.find({ owner: id, repo: repo }).toArray()
    return result
  } catch (e) {
    console.log("UPS!!!! FEHLER in getBlocksById: " + e)
  } finally {
    if (db) db.close()
  }
}
//get all Blocks by Id returns Array with all existing CustomBlocks
async function getBlocks(userId) {
  let db;
  try {
    db = await connectDb()
    let dbo = db.db(dbName);
    let collection = await dbo.collection(CustomBlocksCollection)
    let result = await collection.find({ owner: userId }).toArray()
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
  upsertEntry,
  updateStory,
  createUser,
  deleteUser,
  updateUser,
  getUserData,
  createRepoIfNonenExists,
  updateStoriesArrayInRepo,
  getRepository,
  getOneRepository,
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
  getBlocksById,
  getBlocks,
  deleteBlock,
};