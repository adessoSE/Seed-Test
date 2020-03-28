const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const process = require('process');
const fetch = require('node-fetch');
const helper = require('../serverHelper');

const router = express.Router();
const unassignedAvatarLink = 'https://cdn.pixabay.com/photo/2016/08/08/09/17/avatar-1577909_960_720.png';
// router for all github requests
router
  .use(cors())
  .use(bodyParser.json({ limit: '100kb' }))
  .use(bodyParser.urlencoded({ limit: '100kb', extended: true }))
  .use((_, __, next) => {
    console.log('Time of github request:', Date.now());
    next();
  });

// get stories from github
router.get('/stories/:user/:repository/:token?', async (req, res) => {
  const githubName = req.params.user;
  const githubRepo = req.params.repository;
  let { token } = req.params;
  if (!token && githubName === process.env.TESTACCOUNT_NAME) {
    token = process.env.TESTACCOUNT_TOKEN;
  }
  const tmpStories = [];
  // get Issues from GitHub .
  const headers = {
    Authorization: `token ${token}`,
  };
  fetch(`https://api.github.com/repos/${githubName}/${githubRepo}/issues?labels=story`, { headers })
    .then((response) => {
      if (response.status === 401) {
        res.sendStatus(401);
      }
      if (response.status === 200) {
        response.json().then((json) => {
          for (const issue of json) {
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
            } else {
              story.assignee = 'unassigned';
              story.assignee_avatar_url = unassignedAvatarLink;
            }
            tmpStories.push(helper.fuseGitWithDb(story, issue.id));
          }
          Promise.all(tmpStories).then((results) => {
            res.status(200).json(results);
            // let stories = results; // need this to clear promises from the Story List
          }).catch((e) => {
            console.log(e);
          });
        });
      }
    })
    .catch(err => console.log(err));
});

// submits new StepType-Request as an Issue to our github
router.post('/submitIssue/', (req, res) => {
  const { body } = req;
  const token = process.env.TESTACCOUNT_TOKEN;
  fetch('https://api.github.com/repos/adessoAG/Seed-Test/issues', {
    method: 'post',
    body: JSON.stringify(body),
    headers: { Authorization: `token ${token}` },
  })
    .then(response => response.json())
    .then((json) => {
      console.log(json);
      res.status(200).json(json);
    });
});
// Gets all possible repositories from Github
router.get('/repositories/:githubName?/:token?', (req, res) => {
  let { token } = req.params;
  const { githubName } = req.params;
  if (!token && githubName === process.env.TESTACCOUNT_NAME) {
    token = process.env.TESTACCOUNT_TOKEN;
  }
  Promise.all([
    helper.starredRepositories(githubName, token),
    helper.ownRepositories(token),
  ]).then((repos) => {
    const merged = [].concat(...repos);
    // console.log(merged);
    res.status(200).json(merged);
  }).catch((reason) => {
    res.status(400).json('Wrong Github name or Token');
    console.log(`Get Repositories Error: ${reason}`);
  });
});

module.exports = router;
