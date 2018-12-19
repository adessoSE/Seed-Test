var express = require("express");
var cors = require('cors');
var bodyParser = require("body-parser");
var app = express();
app.use(bodyParser.json({limit: '100kb'}));
app.use(bodyParser.urlencoded({limit: '100kb', extended: true}));
var _ = require("underscore");
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var db = require('./database');
var stories_db = require('./database').stories;

// Initialize the app.
var server = app.listen(process.env.PORT || 8080, function () {
  var port = server.address().port;
  console.log("App now running on port", port);
});

// TODO: use this?
function handleError(res, reason, message, code) {
  console.log("ERROR: " + reason);
  res.status(code || 500).json({"error": message});
}
function isStory(story){
  if (story['labels'] != null) {
    for (let label of story['labels']) {
      if(label['name'] === "story"){
        return true;
      }
    }
  }
  return false;
}
/**
 * API Description
 */
app
  .use(cors())
  .use(function (req, res, next) {
    console.log('Time:', Date.now());
    console.log('%r %s %n',req, res, next);
    next();
  })
  .get("/api", function (req, res) {
    res.writeHead(200, {'content-type': 'text/html'});
    res.write('<h1>Cucumber-API</h1>');
    res.write('<h2>WORKING:</h2>');
    res.write('<h2>GET</h2>');
    res.write('<p>/api/stories</p>');
    res.write('<p>/api/stepDefinitions</p>');

    res.write('<h2>NOT TESTED:</h2>');
    res.write('<h2>POST</h2>');
    res.write('<p>/api/scenario/add/:issueID</p>');
    res.write('<p>/api/scenario/update/:issueID</p>');
    res.write('<h2>DELETE</h2>');
    res.write('<p>/api/scenario/delete/:issueID</p>');

    res.status(200);
    res.end();
  })
  /**
   * Scenarios API
   */
  .get("/api/stepDefinitions", function (req, res, next) {
    res.status(200).json(db.showStepdefinitions());
  })
  .get("/api/stories", function (req, res) {
    // get Issues from GitHub
    let request = new XMLHttpRequest();
    request.open('GET', 'https://api.github.com/repos/fr4gstar/cucumber/issues');
    request.send();
    request.onreadystatechange=function(){
      if (this.readyState===4 && this.status===200){
        let data = JSON.parse(request.responseText);
        // init result
        let stories = [];
        for(let issue of data) {
          // only relevant issues with label: "story"
          if (isStory(issue)) {
            let story = {story_id: issue["id"], title: issue["title"], body: issue["body"]};
            if (issue["assignee"] !== null) { // skip in case of "unassigned"
              story["assignee"] = issue["assignee"]["login"];
              story["assignee_avatar_url"] = issue["assignee"]["avatar_url"];
            }
            if (stories_db.findOne({git_issue_id: story["story_id"]}) != null) { // skip if there is no data for the issue yet
              story["scenarios"] = stories_db.findOne({git_issue_id: story["story_id"]}).scenarios;
            }
            stories_db.insert(story); // update database
            stories.push(story);
          }
        }
        res.status(200).json(stories);
      }
    };
  })
  // create scenario
  .get("/api/scenario/add/:issueID", function(req, res) {
    if (db.createScenario(parseInt(req.params.issueID))){
      console.log("Scenario created.")
      res.status(200).json({});
    }else {
      console.log("Could not create scenario.")
      res.status(500).json({});
    }
  })
  // update scenario
  .post("/api/scenario/update/:issueID", function (req, res) {
    let scenario = req.body;
    console.log("Trying to update scenario in issue: " + req.params.issueID + " with ID: " + scenario.scenario_id);
    if (db.updateScenario(parseInt(req.params.issueID), scenario)){
      res.status(200).json({});
      console.log("Scenario updated.")
    }else {
      console.log("Could not update the scenario.");
      res.status(500).json({});;
    }
  })
  // delete scenario
  .delete("/api/story/:issueID/scenario/delete/:scenarioID", function (req, res) {
    console.log("Trying to delete Scenario in Issue: " + req.params.issueID + " with ID: " + req.params.scenarioID);
    if (db.deleteScenario(parseInt(req.params.issueID), req.params.scenarioID)) {
      res.status(200).json({})
    }else {
      console.log("Could not delete Scenario.");
      res.status(500).json({})
    }
  });

module.exports = app;
