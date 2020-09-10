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
let db_name = 'Seed'
// ////////////////////////////////////// API Methods /////////////////////////////////////////////


async function registerUser(user){
  let db = await connectDb()
  dbo = db.db(db_name);
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
  dbo = db.db(db_name);
  let collection = await dbo.collection('User')
  let result = await collection.insertOne({github: user});
  return result;
}

async function mergeGithub(userId, login, id){
  console.log('login:', login, 'id:', id)
  let db = await connectDb()
  dbo = db.db(db_name);
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
  let dbo = await db.db(db_name)
  let collection = await dbo.collection('User')
  let result = await collection.findOne({email: email})
  db.close();
  return result
}

async function getUserByGithub(login, id){
  let db = await connectDb()
  let dbo = await db.db(db_name)
  let collection = await dbo.collection('User')
  let result = await collection.findOne({$and :[{'github.id': id}, {'github.login': login}]})
  db.close();
  return result
}

async function getUserById(id){
  let db = await connectDb()
  let dbo = await db.db(db_name)
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
  return result
}

async function updateGithubToken(objId, updatedToken) {
  let db = await connectDb()
  let dbo = await db.db(db_name)
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
function selectRepositoryCollection(db) {
  dbo = db.db('Seed');
  return new Promise((resolve, reject) => {
    dbo.collection('Repositories', (err, collection) => {
      if (err) {
        reject(err);
      } else {
        resolve(collection);
      }
    })
  })
}
function selectStoriesCollection(db) {
  dbo = db.db(db_name);
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
  dbo = db.db(db_name);
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

// TODO: delete this? , because there is another "upadateStory"
async function updateStory(story_id, updatedStuff) {
  let db = await connectDb()
  let collection = await selectCollection(db)
  let story = await replace(story_id, updatedStuff, collection)
  db.close()
  console.log('story: ' + JSON.stringify(story))
  return story
}

function findStory(story_id, collection) {
  const myObjt = { story_id: story_id };
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

function replace(story_id, story, collection) {
  const myObjt = { story_id: story_id };
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
  let dbo = await db.db(db_name)
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

async function updateStory(story_id, updatedStuff) {
  let db;
  try {
    db = await connectDb()
    let collection = await selectStoriesCollection(db)
    let story = await replace(story_id, updatedStuff, collection)
    return story
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  } finally {
    if(db) db.close()
  }
}

// get One Story
async function getOneStory(story_id) {
  let db;
  try {
    db = await connectDb()
    let collection = await selectStoriesCollection(db)
    let story = await findStory(story_id, collection)
    return story
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  } finally {
    if(db) db.close();
  }
}

// GET all  Steptypes
async function showSteptypes() {
  let db;
  try {
    db = await connectDb()
    dbo = db.db(db_name)
    let collection = await dbo.collection('stepTypes')
    let result = await collection.find({}).toArray()
    return result
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  } finally {
    if(db) db.close()
  }
}

// Create Background
async function createBackground(story_id) {
  let db;
  try {
    db = await connectDb()
    let collection = await selectStoriesCollection(db)
    let story = await findStory(story_id, collection)
    const tmpBackground = emptyBackground();
    story.background = tmpBackground;
    let result = await replace(story_id, story, collection)
    return result
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  } finally {
    if(db) db.close()
  }
}

// UPDATE Background
async function updateBackground(story_id, updatedBackground) {
  let db;
  try {
    db = await connectDb()
    let collection = await selectStoriesCollection(db)
    let story = await findStory(story_id, collection)
    story.background = updatedBackground;
    let result = await replace(story_id, story, collection)
    return result
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  } finally {
    if(db) db.close()
  }
}

// DELETE Background
async function deleteBackground(story_id) {
  let db;
  try {
    db = await connectDb()
    let collection = await selectStoriesCollection(db)
    let story = await findStory(story_id, collection)
    story.background = emptyBackground();
    let result = await replace(story_id, story, collection)
    return result
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  } finally {
    if(db) db.close()
  }
}

// CREATE Scenario
async function createScenario(story_id) {
  let db;
  try {
    db = await connectDb()
    let collection = await selectStoriesCollection(db)
    let story = await findStory(story_id, collection)
    const lastScenarioIndex = story.scenarios.length;
    const tmpScenario = emptyScenario();
    if (story.scenarios.length === 0) {
      story.scenarios.push(tmpScenario);
    } else {
      tmpScenario.scenario_id = story.scenarios[lastScenarioIndex - 1].scenario_id + 1;
      story.scenarios.push(tmpScenario);
    }
    await replace(story_id, story, collection)
    return tmpScenario
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  } finally {
    if(db) db.close()
  }
}

// DELETE Scenario
async function deleteScenario(story_id, scenarioID) {
  let db;
  try {
    db = await connectDb()
    let collection = await selectStoriesCollection(db)
    let story = await findStory(story_id, collection)
    for (let i = 0; i < story.scenarios.length; i++) {
      if (story.scenarios[i].scenario_id === scenarioID) {
        story.scenarios.splice(i, 1);
      }
    }
    let result = await replace(story_id, story, collection)
    db.close()
    return result
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  } finally {
    if(db) db.close()
  }
}

// POST Scenario
async function updateScenario(story_id, updatedScenario) {
  let db;
  try {
    db = await connectDb()
    let collection = await selectStoriesCollection(db)
    let story = await findStory(story_id, collection)
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
    let result = await replace(story_id, story, collection)
    db.close()
    return result
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  } finally {
    if(db) db.close()
  }
}

//get UserData needs ID returns JsonObject User
async function getRepository(userID) {
  try {
    const myObjt = { owner: userID };
    let db = await connectDb();
    let collection = await selectRepositoryCollection(db);
    let result = await collection.find(myObjt).toArray();
    db.close();
    return result;
  } catch (e) {
    console.log("UPS!!!! FEHLER" + e)
  }
}

async function getOneRepository(name) {
  try {
    const myObjt = { name: name};
    let db = await connectDb();
    let collection = await selectRepositoryCollection(db);
    let result = await collection.findOne(myObjt);
    db.close();
    return result;
  } catch (e) {
    console.log("UPS!!!! FEHLER" + e)
  }
}

async function insertEntry(email, name){
  const myObjt = { 'name': name, 'owner': email, 'issues': { } };
  let db = await connectDb();
  let collection = await selectRepositoryCollection(db);
  collection.insertOne(myObjt);
}

async function addIssue(issue, name){
  try {
    const myObjt = { name: name};
    let db = await connectDb();
    let collection = await selectRepositoryCollection(db);
    let result = await collection.findOne(myObjt);
    let issues = result.issues;
    issues[issue.id] = issue;
    result.issues = issues;
    collection.findOneAndUpdate(myObjt, { $set: result }, {
      returnOriginal: false,
      upsert: true,
    }, (error) => {
      if (error) throw error;
      db.close();
    });
    db.close();
    return result;
  } catch (e) {
    console.log("UPS!!!! FEHLER" + e)
  }
}

async function upsertEntry(story_id, updatedContent) {
  let db;
  try {
    const myObjt = { story_id: story_id };
    db = await connectDb()
    let collection = await selectStoriesCollection(db)
    collection.findOneAndUpdate(myObjt, { $set: updatedContent }, {
      returnOriginal: false,
      upsert: true,
    })
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  } finally {
    if(db) db.close()
  }
}

async function uploadReport(reportData) {
  let db;
  try{
    db = await connectDb()
    dbo = db.db(db_name)
    let collection = await dbo.collection('TestReport')
    let result = await collection.insertOne(reportData);
    db.close();
    return result;
  } catch (e) {
    console.log("UPS!!!! FEHLER", e)
  }
}

async function getReport(reportName) {
  let db;
  try{
    let report = {reportName}
    db = await connectDb()
    dbo = db.db(db_name)
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
  let db;
  try {
    db = await connectDb()
    let collection = await selectUsersCollection(db)
    let result = await collection.insertOne(user)
    console.log(result.ops[0])
    return result
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  } finally {
    if(db) db.close()
  }
}

// delete User in DB needs ID
async function deleteUser(userID) {
  let db;
  try {
    oId = ObjectId(userID)
    const myObjt = { _id: oId }
    db = await connectDb()
    let collection = await selectUsersCollection(db)
    await collection.deleteOne(myObjt)
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  } finally {
    if(db) db.close()
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
    console.log("UPS!!!! FEHLER: " + e)
  } finally {
    if(db) db.close()
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
    db.close();
    console.log(result)
    return result
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  } finally {
    if(db) db.close()
  }
}






// /////////////////////////////////////////// API Methods end ////////////////////////////////////////
// ///////////////////////////////////////////    ADMIN    ////////////////////////////////////////////




// Please keep in mind that when you change the stepDefs in the Database with this function, you also have to apply that change manualy in the stepdefs.js in features/step_definitions
// if "story_id" Parameter is null: Updates "pre" Stepdefinitions in the "Stories" Collection and sets each step to outdated: true
// else: Updates "pre" Stepdefinitions in the selected Story and sets each step to outdated: true
async function updatePreStepsInOneStory(oldText, newText, story_id) {
  let myObjt
  if (story_id == null) {
    myObjt = {}
  } else {
    myObjt = { story_id: story_id }
  }
  try {
    let db = await connectDb()
    let collection = await selectStoriesCollection(db)
    await collection.updateMany(myObjt, { $set: { "background.stepDefinitions.when.$[elem].outdated": true } }, { arrayFilters: [{ "elem.pre": oldText }], upsert: true })
    await collection.updateMany(myObjt, { $set: { "scenarios.$[].stepDefinitions.given.$[elem].outdated": true } }, { arrayFilters: [{ "elem.pre": oldText }], upsert: true })
    await collection.updateMany(myObjt, { $set: { "scenarios.$[].stepDefinitions.when.$[elem].outdated": true } }, { arrayFilters: [{ "elem.pre": oldText }], upsert: true })
    await collection.updateMany(myObjt, { $set: { "scenarios.$[].stepDefinitions.then.$[elem].outdated": true } }, { arrayFilters: [{ "elem.pre": oldText }], upsert: true })
    await collection.updateMany(myObjt, { $set: { "background.stepDefinitions.when.$[elem].pre": newText } }, { arrayFilters: [{ "elem.pre": oldText }] })
    await collection.updateMany(myObjt, { $set: { "scenarios.$[].stepDefinitions.given.$[elem].pre": newText } }, { arrayFilters: [{ "elem.pre": oldText }] })
    await collection.updateMany(myObjt, { $set: { "scenarios.$[].stepDefinitions.when.$[elem].pre": newText } }, { arrayFilters: [{ "elem.pre": oldText }] })
    await collection.updateMany(myObjt, { $set: { "scenarios.$[].stepDefinitions.then.$[elem].pre": newText } }, { arrayFilters: [{ "elem.pre": oldText }] })
    db.close()
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  }
}

function fib(zahl) {
  if (zahl = 0) {
    return 0;
  } if (zahl = 1) {
    return 1;
  } else {
    return (zahl - 1) + (zahl - 2);
  }
}


// Please keep in mind that when you change the stepDefs in the Database with this function, you also have to apply that change manualy in the stepdefs.js in features/step_definitions
// if "story_id" Parameter is null: Updates "mid" Stepdefinitions in the "Stories" Collection and sets each step to outdated: true
// else: Updates "mid" Stepdefinitions in the selected Story and sets each step to outdated: true
async function updateMidStepsInOneStory(oldText, newText, story_id) {
  let myObjt
  if (story_id == null) {
    myObjt = {}
  } else {
    myObjt = { story_id: story_id }
  }
  try {
    let db = await connectDb()
    let collection = await selectStoriesCollection(db)
    await collection.updateMany(myObjt, { $set: { "background.stepDefinitions.when.$[elem].outdated": true } }, { arrayFilters: [{ "elem.mid": oldText }], upsert: true })
    await collection.updateMany(myObjt, { $set: { "scenarios.$[].stepDefinitions.given.$[elem].outdated": true } }, { arrayFilters: [{ "elem.mid": oldText }], upsert: true })
    await collection.updateMany(myObjt, { $set: { "scenarios.$[].stepDefinitions.when.$[elem].outdated": true } }, { arrayFilters: [{ "elem.mid": oldText }], upsert: true })
    await collection.updateMany(myObjt, { $set: { "scenarios.$[].stepDefinitions.then.$[elem].outdated": true } }, { arrayFilters: [{ "elem.mid": oldText }], upsert: true })
    await collection.updateMany(myObjt, { $set: { "background.stepDefinitions.when.$[elem].mid": newText } }, { arrayFilters: [{ "elem.mid": oldText }] })
    await collection.updateMany(myObjt, { $set: { "scenarios.$[].stepDefinitions.given.$[elem].mid": newText } }, { arrayFilters: [{ "elem.mid": oldText }] })
    await collection.updateMany(myObjt, { $set: { "scenarios.$[].stepDefinitions.when.$[elem].mid": newText } }, { arrayFilters: [{ "elem.mid": oldText }] })
    await collection.updateMany(myObjt, { $set: { "scenarios.$[].stepDefinitions.then.$[elem].mid": newText } }, { arrayFilters: [{ "elem.mid": oldText }] })
    let result = await findStory(story_id, collection)
    db.close()
    return result
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  }
}

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
    const dbo = db.db(db_name);
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
    const dbo = db.db(db_name);
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
    const dbo = db.db(db_name);
    const myObjt = content;
    dbo.collection(collection).insertOne(myObjt, (error) => {
      if (error) throw error;
      db.close();
    });
  });
}

// x=     {
//   "id": "",
//   "stepType": "when",
//   "type": "Switch X Tabs",
//   "pre": "I switch",
//   "mid": "tabs to the right",
//   "values": [
//     ""
//   ]
// }
// insertOne("stepTypes", x);

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
    const dbo = db.db(db_name);
    const myObjt = content;
    dbo.collection(name).insertMany(myObjt, (error, res) => {
      if (error) throw error;
      console.log(`Number of documents inserted: ${res.insertedCount}`);
      db.close();
    });
  });
}


