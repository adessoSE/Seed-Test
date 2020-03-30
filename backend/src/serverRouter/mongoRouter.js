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
  .use((_, __, next) => {
    console.log('Time of mongoDB request:', Date.now());
    next();
  });
// get steptypes from mongo
router.get('/stepTypes', (_, res) => {
  mongo.showSteptypes((result) => {
    res.status(200).json(result);
  });
});
// update background
router.post('/background/update/:issueID', (req, res) => {
  const background = req.body;
  mongo.updateBackground(parseInt(req.params.issueID, 10), background, (result) => {
    if (typeof (result) === 'string') {
      handleError(res, result, result, 500);
    } else {
      helper.updateFeatureFile(parseInt(req.params.issueID, 10));
      res.status(200).json(result);
    }
  });
});
// delete background
router.delete('/background/delete/:issueID/', (req, res) => {
  mongo.deleteBackground(parseInt(req.params.issueID, 10), (result) => {
    if (typeof (result) === 'string') {
      handleError(res, result, result, 500);
    } else {
      helper.updateFeatureFile(parseInt(req.params.issueID, 10));
      res.status(200).json({});
    }
  });
});
// create scenario
router.get('/scenario/add/:issueID', (req, res) => {
  mongo.createScenario(parseInt(req.params.issueID, 10), (scenario) => {
    if (typeof (scenario) === 'string') {
      handleError(res, scenario, scenario, 500);
    } else {
      helper.updateFeatureFile(parseInt(req.params.issueID, 10));
      res.status(200).json(scenario);
    }
  });
});
// update scenario
router.post('/scenario/update/:issueID', (req, res) => {
  const scenario = req.body;
  mongo.updateScenario(parseInt(req.params.issueID, 10), scenario, (updatedStory) => {
    if (typeof (updatedStory) === 'string') {
      handleError(res, updatedStory, updatedStory, 500);
    } else {
      helper.updateFeatureFile(parseInt(req.params.issueID, 10));
      res.status(200).json(updatedStory);
    }
  });
});
// delete scenario
router.delete('/scenario/delete/:issueID/:scenarioID', (req, res) => {
  mongo.deleteScenario(parseInt(req.params.issueID, 10),
    parseInt(req.params.scenarioID, 10), (result) => {
      if (typeof (result) === 'string') {
        handleError(res, result, result, 500);
      } else {
        helper.updateFeatureFile(parseInt(req.params.issueID, 10));
        res.status(200).json({});
      }
    });
});

module.exports = router;
