/* eslint-disable no-unused-vars */
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
const emptyScenario = require('../models/emptyScenario');
const emptyBackground = require('../models/emptyBackground');
const stepTypes = require('./stepTypes.js');
const { ObjectId } = require('mongodb').ObjectId;
if (!process.env.NODE_ENV) {
  const dotenv = require('dotenv').config();
}

const uri = process.env.DATABASE_URI;
// ////////////////////////////////////// API Methods /////////////////////////////////////////////

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
    dbo.collection('ChrisPlayground', (err, collection) => {
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
    console.log("UPS!!!! FEHLER: " + e)
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
    console.log("UPS!!!! FEHLER: " + e)
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
    console.log("UPS!!!! FEHLER: " + e)
  }
}

//get UserData needs ID returns JsonObject User
async function getUserData(userID) {
  try {
    oId = ObjectId(userID)
    const myObjt = { _id: oId }
    let db = await connectDb()
    let collection = await selectUsersCollection(db)
    let result = await collection.findOne(myObjt)
    db.close()
    console.log(result)
    return result
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  }
}



//sets the "outdated" Flag
async function updatedStepFlag(name, storyID) {
  let myObjt
  if (storyID == null) {
    myObjt = {}
  } else {
    myObjt = { story_id: storyID }
  }
  try {
    let db = await connectDb()
    let collection = await selectStoriesCollection(db)
    await collection.updateMany(myObjt, { $set: { "scenarios.$[].stepDefinitions.given.$[elem].Outdated": false } }, { arrayFilters: [{ "elem.name": name }], upsert: true })
    await collection.updateMany(myObjt, { $set: { "scenarios.$[].stepDefinitions.when.$[elem].Outdated": false } }, { arrayFilters: [{ "elem.name": name }], upsert: true })
    await collection.updateMany(myObjt, { $set: { "scenarios.$[].stepDefinitions.then.$[elem].Outdated": false } }, { arrayFilters: [{ "elem.name": name }], upsert: true })
    let result = await findStory(storyID, collection)
    db.close()
    return result
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  }
}



// //sets the "outdated" Flag for "mid" Stepdefinitons in the Stories Collection
// async function midStepFlag(oldText) {
//   try {
//     let db = await connectDb()
//     let collection = await selectStoriesCollection(db)
//     await collection.updateMany({}, { $set: { "scenarios.$[].stepDefinitions.given.$[elem].midOutdated": false } }, { arrayFilters: [{ "elem.mid": oldText }], upsert: true })
//     await collection.updateMany({}, { $set: { "scenarios.$[].stepDefinitions.when.$[elem].midOutdated": false } }, { arrayFilters: [{ "elem.mid": oldText }], upsert: true })
//     await collection.updateMany({}, { $set: { "scenarios.$[].stepDefinitions.then.$[elem].midOutdated": false } }, { arrayFilters: [{ "elem.mid": oldText }], upsert: true })
//     db.close()
//   } catch (e) {
//     console.log("UPS!!!! FEHLER: " + e)
//   }
// }

// if "storyID" Parameter is null: Updates "pre" Stepdefinitions in the "Stories" Collection and sets each step to outdated: false
// else: Updates "pre" Stepdefinitions in the selected Story and sets each step to outdated: false
async function updatePreStepsInOneStory(oldText, newText, storyID) {
  let myObjt
  if (storyID == null) {
    myObjt = {}
  } else {
    myObjt = { story_id: storyID }
  }
  try {
    let db = await connectDb()
    let collection = await selectStoriesCollection(db)
    await collection.updateMany(myObjt, { $set: { "scenarios.$[].stepDefinitions.given.$[elem].Outdated": true } }, { arrayFilters: [{ "elem.pre": oldText }], upsert: true })
    await collection.updateMany(myObjt, { $set: { "scenarios.$[].stepDefinitions.when.$[elem].Outdated": true } }, { arrayFilters: [{ "elem.pre": oldText }], upsert: true })
    await collection.updateMany(myObjt, { $set: { "scenarios.$[].stepDefinitions.then.$[elem].Outdated": true } }, { arrayFilters: [{ "elem.pre": oldText }], upsert: true })
    await collection.updateMany(myObjt, { $set: { "scenarios.$[].stepDefinitions.given.$[elem].pre": newText } }, { arrayFilters: [{ "elem.pre": oldText }] })
    await collection.updateMany(myObjt, { $set: { "scenarios.$[].stepDefinitions.when.$[elem].pre": newText } }, { arrayFilters: [{ "elem.pre": oldText }] })
    await collection.updateMany(myObjt, { $set: { "scenarios.$[].stepDefinitions.then.$[elem].pre": newText } }, { arrayFilters: [{ "elem.pre": oldText }] })
    let result = await findStory(storyID, collection)
    db.close()
    return result
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  }
}

// updatePreStepsInOneStory("I click the Button:", "I click the Button:")

// if "storyID" Parameter is null: Updates "mid" Stepdefinitions in the "Stories" Collection and sets each step to outdated: false
// else: Updates "mid" Stepdefinitions in the selected Story and sets each step to outdated: false
async function updateMidStepsInOneStory(oldText, newText, storyID) {
  let myObjt
  if (storyID == null) {
    myObjt = {}
  } else {
    myObjt = { story_id: storyID }
  }
  try {
    let db = await connectDb()
    let collection = await selectStoriesCollection(db)
    await collection.updateMany(myObjt, { $set: { "scenarios.$[].stepDefinitions.given.$[elem].Outdated": true } }, { arrayFilters: [{ "elem.mid": oldText }], upsert: true })
    await collection.updateMany(myObjt, { $set: { "scenarios.$[].stepDefinitions.when.$[elem].Outdated": true } }, { arrayFilters: [{ "elem.mid": oldText }], upsert: true })
    await collection.updateMany(myObjt, { $set: { "scenarios.$[].stepDefinitions.then.$[elem].Outdated": true } }, { arrayFilters: [{ "elem.mid": oldText }], upsert: true })
    await collection.updateMany(myObjt, { $set: { "scenarios.$[].stepDefinitions.given.$[elem].mid": newText } }, { arrayFilters: [{ "elem.mid": oldText }] })
    await collection.updateMany(myObjt, { $set: { "scenarios.$[].stepDefinitions.when.$[elem].mid": newText } }, { arrayFilters: [{ "elem.mid": oldText }] })
    await collection.updateMany(myObjt, { $set: { "scenarios.$[].stepDefinitions.then.$[elem].mid": newText } }, { arrayFilters: [{ "elem.mid": oldText }] })
    let result = await findStory(storyID, collection)
    db.close()
    return result
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
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
      callback(res)
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
  getUserData,
  updatedStepFlag,
};