function update(story_id, updatedStuff) {
  MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
    if (err) throw err;
    const dbo = db.db(db_name);
    dbo.collection(collection).updateOne({ story_id: story_id }, { $set: updatedStuff }, (error, res) => {
      if (error) throw error;
      db.close();
    });
  });
}

// doesnt work yet
function eraseAllStories() {
  MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
    if (err) throw err;
    const dbo = db.db(db_name);
    dbo.collection(collection).deleteOne({}, (error) => {
      if (error) throw error;
      db.close();
    });
  });
}


// shows single story
function showStory(story_id) {
  MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
    if (err) throw err;
    const dbo = db.db(db_name);
    const myObjt = { story_id: story_id };
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
    const dbo = db.db(db_name);
    dbo.collection(collection).drop((error, delOK) => {
      if (error) throw error;
      if (delOK) console.log('Collection deleted');
      db.close();
    });
  });
}

function installDatabase() {
  makeCollection('stepTypes');
  makeCollection('Stories');
  makeCollection('User');
  insertMore('stepTypes', stepTypes());
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
  createBackground,
  deleteBackground,
  updateBackground,
  createScenario,
  deleteScenario,
  updateScenario,
  getOneStory,
  insertEntry,
  upsertEntry,
  installDatabase,
  updateStory,
  createUser,
  deleteUser,
  updateUser,
  getUserData,
  getRepository,
  getOneRepository,
  addIssue
};
