/* eslint-disable no-unused-vars */
const { MongoClient } = require('mongodb');
var ObjectId = require('mongodb').ObjectID;
const fs = require('fs');
const path = require('path');
const emptyScenario = require('../models/emptyScenario');
const emptyBackground = require('../models/emptyBackground');
const stepTypes = require('./stepTypes.js');

if (!process.env.NODE_ENV) {
  const dotenv = require('dotenv').config();
}

const uri = process.env.DATABASE_URI;
// ////////////////////////////////////// API Methods /////////////////////////////////////////////


async function registerUser(user){
  let db = await connectDb()
  dbo = db.db('Seed');
  let collection = await dbo.collection('User')
  let dbUser = await getUserByEmail(user.email);
  let result;
  if(dbUser !== null){
    result = 'User already exists'
  } else {
   result = await collection.insertOne(user);
  }
  return result;
}

async function registerGithubUser(user){
  let db = await connectDb()
  dbo = db.db('Seed');
  let collection = await dbo.collection('User')
  let result = await collection.insertOne({github: user});
  return result;
}

async function mergeGithub(userId, login, id){
  console.log('login:', login, 'id:', id)
  let db = await connectDb()
  dbo = db.db('Seed');
  let collection = await dbo.collection('User')
  let githubAccount = await getUserByGithub(login, id)
  let seedAccount = await getUserById(userId);
  seedAccount.github = githubAccount.github;
  if(githubAccount.hasOwnProperty('jira') && !seedAccount.hasOwnProperty('jira') ){
    seedAccount.jira = githubAccount.jira;
  }
  let deletedGithub = await deleteUser(githubAccount._id);
  let result = await replaceUser(seedAccount, collection)

  return result;
}

async function getUserByEmail(email){
  let db = await connectDb()
  let dbo = await db.db('Seed')
  let collection = await dbo.collection('User')
  let result = await collection.findOne({email: email})
  db.close();
  return result
}

async function getUserByGithub(login, id){
  let db = await connectDb()
  let dbo = await db.db('Seed')
  let collection = await dbo.collection('User')
  let result = await collection.findOne({$and :[{'github.id': id}, {'github.login': login}]})
  db.close();
  return result
}

async function getUserById(id){
  let db = await connectDb()
  let dbo = await db.db('Seed')
  let collection = await dbo.collection('User')
  let result = await collection.findOne({_id: ObjectId(id)})
  console.log('getuserbyid: ' + id)
  db.close();
  return result
}

async function findOrRegister(user){
  let result = await getUserByGithub(user.login, user.id)
  if(!result) {
    result = await registerGithubUser(user)
  }else {
    result = await updateGithubToken(result._id, user.githubToken)
  }
  //console.log('getuserbyid: ' + JSON.stringify(result))
  return result
}

