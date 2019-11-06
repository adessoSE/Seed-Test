const { MongoClient } = require('mongodb');
const emptyScenario = require('../models/emptyScenario');
const emptyBackground = require('../models/emptyBackground');
const stepTypes = require('./stepTypes.js');
const env = require('dotenv').config();

var uri = process.env.DATABASE_URI;
// ////////////////////////////////////// API Methods /////////////////////////////////////////////

// get One Story
function getOneStory(id, callback) {
  MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
    if (err) throw err;
    const dbo = db.db('Seed');
    dbo.collection('Stories').findOne({ story_id: id }, (error, result) => {
      if (error) throw error;
      callback(result);
    });
    db.close();
  });
}

// GET all  Stepdefinitions
function showStepdefinitions(callback) {
  MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
    if (err) throw err;
    const dbo = db.db('Seed');
    dbo.collection('stepDefinitions').find({}).toArray((error, result) => {
      if (error) throw error;
      callback(result);
    });
    db.close();
  });
}


// Create Background
function createBackground(gitId, callback) {
  MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
    if (err) throw err;
    const dbo = db.db('Seed');
    const myobj = { story_id: gitId };
    dbo.collection('Stories').findOne(myobj, (error, result) => {
      if (error) throw error;
      const story = result;
      const tmpBackground = emptyBackground();
      story.background = tmpBackground;
      dbo.collection('Stories').findOneAndReplace(myobj, story, (replaceError, replaceResult) => {
        if (replaceError) throw replaceError;
        callback(replaceResult.value);
      });
      db.close();
    });
  });
}

// UPDATE Background
function updateBackground(gitId, updatedBackground, callback) {
  MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
    if (err) throw err;
    const dbo = db.db('Seed');
    const myObj = { story_id: gitId };
    dbo.collection('Stories').findOne(myObj, (findError, result) => {
      if (findError) throw findError;
      const story = result;
      story.background = updatedBackground;
      dbo.collection('Stories').findOneAndReplace(myObj, story, { returnOriginal: false }, (replaceError, replaceResult) => {
        if (replaceError) throw replaceError;
        callback(replaceResult.value);
      });
      db.close();
    });
  });
}

// DELETE Background
function deleteBackground(gitID, callback) {
  MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
    if (err) throw err;
    const dbo = db.db('Seed');
    const myObj = { story_id: gitID };
    dbo.collection('Stories').findOne(myObj, (findError, result) => {
      if (findError) throw findError;
      const story = result;
      story.background = emptyBackground();
      dbo.collection('Stories').findOneAndReplace(myObj, story, {
        returnOriginal: false,
      }, (replaceError, replaceResult) => {
        if (replaceError) throw replaceError;
        callback(replaceResult.value);
      });
      db.close();
    });
  });
}

// CREATE Scenario
function createScenario(git_id, callback) {
  MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
    if (err) throw err;
    const dbo = db.db('Seed');
    const myobj = { story_id: git_id };
    dbo.collection('Stories').findOne(myobj, (error, result) => {
      if (error) throw error;
      const story = result;
      const lastScenarioIndex = story.scenarios.length;
      const tmpScenario = emptyScenario();

      if (story.scenarios.length === 0) {
        story.scenarios.push(tmpScenario);
      } else {
        tmpScenario.scenario_id = story.scenarios[lastScenarioIndex - 1].scenario_id + 1;
        story.scenarios.push(tmpScenario);
      }
      dbo.collection('Stories').findOneAndReplace(myobj, story, {
        returnOriginal: false,
      }, (error2, result2) => {
        if (error2) throw error2;
        callback(tmpScenario);
      });
      
      db.close();
    });
  });
}

// DELETE Scenario
function deleteScenario(git_id, s_id, callback) {
  MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
    if (err) throw err;
    const dbo = db.db('Seed');
    const myobj = { story_id: git_id };
    dbo.collection('Stories').findOne(myobj, (error, result) => {
      if (error) throw error;
      const story = result;
      for (let i = 0; i < story.scenarios.length; i++) {
        if (story.scenarios[i].scenario_id === s_id) {
          story.scenarios.splice(i, 1);
        }
      }
      dbo.collection('Stories').findOneAndReplace(myobj, story, {
        returnOriginal: false,
      }, (error2, result2) => {
        if (error2) throw error2;
        callback(result2.value);
      });
      db.close();
    });
  });
}

