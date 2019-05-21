const express = require('express');
const cors = require('cors');
const bodyParser = require("body-parser");
const app = express();
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const db = require('./database');
const stories_db = require('./database').stories;
const process = require('process');
const emptyScenario = require('./models/emptyScenario');
const emptyBackground = require('./models/emptyBackground');
const access_token = '119234a2e8eedcbe2f6f3a6bbf2ed2f56946e868'; //This is a personal access token, not sure how to handle correctly for multi-user
const access_token_new = '56cc02bcf1e3083f574d14138faa1ff0a6c7b9a1';
const helper = require('./serverHelper');
var repository = 'Cucumber';
let stories = [];

// Initialize the app.
const server = app.listen(process.env.PORT || 8080, function () {
  let port = server.address().port;
  console.log("App now running on port", port);
});

// Handling response errors
function handleError(res, reason, statusMessage, code) {
  console.log("ERROR: " + reason);
  res.status(code || 500).json({ "error": statusMessage });
}

/**
 * API Description
 */
app
  .use(cors())
  .use(bodyParser.json({ limit: '100kb' }))
  .use(bodyParser.urlencoded({ limit: '100kb', extended: true }))
  .use(function (req, res, next) {
    console.log('Time:', Date.now());
    //console.log('%r %s %n', req, res, next);
    next();
  })
  .get("/api", function (req, res) {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.write('<h1>Cucumber-API</h1>');
    res.write('<h2>WORKING:</h2>');
    res.write('<h2>GET</h2>');
    res.write('<p>/api/stories</p>');
    res.write('<p>/api/stepDefinitions</p>');
    res.write('<p>/api/scenario/add/:issueID</p>');
    res.write('<h2>POST</h2>');
    res.write('<p>/api/scenario/update/:issueID</p>');
    res.write('<h2>DELETE</h2>');
    res.write('<p>/api/story/:issueID/scenario/delete/:scenarioID</p>');
    res.status(200);
    res.end();
  })
  /**
   * Scenarios API
   */
  .get("/api/stepDefinitions", function (req, res) {
    res.status(200).json(db.showStepdefinitions());
  })

  .get("/api/stories/:user?/:repository?", function (req, res) {
    if(req.params.repository){
      githubName = req.params.user
      repository = req.params.repository;
    }else{
      repository = 'Cucumber'
      githubName = 'fr4gstar'
    }

    stories = [];
    // get Issues from GitHub
    let request = new XMLHttpRequest();
    //request.open('GET', 'https://api.github.com/repos/fr4gstar/Cucumber/issues?labels=story&access_token=' + access_token);
    request.open('GET', 'https://api.github.com/repos/' + githubName + '/' + repository + '/issues?labels=story&access_token=' + access_token);
    request.send();
    request.onreadystatechange = function () {
      if (this.readyState === 4 && this.status === 200) {
        let data = JSON.parse(request.responseText);
        // init result
        // let stories = [];
        for (let issue of data) {
          // only relevant issues with label: "story"
          let story = { story_id: issue["id"], title: issue["title"], body: issue["body"], state: issue['state'], issue_number: issue["number"]};
          if (issue["assignee"] !== null) { // skip in case of "unassigned"
            story["assignee"] = issue["assignee"]["login"];
            story["assignee_avatar_url"] = issue["assignee"]["avatar_url"];
          }
          if (stories_db.findOne({ story_id: issue["id"] }) !== null) { // skip if there is no data for the issue yet
            story["scenarios"] = stories_db.findOne({ story_id: issue["id"] }).scenarios;
            story["background"] = stories_db.findOne({ story_id: issue["id"] }).background;
          } else {
            story["scenarios"] = [emptyScenario()];
            story["background"] = emptyBackground();
          }
          stories_db.insert(story); // update database
          // Create & Update Feature Files
          helper.writeFile(__dirname, story);
          //TODO: delete stories priority 2

          stories.push(story);
        }
        res.status(200).json(stories);
        console.log("Returning stories.")
      }
    };
  })
  .get("/api/repositories/:token?/:githubName?", function (req, res) {
    let bearer = req.headers.authorization
    let splited = bearer.split(" ")
    let token = splited[1]
    console.log(splited[1]);
    //let usertoken = req.params.token;
    let githubName = req.params.githubName;
    let ownRepositories;
    let bool1, bool2 = false;
    getOwnRepositories(token, function(repos){
      ownRepositories = repos;
      
      if(bool2){
        let concat = ownRepositories.concat(starredRepositories);
        res.status(200).json(concat);
      }else{
        bool1 = true;
      }
    });
    let starredRepositories; 
    getStarredRepositories(githubName, token, function(stars){
      starredRepositories = stars;
      if(bool1){
        let concat = ownRepositories.concat(starredRepositories);
        res.status(200).json(concat);
      }else{
        bool2 = true;
      }
    });
    
  })






  .get("/testResult", function(req,res){
    helper.setRespReport(res);
  })
  .get("/api/downloadTest", function(req,res){
    helper.sendDownloadResult(res);
  })



  // create Background
  .get("/api/background/add/:issueID", function (req, res) {
    let background = db.createBackground(parseInt(req.params.issueID));
    if (typeof (background) === "string") {
      handleError(res, background, background, 500);
    } else {
      res.status(200).json(background);
      console.log("Background created");
    }
    helper.updateFeatureFiles(req.params, stories);
  })

   // update background
   .post("/api/background/update/:issueID", function (req, res) {
    let background = req.body;
    let updated_background = db.updateBackground(parseInt(req.params.issueID), background);
    if (typeof (updated_background) === "string") {
      handleError(res, updated_background, updated_background, 500);
    } else {
      res.status(200).json(updated_background);
    }
    helper.updateFeatureFiles(req.params, stories);
  })

   // delete background
   .delete("/api/story/:issueID/background/delete/", function (req, res) {
    let result = db.deleteBackground(parseInt(req.params.issueID));
    if (typeof (result) === "string") {
      handleError(res, result, result, 500);
      console.log("Could not delete Background.");
    }
    if (result === true) {
      res.status(200).json({});
      console.log("Background deleted.");
    }
    helper.updateFeatureFiles(req.params, stories);
  })


  // create scenario
  .get("/api/scenario/add/:issueID", function (req, res) {
    let scenario = db.createScenario(parseInt(req.params.issueID));
    if (typeof (scenario) === "string") {
      handleError(res, scenario, scenario, 500);
    } else {
      res.status(200).json(scenario);
      console.log("Scenario created");
    }
    helper.updateFeatureFiles(req.params, stories);
  })

  // update scenario
  .post("/api/scenario/update/:issueID", function (req, res) {
    // TODO use model to check for scenario (priority 2)
    let scenario = req.body;
    console.log("Trying to update scenario in issue: " + req.params.issueID + " with ID: " + scenario.scenario_id);
    let updated_scenario = db.updateScenario(parseInt(req.params.issueID), scenario);
    if (typeof (updated_scenario) === "string") {
      handleError(res, updated_scenario, updated_scenario, 500);
    } else {
      res.status(200).json(updated_scenario);
      console.log('Scenario', scenario.scenario_id, 'updated in Story', req.params.issueID);
    }
    helper.updateFeatureFiles(req.params, stories);
  })

  // delete scenario
  .delete("/api/story/:issueID/scenario/delete/:scenarioID", function (req, res) {
    console.log("Trying to delete Scenario in Issue: " + req.params.issueID + " with ID: " + req.params.scenarioID);
    let result = db.deleteScenario(parseInt(req.params.issueID), parseInt(req.params.scenarioID));
    if (typeof (result) === "string") {
      handleError(res, result, result, 500);
      console.log("Could not delete Scenario.");
    }
    if (result === true) {
      res.status(200).json({});
      console.log("Scenario deleted.");
    }
    helper.updateFeatureFiles(req.params, stories);
  })

  //run single Feature
  //Using random numbers right now. When cucumber Integration is complete this should handle the actual calculations
  .get("/api/runFeature/:issueID", function (req, res) {
    helper.featureReport(req, res, stories);
  })

  //run single Scenario of a Feature
  .get("/api/runScenario/:issueID/:scenarioID", function (req, res) {
    helper.scenarioReport(req, res, stories);
  });

