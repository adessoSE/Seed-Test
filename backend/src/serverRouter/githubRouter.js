const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const process = require('process');
const fetch = require('node-fetch');
const helper = require('../serverHelper');

const router = express.Router();
// router for all github requests
router
  .use(cors())
  .use(bodyParser.json({ limit: '100kb' }))
  .use(bodyParser.urlencoded({ limit: '100kb', extended: true }))
  .use((_, __, next) => {
    console.log('Time of github request:', Date.now());
    next();
  })
  .use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "http://localhost:4200");
    res.header('Access-Control-Allow-Credentials','true' );
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Credentials");
   next();
  });

// get stories from github
router.get('/stories/:repository', async (req, res) => {
  const githubName = req.user.githubAccountName;
  const githubRepo = req.params.repository;
  let token = req.user.githubToken;
  if (!token || !githubName ||  ! githubRepo) {
    githubName = process.env.TESTACCOUNT_NAME
    token = process.env.TESTACCOUNT_TOKEN;
    githubRepo = 'Cucumber'
  }
  
  let results = await helper.getGithubStories(githubName, githubRepo, token, res)
  if(results) res.status(200).json(results);
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
router.get('/repositories', (req, res) => {
  let { token } = req.user.githubToken;
  const { githubName } = req.user.githubAccountName;
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
