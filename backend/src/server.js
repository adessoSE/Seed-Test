const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { XMLHttpRequest } = require('xmlhttprequest');
const process = require('process');
const mongo = require('./database/mongodatabase');

const app = express();
const accessToken = '56cc02bcf1e3083f574d14138faa1ff0a6c7b9a1'; // This is a personal access token, not sure how to handle correctly for multi-user
// const access_token_new =
// '56cc02bcf1e3083f574d14138faa1ff0a6c7b9a1';119234a2e8eedcbe2f6f3a6bbf2ed2f56946e868';
const helper = require('./serverHelper');

//This variable is for the github name
let githubName;
var githubRepo;
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
    next();
  })
  .get('/api', (req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.write('<h1>Cucumber-API</h1>');
    res.write('<h2>Check out our <a href="https://cucumber-app.herokuapp.com"title="https://cucumber-app.herokuapp.com">Seed-Test WebApp</a>.</h2>');
    res.write('<h2>Or visit us on <a href="https://github.com/adessoCucumber/Cucumber"title="https://github.com/adessoCucumber/Cucumber">Github</a>' +
        ' for further information.</h2>');
    res.write('<h3>Happy Testing!</h3>');
    res.status(200);
    res.end();
  })
  /**
   * Scenarios API
   */
  .get('/api/stepDefinitions', (req, res) => {
    mongo.showStepdefinitions((result) => {
      res.status(200).json(result);
    });
  })

  .get('/api/stories/:user?/:repository?', async (req, res) => {
    if (req.params.repository) {
      githubName = req.params.user;
      this.githubRepo = req.params.repository;
    } else { // TODO: wird das noch benötigt?
      githubName = 'adessoCucumber';
      this.githubRepo = 'Cucumber';
    }

    const tmpStories = [];
    // get Issues from GitHub .
    const request = new XMLHttpRequest();
    request.open('GET', `https://api.github.com/repos/${githubName}/${this.githubRepo}/issues?labels=story&access_token=${accessToken}`);
    request.send();
    request.onreadystatechange = function () {
      if (this.readyState === 4 && this.status === 200) {
        const data = JSON.parse(request.responseText);
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
          }else{
            story.assignee = 'unassigned';
            story.assignee_avatar_url = 'https://cdn.pixabay.com/photo/2016/08/08/09/17/avatar-1577909_960_720.png';
          }
          tmpStories.push(helper.fuseGitWithDb(story, issue.id));
        }
        Promise.all(tmpStories).then((results) => {
          res.status(200).json(results);
          stories = results; // need this to clear promises from the Story List TODO: better fix it in "fuseGitWithDB"
        }).catch((e) => {
          console.log(e);
          // TODO: handle Error
        });
      }
    };
  })
  // .get('/testResult', (req, res) => {
  //   helper.setRespReport(res);
  // })
  .get('/api/downloadTest', (req, res) => {
    helper.sendDownloadResult(res);
  })


  // create Background
  .get('/api/background/add/:issueID', (req, res) => {
    mongo.createBackground(parseInt(req.params.issueID, 100), (result) => {
      if (typeof (result) === 'string') {
        handleError(res, '"result" is not of type string', 'Error: /api/background/add/:issueID', 500);
      } else {
        res.status(200).json(result);
      }
    });
    helper.updateFeatureFiles(req.params, stories);
  })

  // update background
  .post('/api/background/update/:issueID', (req, res) => {
    const background = req.body;
    mongo.updateBackground(parseInt(req.params.issueID, 10), background, (result) => {
      if (typeof (result) === 'string') {
        handleError(res, result, result, 500);
      } else {
        res.status(200).json(result);
      }
    });
    helper.updateFeatureFiles(req.params, stories);
  })

  // delete background
  .delete('/api/story/:issueID/background/delete/', (req, res) => {
    mongo.deleteBackground(parseInt(req.params.issueID, 10), (result) => {
      if (typeof (result) === 'string') {
        handleError(res, result, result, 500);
      } else {
        res.status(200).json({});
      }
    })
    helper.updateFeatureFiles(req.params, stories);
  })

  // create scenario
  .get('/api/scenario/add/:issueID', (req, res) => {
    mongo.createScenario(parseInt(req.params.issueID, 10), (scenario) => {
      if (typeof (scenario) === 'string') {
        handleError(res, scenario, scenario, 500);
      } else {
        res.status(200).json(scenario);
      }
    });
    //helper.updateFeatureFiles(req.params, stories);
  })

  // update scenario
  .post('/api/scenario/update/:issueID', (req, res) => {
    // TODO: use model to check for scenario (priority 2)
    const scenario = req.body;
    mongo.updateScenario(parseInt(req.params.issueID, 10), scenario, (updatedStory) => {
      if (typeof (updatedStory) === 'string') {
        handleError(res, updatedStory, updatedStory, 500);
      } else {
        helper.writeFile('', updatedStory);
        res.status(200).json(updatedStory);
      }
    })
    //helper.updateFeatureFiles(req.params, stories);
  })


  // delete scenario
  .delete('/api/story/:issueID/scenario/delete/:scenarioID', (req, res) => {
    mongo.deleteScenario(parseInt(req.params.issueID, 10),
      parseInt(req.params.scenarioID, 10), (result) => {
        if (typeof (result) === 'string') {
          handleError(res, result, result, 500);
        } else {
          res.status(200).json({});
        }
      });
    //helper.updateFeatureFiles(req.params, stories);
  })

  // run single Feature
  .get('/api/runFeature/:issueID', (req, res) => {
    helper.runReport(req, res, stories, 'feature');
  })

  // run single Scenario of a Feature
  .get('/api/runScenario/:issueID/:scenarioID', (req, res) => {
    helper.runReport(req, res, stories, 'scenario');
  })

  .get('/api/repositories/:token?/:githubName?', (req, res) => {
    const token = req.params.token;
    let ownRepositories;
    let bool1; let bool2 = false;
    let starredRepositories;
    helper.getOwnRepositories(token, (repos) => {
      ownRepositories = repos;
      if (bool2) {
        const concat = ownRepositories.concat(starredRepositories);
        res.status(200).json(concat);
      } else {
        bool1 = true;
      }
    });
    helper.getStarredRepositories(req.params.githubName, token, (stars) => {
      starredRepositories = stars;
      if (bool1) {
        const concat = ownRepositories.concat(starredRepositories);
        res.status(200).json(concat);
      } else {
        bool2 = true;
      }
    });
  });

module.exports = {app, githubRepo};