function getOwnRepositories(token, callback){
  let request = new XMLHttpRequest();

  request.open('GET', 'https://api.github.com/user/repos',true, 'account_name' , token);


  // get Issues from GitHub
  
  let repos;
  //request.setRequestHeader("Authorization", 'Basic 56cc02bcf1e3083f574d14138faa1ff0a6c7b9a1');
  request.send();
  request.onreadystatechange = function () {
    //console.log("readyState: " + this.readyState + " status: " + this.status +" "+ this.statusText)
    if (this.readyState === 4 && this.status === 200) {
      let data = JSON.parse(request.responseText);
      var names = []
      let index = 0;
      for(let repo of data){
        let repoName = repo.full_name;
        names[index] = repoName;
        index++;
      }
      callback(names);
      //console.log("getRepo: " + names)
      
    }
  };

}

function getStarredRepositories(githubName, token, callback){
  let request = new XMLHttpRequest();
  console.log("githubname: " + githubName)
  request.open('GET', 'https://api.github.com/users/' + githubName +'/starred',true , githubName, token);


  // get Issues from GitHub
  
  //request.setRequestHeader("Authorization", 'Basic 56cc02bcf1e3083f574d14138faa1ff0a6c7b9a1');
  request.send();
  request.onreadystatechange = function () {
    //console.log("readyState: " + this.readyState + " status: " + this.status +" "+ this.statusText)
    if (this.readyState === 4 && this.status === 200) {
      let data = JSON.parse(request.responseText);
      var names = []
      let index = 0;
      for(let repo of data){
        let repoName = repo.full_name;
        names[index] = repoName;
        index++;
      }
      //console.log("getStarred: " + names);
      callback(names)
    }else{
      if(this.readyState === 4){
        console.log("error for starred " + this.status)
      }
      
    }
  };
}

module.exports = app;


