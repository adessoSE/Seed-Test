const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { XMLHttpRequest } = require('xmlhttprequest');
const process = require('process');
const db = require('./database/database');
const storiesDB = require('./database/database').stories;
const emptyScenario = require('./models/emptyScenario');
const emptyBackground = require('./models/emptyBackground');

const app = express();
const accessToken = '119234a2e8eedcbe2f6f3a6bbf2ed2f56946e868'; // This is a personal access token, not sure how to handle correctly for multi-user
// const access_token_new = '56cc02bcf1e3083f574d14138faa1ff0a6c7b9a1';
const helper = require('./serverHelper');

let githubName;
let githubRepo;
let stories = [];

// Initialize the app.
const server = app.listen(process.env.PORT || 8080, () => {
  const { port } = server.address();
  console.log('App now running on port', port);
});

// Handling response errors
function handleError(res, reason, statusMessage, code) {
  console.log(`ERROR: ${reason}`);
  res.status(code || 500).json({ error: statusMessage });
}

/**
 * API Description
 */
app
  .use(cors())
  .use(bodyParser.json({ limit: '100kb' }))
  .use(bodyParser.urlencoded({ limit: '100kb', extended: true }))
  .use((req, res, next) => {
    console.log('Time:', Date.now());
    // console.log('%r %s %n', req, res, next);
    next();
  })
  .get('/api', (req, res) => {
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
  .get('/api/stepDefinitions', (req, res) => {
    res.status(200).json(db.showStepdefinitions());
  })

  .get('/api/stories/:user?/:repository?', (req, res) => {
    if (req.params.repository) {
      githubName = req.params.user;
      githubRepo = req.params.repository;
    } else {
      githubName = 'adessoCucumber';
      githubRepo = 'Cucumber';
    }

    stories = [];
    // get Issues from GitHub
    const request = new XMLHttpRequest();
    request.open('GET', `https://api.github.com/repos/${githubName}/${githubRepo}/issues?labels=story&access_token=${accessToken}`);
    request.send();
    request.onreadystatechange = function () {
      if (this.readyState === 4 && this.status === 200) {
        const data = JSON.parse(request.responseText);
        // init result
        // let stories = [];
        for (const issue of data) {
          // only relevant issues with label: "story"
          const story = {
            story_id: issue.id,
            title: issue.title,
            body: issue.body,
            state: issue.state,
            issue_number: issue.number,
          };
          if (issue.assignee !== null) { // skip in case of "unassigned"
            story.assignee = issue.assignee.login;
            story.assignee_avatar_url = issue.assignee.avatar_url;
          }
          // skip if there is no data for the issue yet
          if (storiesDB.findOne({ story_id: issue.id }) !== null) {
            story.scenarios = storiesDB.findOne({ story_id: issue.id }).scenarios;
            story.background = storiesDB.findOne({ story_id: issue.id }).background;
          } else {
            story.scenarios = [emptyScenario()];
            story.background = emptyBackground();
          }
          storiesDB.insert(story); // update database
          // Create & Update Feature Files
          helper.writeFile('', story);
          // TODO: delete stories and save some storage
          stories.push(story);
        }
        res.status(200).json(stories);
        console.log('Returning stories.');
      }
    };
  })
  .get("/api/repositories/:token?/:githubName?", function (req, res) {
    let token = req.params.token;
    let ownRepositories;
    let bool1; let bool2 = false;
    getOwnRepositories(token, (repos) => {
      ownRepositories = repos;

      if (bool2) {
        const concat = ownRepositories.concat(starredRepositories);
        res.status(200).json(concat);
      } else {
        bool1 = true;
      }
    });
    let starredRepositories;
    getStarredRepositories(req.params.githubName, token, (stars) => {
      starredRepositories = stars;
      if (bool1) {
        const concat = ownRepositories.concat(starredRepositories);
        res.status(200).json(concat);
      } else {
        bool2 = true;
      }
    });
  })

  // .get('/testResult', (req, res) => {
  //   helper.setRespReport(res);
  // })
  .get('/api/downloadTest', (req, res) => {
    helper.sendDownloadResult(res);
  })


  // create Background
  .get('/api/background/add/:issueID', (req, res) => {
    const background = db.createBackground(parseInt(req.params.issueID, 100));
    if (typeof (background) === 'string') {
      handleError(res, background, background, 500);
    } else {
      res.status(200).json(background);
      console.log('Background created');
    }
    helper.updateFeatureFiles(req.params, stories);
  })

// update background
  .post('/api/background/update/:issueID', (req, res) => {
    const background = req.body;
    const updatedBackground = db.updateBackground(parseInt(req.params.issueID, 100), background);
    if (typeof (updatedBackground) === 'string') {
      handleError(res, updatedBackground, updatedBackground, 500);
    } else {
      res.status(200).json(updatedBackground);
    }
    helper.updateFeatureFiles(req.params, stories);
  })

// delete background
  .delete('/api/story/:issueID/background/delete/', (req, res) => {
    const result = db.deleteBackground(parseInt(req.params.issueID, 100));
    if (typeof (result) === 'string') {
      handleError(res, result, result, 500);
      console.log('Could not delete Background.');
    }
    if (result === true) {
      res.status(200).json({});
      console.log('Background deleted.');
    }
    helper.updateFeatureFiles(req.params, stories);
  })


  // create scenario
  .get('/api/scenario/add/:issueID', (req, res) => {
    const scenario = db.createScenario(parseInt(req.params.issueID, 100));
    if (typeof (scenario) === 'string') {
      handleError(res, scenario, scenario, 500);
    } else {
      res.status(200).json(scenario);
      console.log('Scenario created');
    }
    helper.updateFeatureFiles(req.params, stories);
  })

  // update scenario
  .post('/api/scenario/update/:issueID', (req, res) => {
    // TODO: use model to check for scenario (priority 2)
    const scenario = req.body;
    console.log(`Trying to update scenario in issue: ${req.params.issueID} with ID: ${scenario.scenario_id}`);
    const updatedScenario = db.updateScenario(parseInt(req.params.issueID, 100), scenario);
    if (typeof (updatedScenario) === 'string') {
      handleError(res, updatedScenario, updatedScenario, 500);
    } else {
      res.status(200).json(updatedScenario);
      console.log('Scenario', scenario.scenario_id, 'updated in Story', req.params.issueID);
    }
    helper.updateFeatureFiles(req.params, stories);
  })

  // delete scenario
  .delete('/api/story/:issueID/scenario/delete/:scenarioID', (req, res) => {
    console.log(`Trying to delete Scenario in Issue: ${req.params.issueID} with ID: ${req.params.scenarioID}`);
    const result = db.deleteScenario(parseInt(req.params.issueID, 100),
      parseInt(req.params.scenarioID, 100));
    if (typeof (result) === 'string') {
      handleError(res, result, result, 500);
      console.log('Could not delete Scenario.');
    }
    if (result === true) {
      res.status(200).json({});
      console.log('Scenario deleted.');
    }
    helper.updateFeatureFiles(req.params, stories);
  })

  // run single Feature
  .get('/api/runFeature/:issueID', (req, res) => {
    helper.runReport(req, res, stories, 'feature');
  })

  // run single Scenario of a Feature
  .get('/api/runScenario/:issueID/:scenarioID', (req, res) => {
    helper.runReport(req, res, stories, 'scenario');
  })
  .get("/api/repositories/:token?/:githubName?", function (req, res) {
    let token = req.params.token;
    let githubName = req.params.githubName;
    let ownRepositories;
    let bool1; let
      bool2 = false;
    getOwnRepositories(token, (repos) => {
      if (repos != null && !res.headersSent) {
        ownRepositories = repos;
        if (bool2) {
          const concat = ownRepositories.concat(starredRepositories);
          res.status(200).json(concat);
        } else {
          bool1 = true;
        }
      } else if (bool2) {
        res.status(401).json('Wrong Token');
      } else {
        bool1 = true;
      }
    });
    let starredRepositories;
    getStarredRepositories(req.params.githubName, token, (stars) => {
      if (stars != null && !res.headersSent) {
        starredRepositories = stars;
        if (bool1) {
          const concat = ownRepositories.concat(starredRepositories);
          res.status(200).json(concat);
        } else {
          bool2 = true;
        }
      } else if (bool1) {
        res.status(401).json('Wrong Github Name');
      } else {
        bool2 = true;
      }
    });
  });

function getOwnRepositories(token, callback) {
  const request = new XMLHttpRequest();

  request.open('GET', 'https://api.github.com/user/repos', true, 'account_name', token);
  // get Issues from GitHub

  // request.setRequestHeader("Authorization", 'Basic 56cc02bcf1e3083f574d14138faa1ff0a6c7b9a1');
  request.send();
  request.onreadystatechange = function () {
    // console.log(
    // "readyState: " + this.readyState + " status: " + this.status +" "+ this.statusText)
    if (this.readyState === 4 && this.status === 200) {
      const data = JSON.parse(request.responseText);
      const names = [];
      let index = 0;
      for (const repo of data) {
        const repoName = repo.full_name;
        names[index] = repoName;
        index++;
      }
      callback(names);
      // console.log("getRepo: " + names)
    } else if (this.readyState === 4) {
      callback(null);
    }
  };
}

function getStarredRepositories(ghName, token, callback) {
  const request = new XMLHttpRequest();
  console.log(`githubname: ${ghName} token: ${token}`);
  request.open('GET', `https://api.github.com/users/${ghName}/starred`, true, ghName, token);
  // get Issues from GitHub

  // request.setRequestHeader("Authorization", 'Basic 56cc02bcf1e3083f574d14138faa1ff0a6c7b9a1');
  request.send();
  request.onreadystatechange = function () {
    // console.log("readyState: " + this.readyState + " status: " + this.status +" "+ this.statusText)
    if (this.readyState === 4 && this.status === 200) {
      const data = JSON.parse(request.responseText);
      const names = [];
      let index = 0;
      for (const repo of data) {
        const repoName = repo.full_name;
        names[index] = repoName;
        index++;
      }
      // console.log("getStarred: " + names);
      callback(names);
    } else if (this.readyState === 4) {
      callback(null);
    }
  };
}

module.exports = app;
