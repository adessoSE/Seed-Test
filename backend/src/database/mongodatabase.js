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
  try {
    let db = await connectDb()
    let collection = await selectStoriesCollection(db)
    let story = await replace(gitID, updatedStuff, collection)
    return story
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  } finally {
    db.close()
  }
}

// get One Story
async function getOneStory(storyID) {
  try {
    let db = await connectDb()
    let collection = await selectStoriesCollection(db)
    let story = await findStory(storyID, collection)
    return story
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  } finally {
    db.close()
  }
}

// GET all  Steptypes
async function showSteptypes() {
  try {
    let db = await connectDb()
    dbo = db.db('Seed')
    let collection = await dbo.collection('stepTypes')
    let result = await collection.find({}).toArray()
    return result
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  } finally {
    db.close()
  }
}

// Create Background
async function createBackground(storyID) {
  try {
    let db = await connectDb()
    let collection = await selectStoriesCollection(db)
    let story = await findStory(storyID, collection)
    const tmpBackground = emptyBackground();
    story.background = tmpBackground;
    let result = await replace(storyID, story, collection)
    return result
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  } finally {
    db.close()
  }
}

// UPDATE Background
async function updateBackground(storyID, updatedBackground) {
  try {
    let db = await connectDb()
    let collection = await selectStoriesCollection(db)
    let story = await findStory(storyID, collection)
    story.background = updatedBackground;
    let result = await replace(storyID, story, collection)
    return result
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  } finally {
    db.close()
  }
}

// DELETE Background
async function deleteBackground(storyID) {
  try {
    let db = await connectDb()
    let collection = await selectStoriesCollection(db)
    let story = await findStory(storyID, collection)
    story.background = emptyBackground();
    let result = await replace(storyID, story, collection)
    return result
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  } finally {
    db.close()
  }
}

// CREATE Scenario
async function createScenario(storyID) {
  try {
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
    return tmpScenario
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  } finally {
    db.close()
  }
}

// DELETE Scenario
async function deleteScenario(storyID, scenarioID) {
  try {
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
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  } finally {
    db.close()
  }
}

// POST Scenario
async function updateScenario(storyID, updatedScenario) {
  try {
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
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  } finally {
    db.close()
  }
}

async function upsertEntry(storyID, updatedContent) {
  try {
    const myObjt = { story_id: storyID };
    let db = await connectDb()
    let collection = await selectStoriesCollection(db)
    collection.findOneAndUpdate(myObjt, { $set: updatedContent }, {
      returnOriginal: false,
      upsert: true,
    })
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  } finally {
    db.close()
  }
}

// create User in DB needs JsonObject User returns JsonObject(user)
async function createUser(user) {
  try {
    let db = await connectDb()
    let collection = await selectUsersCollection(db)
    let result = await collection.insertOne(user)
    console.log(result.ops[0])
    return result
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  } finally {
    db.close()
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
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  } finally {
    db.close()
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
    return result.value
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  } finally {
    db.close()
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
    return result
  } catch (e) {
    console.log("UPS!!!! FEHLER: " + e)
  } finally {
    db.close()
  }
}






// /////////////////////////////////////////// API Methods end ////////////////////////////////////////
// ///////////////////////////////////////////    ADMIN    ////////////////////////////////////////////




// Please keep in mind that when you change the stepDefs in the Database with this function, you also have to apply that change manualy in the stepdefs.js in features/step_definitions 
// if "storyID" Parameter is null: Updates "pre" Stepdefinitions in the "Stories" Collection and sets each step to outdated: true
// else: Updates "pre" Stepdefinitions in the selected Story and sets each step to outdated: true
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
// if "storyID" Parameter is null: Updates "mid" Stepdefinitions in the "Stories" Collection and sets each step to outdated: true
// else: Updates "mid" Stepdefinitions in the selected Story and sets each step to outdated: true
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
    await collection.updateMany(myObjt, { $set: { "background.stepDefinitions.when.$[elem].outdated": true } }, { arrayFilters: [{ "elem.mid": oldText }], upsert: true })
    await collection.updateMany(myObjt, { $set: { "scenarios.$[].stepDefinitions.given.$[elem].outdated": true } }, { arrayFilters: [{ "elem.mid": oldText }], upsert: true })
    await collection.updateMany(myObjt, { $set: { "scenarios.$[].stepDefinitions.when.$[elem].outdated": true } }, { arrayFilters: [{ "elem.mid": oldText }], upsert: true })
    await collection.updateMany(myObjt, { $set: { "scenarios.$[].stepDefinitions.then.$[elem].outdated": true } }, { arrayFilters: [{ "elem.mid": oldText }], upsert: true })
    await collection.updateMany(myObjt, { $set: { "background.stepDefinitions.when.$[elem].mid": newText } }, { arrayFilters: [{ "elem.mid": oldText }] })
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
  getUserData
};
