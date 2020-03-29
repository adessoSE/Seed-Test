/* eslint-disable no-unused-vars */
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
const emptyScenario = require('../models/emptyScenario');
const emptyBackground = require('../models/emptyBackground');
const stepTypes = require('./stepTypes.js');
const dotenv = require('dotenv').config();

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

function selectCollection(db) {
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

function findStory(storyID, collection) {
  const myObjt = { story_id: storyID };
  return new Promise((resolve, reject) => {
    collection.findOne((myObjt), (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    })
  })
}

function replace(story, collection) {
  return new Promise((resolve, reject) => {
    collection.findOneAndReplace((myObjt, story), (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result.value);
      }
    })
  })
}



// //Connecttion to DB
// function connectDB) {
//   MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
//     if (err) throw err;
//     const dbo = db.db('Seed');
//     (dbo, db)
//   });
// }



// //find a Story in DB
// function findSStory(dbo, myObjt, db) {
//   dbo.collection(collection).findOne(myObjt, (findError, result) => {
//     if (findError) throw findError;
//     const story = result;
//   (dbo, db, story)
//   })
// }

// //replace the DB Object and closes the DB-Connection
// function replaceAndClose(dbo, db, myObjt, story) {
//   dbo.collection(collection).findOneAndReplace(myObjt, story, { returnOriginal: false }, (replaceError, replaceResult) => {
//     if (replaceError) throw replaceError;
//   (replaceResult.value);
//     db.close();
//   })
// }



// get One Story
async function getOneStory(storyID) {
  let db = await connectDb()
  let collection = await selectCollection(db)
  let story = findStory(storyID, collection)
  db.close()
  return story
}



// // GET all  Steptypes
// function showSteptype) {
//   connectDB((dbo, db) => {
//     dbo.collection('stepTypes').find({}).toArray((error, result) => {
//       if (error) throw error;
//     (result);
//       db.close();
//     });
//   });
// }

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
  let collection = await selectCollection(db)
  let story = findStory(storyID, collection)
  const tmpBackground = emptyBackground();
  story.background = tmpBackground;
  let result = await replace(story, collection)
  db.close()
  return result
}

// UPDATE Background
async function updateBackground(storyID, updatedBackground) {
  let db = await connectDb()
  let collection = await selectCollection(db)
  let story = findStory(storyID, collection)
  story.background = updatedBackground;
  let result = await replace(story, collection)
  db.close()
  return result
}

// DELETE Background
async function deleteBackground(storyID) {
  let db = await connectDb()
  let collection = await selectCollection(db)
  let story = findStory(storyID, collection)
  story.background = emptyBackground();
  let result = await replace(story, collection)
  db.close()
  return result
}

// CREATE Scenario
async function createScenario(storyID) {
  let db = await connectDb()
  let collection = await selectCollection(db)
  let story = findStory(storyID, collection)
  const lastScenarioIndex = story.scenarios.length;
  const tmpScenario = emptyScenario();
  if (story.scenarios.length === 0) {
    story.scenarios.push(tmpScenario);
  } else {
    tmpScenario.scenario_id = story.scenarios[lastScenarioIndex - 1].scenario_id + 1;
    story.scenarios.push(tmpScenario);
  }
  let result = await replace(story, collection)
  db.close()
  return result
}



// DELETE Scenario
async function deleteScenario(storyID, scenarioID) {
  let db = await connectDb()
  let collection = await selectCollection(db)
  let story = findStory(storyID, collection)
  for (let i = 0; i < story.scenarios.length; i++) {
    if (story.scenarios[i].scenario_id === scenarioID) {
      story.scenarios.splice(i, 1);
    }
  }
  let result = await replace(story, collection)
  db.close()
  return result
}

// POST Scenario
async function updateScenario(storyID, updatedScenario) {
  let db = await connectDb()
  let collection = await selectCollection(db)
  let story = findStory(storyID, collection)
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
  db.close()
  return result
}

async function upsertEntry(storyID, updatedContent) {
  const myObjt = { story_id: storyID };
  let db = await connectDb()
  let collection = await selectCollection(db)
  let dbo = db.db('Seed')
  dbo.collection(collection).findOneAndUpdate(myObjt, { $set: updatedContent }, {
    returnOriginal: false,
    upsert: true,
  }, (error) => {
    if (error) throw error;
    db.close();
  });
}

// /////////////////////////////////////////// API Methods ////////////////////////////////////////
// ///////////////////////////////////////////    ADMIN    ////////////////////////////////////////

// // Creates Database Backupfile
// function writeBackup(__dirname, collection) {
//   fs.writeFile(path.join(__dirname, 'dbbackups', 'dbbackup.json'), helper(collection), (err) => {
//     if (err) throw err;
//   });
// }

// function helper(collection) {
//   let data = ""
//   data += JSON.stringify(getCollection(collection));
//   console.log(data)
//   return data;
// }

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
function getCollection(name) {
  MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
    if (err) throw err;
    const dbo = db.db('Seed');
    dbo.collection(name).find({}).toArray((error, result) => {
      if (error) throw error;
      //console.log(JSON.stringify(result))
      db.close();
    });
  });
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

//getCollection(collection)
//writeBackup("", collection)

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
};
