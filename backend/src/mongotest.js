const emptyScenario = require('./models/emptyScenario');
const emptyBackground = require('./models/emptyBackground');
let MongoClient = require('mongodb').MongoClient;
let url = "mongodb://localhost:27017/mydb";


////////////////////////////////////////////////////////////////// API Methods ////////////////////////////////////////////////////////////////


//GET all  Stepdefinitions
function showStepdefinitions() {
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    let dbo = db.db("mydb");
    dbo.collection("stepDefinitions").find({}).toArray(function (err, result) {
      if (err) throw err;
      console.log(result);
      return result;
    })
    db.close();
  })
}


// Create Background
function createBackground(git_id) {
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    let dbo = db.db("mydb");
    let myobj = { story_id: git_id }
    dbo.collection("stories").findOne(myobj, function (err, result) {
      if (err) throw err;
      let story = result;
      let tmpBackground = emptyBackground();
        story.background.push(tmpBackground)
        dbo.collection("stories").findOneAndReplace(myobj, story), {
          returnOriginal: false
        }, function (err, result) {
          if (err) throw err;
          return result;
        }
      db.close();
    })
  })
}

// UPDATE Background
function updateBackground(git_id, updated_Background) {
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    let dbo = db.db("mydb");
    let myobj = { story_id: git_id }
    dbo.collection("stories").findOne(myobj, function (err, result) {
      if (err) throw err;
      let story = result;
      story.background = updated_Background
      dbo.collection("stories").findOneAndReplace(myobj, story), {
        returnOriginal: false
      }, function (err, result) {
        if (err) throw err;
        console.log(result);
        return result;
      }
      db.close();
    })
  })
}

//DELETE Background
function deleteBackground(git_id) {
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    let dbo = db.db("mydb");
    let myobj = { story_id: git_id }
    dbo.collection("stories").findOne(myobj, function (err, result) {
      if (err) throw err;
      let story = result;
      story.background = emptyBackground(),
      dbo.collection("stories").findOneAndReplace(myobj, story), {
        returnOriginal: false
      }, function (err, result) {
        if (err) throw err;
        console.log(result);
        return result;
      }
      db.close();
    })
  })
}

// CREATE Scenario
function createScenario(git_id) {
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    let dbo = db.db("mydb");
    let myobj = { story_id: git_id }
    dbo.collection("stories").findOne(myobj, function (err, result) {
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
        dbo.collection("stories").findOneAndReplace(myobj, story), {
          returnOriginal: false
        }, function (err, result) {
          if (err) throw err;
          console.log(result)
        }
      }
      db.close();
    })
  })
}

// DELETE Scenario
function deleteScenario(git_id, s_id) {
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    let dbo = db.db("mydb");
    let myobj = { story_id: git_id }
    dbo.collection("stories").findOne(myobj, function (err, result) {
      if (err) throw err;
      let story = result;
      for (let i = 0; i < story.scenarios.length; i++) {
        if (story.scenarios[i].scenario_id === s_id) {
          story.scenarios.splice(i, 1);
        }
      }
      dbo.collection("stories").findOneAndReplace(myobj, story), {
        returnOriginal: false
      }, function (err, result) {
        if (err) throw err;
        console.log(result)
        return result;
      }
      db.close();
    })
  })
}

// POST Scenario
function updateScenario(git_id, updated_scenario) {
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    let dbo = db.db("mydb");
    let myobj = { story_id: git_id }
    dbo.collection("stories").findOne(myobj, function (err, result) {
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
      dbo.collection("stories").findOneAndReplace(myobj, story), {
        returnOriginal: false
      }, function (err, result) {
        if (err) throw err;
        console.log(story)
      return result;
      }
      db.close();
    })
  })
}

////////////////////////////////////////////////////////////////// API Methods ////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////    ADMIN    ////////////////////////////////////////////////////////////////

// show all Collections
function showMeCollections() {
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    let dbo = db.db("mydb");
    dbo.listCollections().toArray(function (err, result) {
      if (err) throw err;
      console.log(result);
      db.close()
    })
  })
}

// create Collection
function makeCollection(name) {
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    let dbo = db.db("mydb");
    dbo.createCollection(name, function (err, res) {
      if (err) throw err;
      console.log("Collection created!");
      db.close()
    })
  })
}

// insert One document (collectionname, {document})
function insertOne(collection, content) {
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    let dbo = db.db("mydb");
    let myobj = content
    dbo.collection(collection).insertOne(myobj, function (err, res) {
      if (err) throw err;
      console.log("1 document inserted");
      db.close()
    })
  })
}

// show content of a specific collection
function showCollection(name) {
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    let dbo = db.db("mydb");
    dbo.collection(name).find({}).toArray(function (err, result) {
      if (err) throw err;
      console.log(result);
      db.close()
    })
  })
}

// insert Many documents ("collectionname", {documents},{...} )
function insertMore(name, content) {
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    let dbo = db.db("mydb");
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
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    let dbo = db.db("mydb");
    dbo.collection("stories").updateOne({ story_id: git_id }, { $set: updatedStuff }, function (err, res) {
      if (err) throw err;
      db.close()
    })
  })
}

// doesnt work yet
function erase() {
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    let dbo = db.db("mydb");
    dbo.collection("stories").deleteOne({ _id: "5d0361f4c65068037c656191" }, function (err, obj) {
      if (err) throw err;
      db.close()
    })
  })
}

// shows single story
function showStory(git_id) {
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    let dbo = db.db("mydb");
    let myobj = { story_id: git_id }
    dbo.collection("stories").findOne(myobj, function (err, result) {
      if (err) throw err;
      let story = result;
      console.log(result)
      db.close()
    })
  })
}


//updateBackground(386692174,{stepDefinitions:{when: [{test: 1}]}} )
//createScenario(386692174)
// deleteScenario(386692174,4)
showStory(386692174)
//showCollection("stories")
// deleteBackground(386692174)
// createBackground(386692174)