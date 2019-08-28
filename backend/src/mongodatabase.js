const emptyScenario = require('./models/emptyScenario');
const emptyBackground = require('./models/emptyBackground');
let MongoClient = require('mongodb').MongoClient;
const uri = "mongodb+srv://Seed-Admin:KkPuqMeGUfgpyTVp@seed-tsqv2.mongodb.net/test?retryWrites=true&w=majority";




////////////////////////////////////////////////////////////////// API Methods ////////////////////////////////////////////////////////////////

// get One Story
function getOneStory(id, callback) {
  MongoClient.connect(uri, { useNewUrlParser: true }, function (err, db) {
    if (err) throw err;
    let dbo = db.db("Seed");
    dbo.collection("Stories").findOne({ story_id: id }, function (err, result) {
      if (err) throw err;
      callback(result)
    });
    db.close();
  });
}

//GET all  Stepdefinitions
function showStepdefinitions(callback) {
  MongoClient.connect(uri, function (err, db) {
    if (err) throw err;
    let dbo = db.db("Seed");
    dbo.collection("stepDefinitions").find({}).toArray(function (err, result) {
      if (err) throw err;
      callback(result);
    })
    db.close();
  })
}


// Create Background
function createBackground(git_id, callback) {
  MongoClient.connect(uri, function (err, db) {
    if (err) throw err;
    let dbo = db.db("Seed");
    let myobj = { story_id: git_id }
    dbo.collection("Stories").findOne(myobj, function (err, result) {
      if (err) throw err;
      let story = result;
      let tmpBackground = emptyBackground();
      story.background = tmpBackground
      dbo.collection("Stories").findOneAndReplace(myobj, story, function (err, result) {
        if (err) throw err;
        callback(result.value)
      })
      db.close();
    })
  })
}

// UPDATE Background
function updateBackground(git_id, updated_Background, callback) {
  MongoClient.connect(uri, function (err, db) {
    if (err) throw err;
    let dbo = db.db("Seed");
    let myobj = { story_id: git_id }
    dbo.collection("Stories").findOne(myobj, function (err, result) {
      if (err) throw err;
      let story = result;
      story.background = updated_Background
      dbo.collection("Stories").findOneAndReplace(myobj, story, {
        returnOriginal: false
      }, function (err, result) {
        if (err) throw err;
        callback(result.value)
      })
      db.close();
    })
  })
}

//DELETE Background
function deleteBackground(git_id, callback) {
  MongoClient.connect(uri, function (err, db) {
    if (err) throw err;
    let dbo = db.db("Seed");
    let myobj = {story_id: git_id}
    dbo.collection("Stories").findOne(myobj, function (err, result) {
      if (err) throw err;
      let story = result;
      story.background = emptyBackground(),
        dbo.collection("Stories").findOneAndReplace(myobj, story, {
          returnOriginal: false
        }, function (err, result) {
          if (err) throw err;
          callback(result.value)
        })
      db.close();
    })
  })
}

// CREATE Scenario
function createScenario(git_id, callback) {
  MongoClient.connect(uri, function (err, db) {
    if (err) throw err;
    let dbo = db.db("Seed");
    let myobj = {story_id: git_id}
    dbo.collection("Stories").findOne(myobj, function (err, result) {
      if (err) throw err;
      let story = result;
      let lastScenarioIndex = story.scenarios.length;
      let tmpScenario = emptyScenario();
      if (story != null) {
        if (story.scenarios.length === 0) {
          story.scenarios.push(tmpScenario)
        } else {
          tmpScenario.scenario_id = story.scenarios[lastScenarioIndex - 1].scenario_id + 1;
          story.scenarios.push(tmpScenario)
        }
        dbo.collection("Stories").findOneAndReplace(myobj, story, {
          returnOriginal: false
        }, function (err, result) {
          if (err) throw err;
          callback(tmpScenario)
        })
      }
      db.close();
    })
  })
}

// DELETE Scenario
function deleteScenario(git_id, s_id, callback) {
  MongoClient.connect(uri, function (err, db) {
    if (err) throw err;
    let dbo = db.db("Seed");
    let myobj = { story_id: git_id }
    dbo.collection("Stories").findOne(myobj, function (err, result) {
      if (err) throw err;
      let story = result;
      for (let i = 0; i < story.scenarios.length; i++) {
        if (story.scenarios[i].scenario_id === s_id) {
          story.scenarios.splice(i, 1);
        }
      }
      dbo.collection("Stories").findOneAndReplace(myobj, story, {
        returnOriginal: false
      }, function (err, result) {
        if (err) throw err;
        callback(result.value)
      })
      db.close();
    })
  })
}

