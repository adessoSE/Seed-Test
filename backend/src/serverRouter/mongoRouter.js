const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helper = require('../serverHelper');
const mongo = require('../database/mongodatabase');

const router = express.Router();

// Handling response errors
function handleError(res, reason, statusMessage, code) {
  console.error(`ERROR: ${reason}`);
  res.status(code || 500).json({ error: statusMessage });
}

// router for all mongo requests
router
  .use(cors())
  .use(bodyParser.json({ limit: '100kb' }))
  .use(bodyParser.urlencoded({ limit: '100kb', extended: true }))
  .use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "http://localhost:4200");
    res.header('Access-Control-Allow-Credentials','true' );
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Credentials");
   next();
  })
  .use((_, __, next) => {
    console.log(_.url + JSON.stringify(_.user))
    console.log('Time of mongoDB request:', Date.now());
    next();
  });
// get steptypes from mongo
router.get('/stepTypes', async (_, res) => {
  console.log('headers: ' + JSON.stringify(_.headers))
  let result = await mongo.showSteptypes()
  //res.header("Access-Control-Allow-Origin", "http://localhost:4200");
  //res.header('Access-Control-Allow-Credentials','true' );
  //res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Credentials");
  res.status(200).json(result);
});

// update background
router.post('/background/update/:issueID', async (req, res) => {
  const background = req.body;
  let result = await mongo.updateBackground(parseInt(req.params.issueID, 10), background)
  if (typeof (result) === 'string') {
    handleError(res, result, result, 500);
  } else {
    helper.updateFeatureFile(parseInt(req.params.issueID, 10));
    res.status(200).json(result);
  }
});
// delete background
router.delete('/background/delete/:issueID/', async (req, res) => {
  let result = await mongo.deleteBackground(parseInt(req.params.issueID, 10))
  if (typeof (result) === 'string') {
    handleError(res, result, result, 500);
  } else {
    helper.updateFeatureFile(parseInt(req.params.issueID, 10));
    res.status(200).json({});
  }
});
// create scenario
router.get('/scenario/add/:issueID', async (req, res) => {
  let scenario = await mongo.createScenario(parseInt(req.params.issueID, 10))
  if (typeof (scenario) === 'string') {
    handleError(res, scenario, scenario, 500);
  } else {
    helper.updateFeatureFile(parseInt(req.params.issueID, 10));
    res.status(200).json(scenario);
  }
});
// update scenario
router.post('/scenario/update/:issueID', async (req, res) => {
  const scenario = req.body;
  let updatedStory = await mongo.updateScenario(parseInt(req.params.issueID, 10), scenario)
  if (typeof (updatedStory) === 'string') {
    handleError(res, updatedStory, updatedStory, 500);
  } else {
    helper.updateFeatureFile(parseInt(req.params.issueID, 10));
    res.status(200).json(updatedStory);
  }
});
// delete scenario
router.delete('/scenario/delete/:issueID/:scenarioID', async (req, res) => {
  let result = await mongo.deleteScenario(parseInt(req.params.issueID, 10), parseInt(req.params.scenarioID, 10))
  if (typeof (result) === 'string') {
    handleError(res, result, result, 500);
  } else {
    helper.updateFeatureFile(parseInt(req.params.issueID, 10));
    res.status(200).json({});
  }
});

module.exports = router;
