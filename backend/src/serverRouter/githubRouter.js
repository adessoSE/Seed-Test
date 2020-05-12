const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const process = require('process');
const fetch = require('node-fetch');
const helper = require('../serverHelper');
const {GithubError, UserError} = require('../errors/CustomErrors')
const mongo = require('../database/mongodatabase');
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
router.get('/stories/:githubName?/:repository?', async (req, res) => {
  let githubName;
  let githubRepo;
  let token;
  if(req.user){
    githubName = req.params.githubName;
    githubRepo = req.params.repository;
    token = req.user.github.githubToken;
  }else{
    githubName = process.env.TESTACCOUNT_NAME;
    githubRepo = process.env.TESTACCOUNT_REPO;
    token = process.env.TESTACCOUNT_TOKEN;
  }
  try{
    let results = await helper.getGithubStories(githubName, githubRepo, token, res, req)
    if(results) res.status(200).json(results);
  } catch(error){
    if(error instanceof GithubError){
      res.status(401).send(error.message);
    }
    else {
      res.status(503).send(error.message);
    }
  }
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
      res.status(200).json(json);
    });
});

router.delete('/disconnectGithub', (req, res) => {
  let user = req.user;
  if(user && user.github){
    delete user.github;
    let result = mongo.disconnectGithub(user);
    res.status(200).json(result);
  }else {
    res.sendStatus(400);
  }
});


// Gets all possible repositories from Github
router.get('/repositories', (req, res) => {
  let githubName;
  let token;
  if (req.user) {
    if(req.user.github){
      githubName = req.user.github.login;
      token = req.user.github.githubToken;
    } else {
      res.status(200).json([])
      return;
      //throw new UserError('No Github')
    }
  }else {
    githubName = process.env.TESTACCOUNT_NAME;
    token = process.env.TESTACCOUNT_TOKEN;
  }
 
  Promise.all([
    helper.starredRepositories(githubName, token),
    helper.ownRepositories(githubName, token),
  ]).then((repos) => {
    const merged = [].concat(...repos);
    res.status(200).json(merged);
  }).catch((reason) => {
    res.status(400).json('Wrong Github name or Token');
    console.log(`Get Repositories Error: ${reason}`);
  });
});

module.exports = router;
