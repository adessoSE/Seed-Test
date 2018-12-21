let express = require('express');
let cors = require('cors');
let bodyParser = require("body-parser");
let app = express();
let XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
let db = require('./database');
let stories_db = require('./database').stories;

// Initialize the app.
let server = app.listen(process.env.PORT || 8080, function () {
  let port = server.address().port;
  console.log("App now running on port", port);
});

// TODO: priority 2 for every api
function handleError(res, reason, statusMessage, code) {
  console.log("ERROR: " + reason);
  res.status(code || 500).json({"error": statusMessage});
}

/**
 * API Description
 */
app
  .use(cors())
  .use(bodyParser.json({limit: '100kb'}))
  .use(bodyParser.urlencoded({limit: '100kb', extended: true}))
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
    res.write('<p>/api/scenario/add/:issueID</p>');
    res.write('<h2>POST</h2>');
    res.write('<p>/api/scenario/update/:issueID</p>');
    res.write('<h2>DELETE</h2>');
    res.write('<p>/api/story/:issueID/scenario/delete/:issueID</p>');
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
    request.open('GET', 'https://api.github.com/repos/fr4gstar/Cucumber/issues?labels=story');
    request.send();
    request.onreadystatechange=function(){
      if (this.readyState===4 && this.status===200){
        let data = JSON.parse(request.responseText);
        // init result
        let stories = [];
        for(let issue of data) {
          // only relevant issues with label: "story"
            let story = {story_id: issue["id"], title: issue["title"], body: issue["body"], state: issue['state']};
            if (issue["assignee"] !== null) { // skip in case of "unassigned"
              story["assignee"] = issue["assignee"]["login"];
              story["assignee_avatar_url"] = issue["assignee"]["avatar_url"];
            }
            if (stories_db.findOne({story_id: story.story_id}) != null) { // skip if there is no data for the issue yet
              story["scenarios"] = stories_db.findOne({story_id: story.story_id}).scenarios;
            }
            stories_db.insert(story); // update database
            //TODO: delete stories priority 2
            stories.push(story);
        }
        res.status(200).json(stories);
        console.log("Returning stories.")
      }
    };
  })
  // create scenario
  .get("/api/scenario/add/:issueID", function(req, res) {
    if (db.createScenario(parseInt(req.params.issueID))){
      res.status(200);
      console.log("Scenario created.");
    }else {
      console.log("Could not create scenario.");
      res.status(500);
    }
  })
  // update scenario
  .post("/api/scenario/update/:issueID", function (req, res) {
    // TODO use model to check for scenario (priority 2)
    let scenario = req.body;
    console.log("Trying to update scenario in issue: " + req.params.issueID + " with ID: " + scenario.scenario_id);
    if (db.updateScenario(parseInt(req.params.issueID), scenario)){
      res.status(200);
      console.log("Scenario updated.");
    }else {
      console.log("Could not update the scenario.");
      res.status(500);
    }
  })
  // delete scenario
  .delete("/api/story/:issueID/scenario/delete/:scenarioID", function (req, res) {
    console.log("Trying to delete Scenario in Issue: " + req.params.issueID + " with ID: " + req.params.scenarioID);
    if (db.deleteScenario(parseInt(req.params.issueID), req.params.scenarioID)) {
      res.status(200).json({});
      console.log("Scenario deleted.");
    }else {
      console.log("Could not delete Scenario.");
      res.status(500).json({});
    }
  });

module.exports = app;
