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
    dbo.collection(('ChrisPlayground'), (err, collection) => {
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

function replaceAndClose(db, story, collection) {
  return new Promise((resolve, reject) => {
    collection.findOneAndReplace((myObjt, story), (err, result) => {
      db.close()
      if (err) {
        reject(err);
      } else {
        resolve(result.value);
      }
    })
  })
}



//Connecttion to DB
function connectDB(callback) {
  MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
    if (err) throw err;
    const dbo = db.db('Seed');
    callback(dbo, db)
  });
}



// //find a Story in DB
// function findSStory(dbo, myObjt, db, callback) {
//   dbo.collection('Stories').findOne(myObjt, (findError, result) => {
//     if (findError) throw findError;
//     const story = result;
//     callback(dbo, db, story)
//   })
// }

// //replace the DB Object and closes the DB-Connection
// function replaceAndClose(dbo, db, myObjt, story, callback) {
//   dbo.collection('Stories').findOneAndReplace(myObjt, story, { returnOriginal: false }, (replaceError, replaceResult) => {
//     if (replaceError) throw replaceError;
//     callback(replaceResult.value);
//     db.close();
//   })
// }



// get One Story
function getOneStory(storyID) {
  return new Promise((resolve, reject) => {
    connectDb().then(db => {
      selectCollection(db).then(collection => {
        console.log("Die Collection !!!!!!!!!!" + JSON.stringify(collection))
        findStory(storyID, collection).then(result => {
          console.log("Die Story !!!!!!!!!!!!!!!" + result)
          resolve(result)
        })
      });
    })
  })
}

console.log(getOneStory("386696070"))

// // GET all  Steptypes
// function showSteptypes(callback) {
//   connectDB((dbo, db) => {
//     dbo.collection('stepTypes').find({}).toArray((error, result) => {
//       if (error) throw error;
//       callback(result);
//       db.close();
//     });
//   });
// }

// GET all  Steptypes
function showSteptypes() {
  return connectDb().then(db => {
    selectCollection(db).then(collection => {
      collection.find({}).toArray().then(array => {
        db.close();
        return array
      })
    })
  })
}


// Create Background
function createBackground(issueID, callback) {
  const myObjt = { story_id: issueID };
  connectDB((dbo, db) => {
    const tmpBackground = emptyBackground();
    story.background = tmpBackground;
    replaceAndClose(dbo, db, myObjt, story, (result) => {
      callback(result)
    })
  })
}

// UPDATE Background
function updateBackground(issueID, updatedBackground, callback) {
  const myObjt = { story_id: issueID };
  connectDB((dbo, db) => {
    findStory(dbo, db, myObjt, (dbo, db, story) => {
      story.background = updatedBackground;
      replaceAndClose(dbo, db, myObjt, story, (result) => {
        callback(result)
      })
    })
  })
}

// DELETE Background
function deleteBackground(issueID, callback) {
  const myObjt = { story_id: issueID };
  connectDB((dbo, db) => {
    findStory(dbo, db, myObjt, (dbo, db, story) => {
      story.background = emptyBackground();
      replaceAndClose(dbo, db, myObjt, story, (result) => {
        callback(result)
      })
    })
  })
}

// CREATE Scenario
function createScenario(issueID) {
  return connectDb().then(db => {
    selectCollection(db).then(collection => {
      findStory(issueID, collection).then(story => {
        const lastScenarioIndex = story.scenarios.length;
        const tmpScenario = emptyScenario();

        if (story.scenarios.length === 0) {
          story.scenarios.push(tmpScenario);
        } else {
          tmpScenario.scenario_id = story.scenarios[lastScenarioIndex - 1].scenario_id + 1;
          story.scenarios.push(tmpScenario);
        }
        replaceAndClose(db, story, collection)
      })
    })
  })
}



// DELETE Scenario
function deleteScenario(issueID, scenarioID) {
  const myObjt = { story_id: issueID };
  connectDB((dbo, db) => {
    findStory(dbo, db, myObjt, (dbo, db, story) => {
      for (let i = 0; i < story.scenarios.length; i++) {
        if (story.scenarios[i].scenario_id === scenarioID) {
          story.scenarios.splice(i, 1);
        }
      }
      replaceAndClose(dbo, db, myObjt, story, (result) => {
        callback(result)
      })
    });
  })
}

// POST Scenario
function updateScenario(issueID, updatedScenario, callback) {
  const myObjt = { story_id: issueID };
  connectDB((dbo, db) => {
    findStory(dbo, db, myObjt, (dbo, db, story) => {
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
      replaceAndClose(dbo, db, myObjt, story, (result) => {
        callback(result)
      })
    });
  })
}

function upsertEntry(collection, storyID, content) {
  const myObjt = { story_id: storyID };
  const updatedContent = content;
  connectDB((dbo, db) => {
    dbo.collection(collection).findOneAndUpdate(myObjt, { $set: updatedContent }, {
      returnOriginal: false,
      upsert: true,
    }, (error) => {
      if (error) throw error;
      db.close();
    });
  })
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

function update(issueID, updatedStuff) {
  MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
    if (err) throw err;
    const dbo = db.db('Seed');
    dbo.collection('Stories').updateOne({ story_id: issueID }, { $set: updatedStuff }, (error, res) => {
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
    dbo.collection('Stories').deleteOne({}, (error) => {
      if (error) throw error;
      db.close();
    });
  });
}


// shows single story
function showStory(issueID) {
  MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
    if (err) throw err;
    const dbo = db.db('Seed');
    const myObjt = { story_id: issueID };
    dbo.collection('Stories').findOne(myObjt, (error, result) => {
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
    dbo.collection('Stories').drop((error, delOK) => {
      if (error) throw error;
      if (delOK) console.log('Collection deleted');
      db.close();
    });
  });
}

function installDatabase() {
  makeCollection('Stories');
  insertMore('stepTypes', stepTypes());
}

//getCollection("Stories")
//writeBackup("", "Stories")

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
