const emptyScenario = require('./models/emptyScenario');
const emptyBackground = require('./models/emptyBackground');
let MongoClient = require('mongodb').MongoClient;
let url = "mongodb://localhost:27017/";

// MongoClient.connect(url, function(err, db) {
//   if (err) throw err;
//   let dbo = db.db("mydb");
  
//   showCollection(dbo, "stories")

//     db.close();
//   });


////////////////////////////////////////////////////////////////// API Methods ////////////////////////////////////////////////////////////////

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
  });
}


// Create Background
function createBackground(git_id) {
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    let dbo = db.db("mydb");
    let myobj = { story_id: git_id }
    let story = dbo.collection("stories").findOne(myobj)
    let tmpBackground = emptyBackground();
    if (story != null) {
      story.background.push(tmpBackground)
      dbo.collection("stories").findOneAndReplace(myobj, story), {
        returnOriginal: false
      }, function (err, result) {
        if (err) throw err;
        console.log(result);
        return result;
      }
    }
    db.close();
  });
}

// Create SCENARIO 
function createScenario(git_id) {
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    let dbo = db.db("mydb");
    let myobj = { story_id: git_id }
    dbo.collection("stories").findOne(myobj, function(err, result) {
      if (err) throw err; 
      let story = result;
      let lastScenarioIndex = story.scenarios.length;
      console.log(story)
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
        }
      }
      console.log(result)
      return result;
    })
  })
}


createScenario(386692174)

////////////////////////////////////////////////////////////////// API Methods ////////////////////////////////////////////////////////////////


function showMeCollections(dbo) {
  dbo.listCollections().toArray(function (err, result) {
    if (err) throw err;
    console.log(result);
  });
}

function makeCollection(dbo, name) {
  dbo.createCollection(name, function (err, res) {
    if (err) throw err;
    console.log("Collection created!");
  });
}

function insertOne(dbo, collection, content) {
  let myobj = content
  dbo.collection(collection).insertOne(myobj, function (err, res) {
    if (err) throw err;
    console.log("1 document inserted");
  });
}

function showCollection(dbo, name) {
  dbo.collection(name).find({}).toArray(function (err, result) {
    if (err) throw err;
    console.log(result);
  });
}

function insertMore(dbo, name, content) {
  let myobj = content;
  dbo.collection(name).insertMany(myobj, function (err, res) {
    if (err) throw err;
    console.log("Number of documents inserted: " + res.insertedCount);
  });
}

function scenarioCreation(dbo, myobj) {
  
    dbo.collection("stories").findOne(myobj, function(err, result) {
    if (err) throw err; 
    let story = result;
    let lastScenarioIndex = story.scenarios.length;
    console.log(story)
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
      }
    }
    console.log(result)
    return result;
  })
}