async function updateGithubToken(objId, updatedToken) {
  let db = await connectDb()
  let dbo = await db.db('Seed')
  let collection = await dbo.collection('User')
  let user = await collection.updateOne({"_id" : ObjectId(objId)}, {$set: { 'github.githubToken' : updatedToken}})
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

function selectStoriesCollection(db) {
  dbo = db.db('Seed');
  return new Promise((resolve, reject) => {
    dbo.collection('Stories', (err, collection) => {
      if (err) {
        reject(err);
      } else {
        resolve(collection);
      }
    })
  })
}
function selectUsersCollection(db) {
  dbo = db.db('Seed');
  return new Promise((resolve, reject) => {
    dbo.collection('User', (err, collection) => {
      if (err) {
        reject(err);
      } else {
        resolve(collection);
      }
    })
  })
}


async function updateStory(gitID, updatedStuff) {
  let db = await connectDb()
  let collection = await selectCollection(db)
  let story = await replace(gitID, updatedStuff, collection)
  db.close()
  console.log('story: ' + JSON.stringify(story))
  return story
}

function findStory(storyID, collection) {
  const myObjt = { story_id: storyID };
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

function replace(storyID, story, collection) {
  const myObjt = { story_id: storyID };
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

async function disconnectGithub(user){
  let db = await connectDb()
  let dbo = await db.db('Seed')
  let collection = await dbo.collection('User')
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

async function updateStory(gitID, updatedStuff) {
  let db = await connectDb()
  let collection = await selectStoriesCollection(db)
  let story = await replace(gitID, updatedStuff, collection)
  db.close()
  //console.log('story: ' + JSON.stringify(story))
  return story
}


// get One Story
async function getOneStory(storyID) {
  let db = await connectDb()
  let collection = await selectStoriesCollection(db)
  let story = await findStory(storyID, collection)
  db.close()
  return story
}

// GET all  Steptypes
async function showSteptypes() {
  let db = await connectDb()
  dbo = db.db('Seed')
  let collection = await dbo.collection('stepTypes')
  let result = await collection.find({}).toArray()
  db.close();
  return result
}

// Create Background
async function createBackground(storyID) {
  let db = await connectDb()
  let collection = await selectStoriesCollection(db)
  let story = await findStory(storyID, collection)
  const tmpBackground = emptyBackground();
  story.background = tmpBackground;
  let result = await replace(storyID, story, collection)
  db.close()
  return result
}

// UPDATE Background
async function updateBackground(storyID, updatedBackground) {
  let db = await connectDb()
  let collection = await selectStoriesCollection(db)
  let story = await findStory(storyID, collection)
  story.background = updatedBackground;
  let result = await replace(storyID, story, collection)
  db.close()
  return result
}

// DELETE Background
async function deleteBackground(storyID) {
  let db = await connectDb()
  let collection = await selectStoriesCollection(db)
  let story = await findStory(storyID, collection)
  story.background = emptyBackground();
  let result = await replace(storyID, story, collection)
  db.close()
  return result
}

// CREATE Scenario
async function createScenario(storyID) {
  let db = await connectDb()
  let collection = await selectStoriesCollection(db)
  let story = await findStory(storyID, collection)
  const lastScenarioIndex = story.scenarios.length;
  const tmpScenario = emptyScenario();
  if (story.scenarios.length === 0) {
    story.scenarios.push(tmpScenario);
  } else {
    tmpScenario.scenario_id = story.scenarios[lastScenarioIndex - 1].scenario_id + 1;
    story.scenarios.push(tmpScenario);
  }
  await replace(storyID, story, collection)
  db.close()
  return tmpScenario
}

// DELETE Scenario
async function deleteScenario(storyID, scenarioID) {
  let db = await connectDb()
  let collection = await selectStoriesCollection(db)
  let story = await findStory(storyID, collection)
  for (let i = 0; i < story.scenarios.length; i++) {
    if (story.scenarios[i].scenario_id === scenarioID) {
      story.scenarios.splice(i, 1);
    }
  }
  let result = await replace(storyID, story, collection)
  db.close()
  return result
}

// POST Scenario
async function updateScenario(storyID, updatedScenario) {
  let db = await connectDb()
  let collection = await selectStoriesCollection(db)
  let story = await findStory(storyID, collection)
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
  let result = await replace(storyID, story, collection)
  db.close()
  return result
}

async function upsertEntry(storyID, updatedContent) {
  const myObjt = { story_id: storyID };
  let db = await connectDb()
  let collection = await selectStoriesCollection(db)
  collection.findOneAndUpdate(myObjt, { $set: updatedContent }, {
    returnOriginal: false,
    upsert: true,
  }, (error) => {
    if (error) throw error;
    db.close();
  });
}

async function uploadReport(reportData) {
  try{
    let db = await connectDb()
    dbo = db.db('Seed')
    let collection = await dbo.collection('TestReport')
    let result = await collection.insertOne(reportData);
    db.close();
    return result;
  } catch (e) {
    console.log("UPS!!!! FEHLER", e)
  }
}

async function getReport(reportName) {
  try{
    let report = {reportName}
    let db = await connectDb()
    dbo = db.db('Seed')
    let collection = await dbo.collection('TestReport')
    let result = await collection.findOne(report);
    db.close();
    return result;
  } catch (e) {
    console.log("UPS!!!! FEHLER", e)
  }
}

// create User in DB needs JsonObject User returns JsonObject(user)
async function createUser(user) {
  try {
    let db = await connectDb()
    let collection = await selectUsersCollection(db)
    let result = await collection.insertOne(user)
    console.log(result.ops[0])
    db.close();
    return result
  } catch (e) {
    console.log("UPS!!!! FEHLER" + e)
  }
}

// delete User in DB needs ID
async function deleteUser(userID) {
  try {
    oId = ObjectId(userID)
    const myObjt = { _id: oId }
    let db = await connectDb()
    let collection = await selectUsersCollection(db)
    await collection.deleteOne(myObjt)
    db.close();
  } catch (e) {
    console.log("UPS!!!! FEHLER" + e)
  }
}
// update a User in DB needs ID and JsonObject User returns altered JsonObject User
async function updateUser(userID, updatedUser) {
  try {
    oId = ObjectId(userID)
    const myObjt = { _id: oId }
    let db = await connectDb()
    let collection = await selectUsersCollection(db)
    let result = await collection.findOneAndReplace(myObjt, updatedUser, { returnOriginal: false })
    db.close()
    return result.value
  } catch (e) {
    console.log("UPS!!!! FEHLER" + e)
  }
}

//get UserData needs ID returns JsonObject User
async function getUserData(userID) {
  try {
    const oId = ObjectId(userID);
    const myObjt = { _id: oId };
    let db = await connectDb();
    let collection = await selectUsersCollection(db);
    let result = await collection.findOne(myObjt);
    db.close();
    console.log(result)
    return result
  } catch (e) {
    console.log("UPS!!!! FEHLER" + e)
  }
}

// /////////////////////////////////////////// API Methods end ////////////////////////////////////////
// ///////////////////////////////////////////    ADMIN    ////////////////////////////////////////

// Creates Database Backupfile
async function writeBackup() {
  fs.writeFile(path.join('./dbbackups/dbbackup.json'), await createContent(), (err) => {
    if (err) throw err;
  });
}

async function createContent() {
  let collection = await getCollection()
  let data = '[\n'
  for (let i = 0; i < collection.length; i++) {
    if (collection[i] === collection[collection.length - 1]) {
      data += JSON.stringify(collection[i]) + '\n]'
    } else {
      data += JSON.stringify(collection[i]) + ',\n';
    }
  }
  return data;
}
//writeBackup()

// show all Collections
function getCollections() {
  MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
    if (err) throw err;
    const dbo = db.db('Seed');
    dbo.listCollections().toArray((error, result) => {
      if (error) throw error;
      console.log(`showMeCollections error: ${result}`);
      db.close();
    });
  });
}


// create Collection
function makeCollection(name) {
  MongoClient.connect(uri, { useNewUrlParser: true }, { useNewUrlParser: true }, (err, db) => {
    if (err) throw err;
    const dbo = db.db('Seed');
    dbo.createCollection(name, (error) => {
      if (error) throw error;
      console.log('Collection created!');
      db.close();
    });
  });
}

// insert One document (collectionname, {document})
function insertOne(collection, content) {
  MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
    if (err) throw err;
    const dbo = db.db('Seed');
    const myObjt = content;
    dbo.collection(collection).insertOne(myObjt, (error) => {
      if (error) throw error;
      db.close();
    });
  });
}