// POST Scenario
function updateScenario(git_id, updated_scenario, callback) {
  MongoClient.connect(uri, function (err, db) {
    if (err) throw err;
    let dbo = db.db("Seed");
    let myobj = { story_id: git_id }
    dbo.collection("Stories").findOne(myobj, function (err, result) {
      if (err) throw err;
      let story = result;
      for (let scenario of story.scenarios) {
        if (story.scenarios.indexOf(scenario) === story.scenarios.length) {
          story.scenarios.push(scenario);
          break;
        }
        if (scenario.scenario_id === updated_scenario.scenario_id) {
          story.scenarios.splice(story.scenarios.indexOf(scenario), 1, updated_scenario);
          break;
        }
      }
      dbo.collection("Stories").findOneAndReplace(myobj, story, {
        returnOriginal: false
      }, function (err, result) {
        if (err) throw err;
        callback(result.value)
      })
      db.close();
    })
  })
}

function upsertEntry(collection, story_id, content) {
  MongoClient.connect(uri, function (err, db) {
    if (err) throw err;
    let dbo = db.db("Seed");
    let myobj = { story_id: story_id }
    let update = content
    dbo.collection(collection).findOneAndUpdate(myobj, {$set: update}, {
      returnOriginal: false,
      upsert: true
  }, function (err) {
    if (err) throw err;
  })
  db.close();
  })
}



////////////////////////////////////////////////////////////////// API Methods ////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////    ADMIN    ////////////////////////////////////////////////////////////////


// show all Collections
function showMeCollections() {
  MongoClient.connect(uri, function (err, db) {
    if (err) throw err;
    let dbo = db.db("Seed");
    dbo.listCollections().toArray(function (err, result) {
      if (err) throw err;
      console.log(result);
      db.close()
    })
  })
}

// create Collection
function makeCollection(name) {
  MongoClient.connect(uri, { useNewUrlParser: true }, function (err, db) {
    if (err) throw err;
    let dbo = db.db("Seed");
    dbo.createCollection(name, function (err, res) {
      if (err) throw err;
      console.log("Collection created!");
      db.close()
    })
  })
}



// insert One document (collectionname, {document})
function insertOne(collection, content) {
  MongoClient.connect(uri, function (err, db) {
    if (err) throw err;
    let dbo = db.db("Seed");
    let myobj = content
    dbo.collection(collection).insertOne(myobj, function (err, res) {
      if (err) throw err;
      db.close()
    })
  })
}


// show content of a specific collection
function showCollection(name) {
  MongoClient.connect(uri, function (err, db) {
    if (err) throw err;
    let dbo = db.db("Seed");
    dbo.collection(name).find({}).toArray(function (err, result) {
      if (err) throw err;
      console.log(result);
      db.close()
    })
  })
}



// insert Many documents ("collectionname", [{documents},{...}] )
function insertMore(name, content) {
  MongoClient.connect(uri, function (err, db) {
    if (err) throw err;
    let dbo = db.db("Seed");
    let myobj = content;
    dbo.collection(name).insertMany(myobj, function (err, res) {
      if (err) throw err;
      console.log("Number of documents inserted: " + res.insertedCount);
      db.close()
    })
  })
}



// update (git_id, {document})
function update(git_id, updatedStuff) {
  MongoClient.connect(uri, function (err, db) {
    if (err) throw err;
    let dbo = db.db("Seed");
    dbo.collection("Stories").updateOne({ story_id: git_id }, { $set: updatedStuff }, function (err, res) {
      if (err) throw err;
      db.close()
    })
  })
}

// doesnt work yet
function erase() {
  MongoClient.connect(uri, function (err, db) {
    if (err) throw err;
    let dbo = db.db("Seed");
    dbo.collection("Stories").deleteOne({  }, function (err, obj) {
      if (err) throw err;
      db.close()
    })
  })
}

// shows single story
function showStory(git_id) {
  MongoClient.connect(uri, function (err, db) {
    if (err) throw err;
    let dbo = db.db("Seed");
    let myobj = { story_id: git_id }
    dbo.collection("Stories").findOne(myobj, function (err, result) {
      if (err) throw err;
      console.log(result)
      db.close()
    })
  })
}

// delete collection
function dropCollection(){
MongoClient.connect(uri, function(err, db) {
  if (err) throw err;
  var dbo = db.db("Seed");
  dbo.collection("Stories").drop(function(err, delOK) {
    if (err) throw err;
    if (delOK) console.log("Collection deleted");
    db.close();
  });
}); 
}


module.exports = {
  showStepdefinitions: showStepdefinitions,
  createBackground: createBackground, deleteBackground: deleteBackground, updateBackground: updateBackground,
  createScenario: createScenario, deleteScenario: deleteScenario, updateScenario: updateScenario, getOneStory, upsertEntry,
};


