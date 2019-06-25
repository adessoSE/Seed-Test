const emptyScenario = require('./models/emptyScenario');
const emptyBackground = require('./models/emptyBackground');
let MongoClient = require('mongodb').MongoClient;
let url = "mongodb://localhost:27017";



// MongoClient.connect(url, function(err, client) {
//   if (err) throw err;
//   let db = client.db("mydb")
//   let stories = db.collection("stories")
// })





// console.log(getOne(386692174))
//getOne(386692174)

// getOne(386692174, function (items) {
//   console.log(items)
// })

// console.log(a)
// function getOne(id) {
//   return 
//    MongoClient.connect(url, function (err, db) {
//    if (err) throw err;
//    let dbo = db.db("mydb");
//    dbo.collection("stories").findOne(id, function (err, result) {
//      if (err) throw err;
//    })
//  });
// }


// showStepdefinitions(function(result){
//   console.log(result)
// })


////////////////////////////////////////////////////////////////// API Methods ////////////////////////////////////////////////////////////////

// get One Story
function getOne(id, callback) {
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    let dbo = db.db("mydb");
    dbo.collection("stories").find({ story_id: id }).toArray(function (err, result) {
      if (err) throw err;
      callback(result)
    });
  });
}

//GET all  Stepdefinitions
function showStepdefinitions(callback) {
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    let dbo = db.db("mydb");
    dbo.collection("stepDefinitions").find({}).toArray(function (err, result) {
      if (err) throw err;
      callback(result);
    })
    db.close();
  })
}


// Create Background
function createBackground(git_id, callback) {
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    let dbo = db.db("mydb");
    let myobj = { story_id: git_id }
    dbo.collection("stories").findOne(myobj, function (err, result) {
      if (err) throw err;
      let story = result;
      let tmpBackground = emptyBackground();
      story.background = tmpBackground
      dbo.collection("stories").findOneAndReplace(myobj, story, function (err, result) {
        if (err) throw err;
        callback(result.value)
      })
      db.close();
    })
  })
}

// createBackground(386692174, function(result) {
//   console.log(result)
// })

// UPDATE Background
function updateBackground(git_id, updated_Background, callback) {
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    let dbo = db.db("mydb");
    let myobj = { story_id: git_id }
    dbo.collection("stories").findOne(myobj, function (err, result) {
      if (err) throw err;
      let story = result;
      story.background = updated_Background
      dbo.collection("stories").findOneAndReplace(myobj, story, {
        returnOriginal: false
      }, function (err, result) {
        if (err) throw err;
        callback(result.value)
      })
      db.close();
    })
  })
}

// updateBackground(386692174,{ stepDefinitions: { when: ["blub"] } }, function(result) {
//   console.log(result.background)
// })

//DELETE Background
function deleteBackground(git_id, callback) {
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    let dbo = db.db("mydb");
    let myobj = { story_id: git_id }
    dbo.collection("stories").findOne(myobj, function (err, result) {
      if (err) throw err;
      let story = result;
      story.background = emptyBackground(),
        dbo.collection("stories").findOneAndReplace(myobj, story, {
          returnOriginal: false
        }, function (err, result) {
          if (err) throw err;
          callback(result.value)
        })
      db.close();
    })
  })
}

// deleteBackground(386692174, function(result) {
//   console.log(result.background)
// })

// CREATE Scenario
function createScenario(git_id, callback) {
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
        dbo.collection("stories").findOneAndReplace(myobj, story, {
          returnOriginal: false
        }, function (err, result) {
          if (err) throw err;
          callback(result.value)
        })
      }
      db.close();
    })
  })
}

// createScenario(386692174, function(result) {
//   console.log(result.scenarios)
// })

// DELETE Scenario
function deleteScenario(git_id, s_id, callback) {
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
      dbo.collection("stories").findOneAndReplace(myobj, story, {
        returnOriginal: false
      }, function (err, result) {
        if (err) throw err;
        callback(result.value)
      })
      db.close();
    })
  })
}

// deleteScenario(386692174, 3, function(result) {
//   console.log(result.scenarios)
// })

// POST Scenario
function updateScenario(git_id, updated_scenario,callback) {
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
      dbo.collection("stories").findOneAndReplace(myobj, story, {
        returnOriginal: false
      }, function (err, result) {
        if (err) throw err;
        callback(result.value)
      })
      db.close();
    })
  })
}

// updateScenario(386692174, {
//   scenario_id: 3,
//   name: 'TestScenario',
//   stepDefinitions:
//   {
//     given: [],
//     when: [],
//     then: [],
//     example: [],
//   },
// }, function(result) {
//   console.log(result.scenarios)
// })


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
      console.log(result)
      db.close()
    })
  })
}

// console.log(getOne({ story_id: 386692174 }))
// console.log(showStepdefinitions().then(function(result){
//   return result
// }))

// console.log(stories.findOne({ story_id: 386692174 }))

module.exports = {
  showStepdefinitions: showStepdefinitions,
  createBackground: createBackground, deleteBackground: deleteBackground, updateBackground: updateBackground,
  createScenario: createScenario, deleteScenario: deleteScenario, updateScenario: updateScenario, getOne, insertOne,
};


// updateBackground(386692174,{stepDefinitions:{when: [{test: 1}]}} )
// createScenario(386692174)
// deleteScenario(386692174,4)
// showStory(386692174)
// showCollection("stories")
// deleteBackground(386692174)
// createBackground(386692174)