// show content of a specific collection
async function getCollection() {
  let db = await connectDb()
  let collection = await selectStoriesCollection(db)
  let result = await collection.find({}).toArray()
  db.close()
  return result
}



// insert Many documents ("collectionname", [{documents},{...}] )
function insertMore(name, content) {
  MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
    if (err) throw err;
    const dbo = db.db('Seed');
    const myObjt = content;
    dbo.collection(name).insertMany(myObjt, (error, res) => {
      if (error) throw error;
      console.log(`Number of documents inserted: ${res.insertedCount}`);
      db.close();
    });
  });
}


function update(storyID, updatedStuff) {
  MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
    if (err) throw err;
    const dbo = db.db('Seed');
    dbo.collection(collection).updateOne({ story_id: storyID }, { $set: updatedStuff }, (error, res) => {
      if (error) throw error;
      db.close();
    });
  });
}

// doesnt work yet
function eraseAllStories() {
  MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
    if (err) throw err;
    const dbo = db.db('Seed');
    dbo.collection(collection).deleteOne({}, (error) => {
      if (error) throw error;
      db.close();
    });
  });
}


// shows single story
function showStory(storyID) {
  MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
    if (err) throw err;
    const dbo = db.db('Seed');
    const myObjt = { story_id: storyID };
    dbo.collection(collection).findOne(myObjt, (error, result) => {
      if (error) throw error;
      console.log(`showStory error: ${result}`);
      db.close();
    });
  });
}

// delete collection
function dropCollection() {
  MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
    if (err) throw err;
    const dbo = db.db('Seed');
    dbo.collection(collection).drop((error, delOK) => {
      if (error) throw error;
      if (delOK) console.log('Collection deleted');
      db.close();
    });
  });
}

function installDatabase() {
  makeCollection(collection);
  insertMore('stepTypes', stepTypes());
}

module.exports = {
  getReport,
  uploadReport,
  disconnectGithub,
  mergeGithub,
  findOrRegister,
  getUserByGithub,
  updateStory,
  getUserById,
  registerUser,
  getUserByEmail,
  showSteptypes,
  createBackground,
  deleteBackground,
  updateBackground,
  createScenario,
  deleteScenario,
  updateScenario,
  getOneStory,
  upsertEntry,
  installDatabase,
  updateStory,
  createUser,
  deleteUser,
  updateUser,
  getUserData
};