// POST Scenario
function updateScenario(git_id, updated_scenario, callback) {
  MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
    if (err) throw err;
    const dbo = db.db('Seed');
    const myobj = { story_id: git_id };
    dbo.collection('Stories').findOne(myobj, (error, result) => {
      if (error) throw error;
      const story = result;
      for (const scenario of story.scenarios) {
        if (story.scenarios.indexOf(scenario) === story.scenarios.length) {
          story.scenarios.push(scenario);
          break;
        }
        if (scenario.scenario_id === updated_scenario.scenario_id) {
          story.scenarios.splice(story.scenarios.indexOf(scenario), 1, updated_scenario);
          break;
        }
      }
      dbo.collection('Stories').findOneAndReplace(myobj, story, {
        returnOriginal: false,
      }, (error2, result2) => {
        if (error2) throw error2;
        callback(result2.value);
      });
      db.close();
    });
  });
}

function upsertEntry(collection, story_id, content) {
  MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
    if (err) throw err;
    const dbo = db.db('Seed');
    const myobj = { story_id };
    const updatedContent = content;
    dbo.collection(collection).findOneAndUpdate(myobj, { $set: updatedContent }, {
      returnOriginal: false,
      upsert: true,
    }, (error) => {
      if (error) throw error;
    });
    db.close();
  });
}


// //////////////////////////////////////////////////////////////// API Methods ////////////////////////////////////////////////////////////////

// ////////////////////////////////////////////////////////////////    ADMIN    ////////////////////////////////////////////////////////////////

// show all Collections
function showMeCollections() {
  MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
    if (err) throw err;
    const dbo = db.db('Seed');
    dbo.listCollections().toArray((error, result) => {
      if (error) throw error;
      console.log('showMeCollections error: ' + result);
      db.close();
    });
  });
}


// create Collection
function makeCollection(name) {
  MongoClient.connect(uri, { useNewUrlParser: true }, { useNewUrlParser: true }, (err, db) => {
    if (err) throw err;
    const dbo = db.db('Seed');
    dbo.createCollection(name, (error, res) => {
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
    const myobj = content;
    dbo.collection(collection).insertOne(myobj, (error, res) => {
      if (error) throw error;
      db.close();
    });
  });
}


// show content of a specific collection
function showCollection(name) {
  MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
    if (err) throw err;
    const dbo = db.db('Seed');
    dbo.collection(name).find({}).toArray((error, result) => {
      if (error) throw error;
      console.log('showCollection error: ' + result);
      db.close();
    });
  });
}


// insert Many documents ("collectionname", [{documents},{...}] )
function insertMore(name, content) {
  MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
    if (err) throw err;
    const dbo = db.db('Seed');
    const myobj = content;
    dbo.collection(name).insertMany(myobj, (error, res) => {
      if (error) throw error;
      console.log(`Number of documents inserted: ${res.insertedCount}`);
      db.close();
    });
  });
}


// update (git_id, {document})
function update(git_id, updatedStuff) {
  MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
    if (err) throw err;
    const dbo = db.db('Seed');
    dbo.collection('Stories').updateOne({ story_id: git_id }, { $set: updatedStuff }, (error, res) => {
      if (error) throw error;
      db.close();
    });
  });
}

// doesnt work yet
function erase() {
  MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
    if (err) throw err;
    const dbo = db.db('Seed');
    dbo.collection('Stories').deleteOne({ }, (error, obj) => {
      if (error) throw error;
      db.close();
    });
  });
}

// shows single story
function showStory(git_id) {
  MongoClient.connect(uri, { useNewUrlParser: true }, (err, db) => {
    if (err) throw err;
    const dbo = db.db('Seed');
    const myobj = { story_id: git_id };
    dbo.collection('Stories').findOne(myobj, (error, result) => {
      if (error) throw error;
      console.log('showStory error: ' + result);
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

function installDatabase(){
  makeCollection('Stories');
  insertMore('stepDefinitions', stepTypes());
}


module.exports = {
  showStepdefinitions,
  createBackground,
  deleteBackground,
  updateBackground,
  createScenario,
  deleteScenario,
  updateScenario,
  getOneStory,
  upsertEntry,
  installDatabase
};
