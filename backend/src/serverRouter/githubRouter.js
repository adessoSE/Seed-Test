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
    res.header("Access-Control-Allow-Origin", process.env.FRONTEND_URL);
    res.header('Access-Control-Allow-Credentials','true' );
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Credentials");
   next();
  });



// submits new StepType-Request as an Issue to our github
router.post('/submitIssue/', (req, res) => {
  const { body } = req;
  const token = process.env.TESTACCOUNT_TOKEN;
  try{
    fetch('https://api.github.com/repos/adessoAG/Seed-Test/issues', {
      method: 'post',
      body: JSON.stringify(body),
      headers: { Authorization: `token ${token}` },
    })
      .then(response => response.json())
      .then((json) => {
        res.status(200).json(json);
      });
  } catch(e){
    res.status(400).json(e);
  }
  
});

router.delete('/disconnectGithub', (req, res) => {
  let user = req.user;
  if(user && user.github){
    try{
      delete user.github;
      let result = mongo.disconnectGithub(user);
      res.status(200).json(result);
    } catch(e){
      res.status(400).json(e);
    }
  }else {
    res.sendStatus(400);
  }
});


module.exports = router;
