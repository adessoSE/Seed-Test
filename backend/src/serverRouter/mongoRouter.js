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
router.get('/stepTypes', async (_, res) => {
  try {
    let result = await mongo.showSteptypes()
    res.status(200).json(result);
  } catch (error) {
    handleError(res, error, error, 500);
  }
});

// update background
router.post('/background/update/:issueID', async (req, res) => {
  try {
    const background = req.body;
    let result = await mongo.updateBackground(parseInt(req.params.issueID, 10), background)
    helper.updateFeatureFile(parseInt(req.params.issueID, 10));
    res.status(200).json(result);
  } catch (error) {
    handleError(res, error, error, 500);
  }
});
// delete background
router.delete('/background/delete/:issueID/', async (req, res) => {
  try {
    await mongo.deleteBackground(parseInt(req.params.issueID, 10))
    helper.updateFeatureFile(parseInt(req.params.issueID, 10));
    res.status(200).json({});
  } catch (error) {
    handleError(res, error, error, 500);
  }
});
// create scenario
router.get('/scenario/add/:issueID', async (req, res) => {
  try {
    let scenario = await mongo.createScenario(parseInt(req.params.issueID, 10))
    helper.updateFeatureFile(parseInt(req.params.issueID, 10));
    res.status(200).json(scenario);
  } catch (error) {
    handleError(res, error, error, 500);
  }
});
// update scenario
router.post('/scenario/update/:issueID', async (req, res) => {
  try {
    const scenario = req.body;
    let updatedStory = await mongo.updateScenario(parseInt(req.params.issueID, 10), scenario)
    helper.updateFeatureFile(parseInt(req.params.issueID, 10));
    res.status(200).json(updatedStory);
  } catch (error) {
    handleError(res, error, error, 500);
  }
});
// delete scenario
router.delete('/scenario/delete/:issueID/:scenarioID', async (req, res) => {
  try {
    await mongo.deleteScenario(parseInt(req.params.issueID, 10), parseInt(req.params.scenarioID, 10))
    helper.updateFeatureFile(parseInt(req.params.issueID, 10));
    res.status(200).json({});
  } catch (error) {
    handleError(res, error, error, 500);
  }
});
// create user
router.post('/user/add', async (req, res) => {
  try {
    const user = req.body;
    let result = await mongo.createUser(user)
    res.status(200).json(result);
  } catch (error) {
    handleError(res, error, error, 500);
  }
});
// update user
router.post('/user/update/:userID', async (req, res) => {
  try {
    const user = req.body;
    let updatedUser = await mongo.updateUser(parseInt(req.params.userID, 10), user)
    res.status(200).json(updatedUser);
  } catch (error) {
    handleError(res, error, error, 500);
  }
});
// delete user
router.delete('/user/delete/:userID', async (req, res) => {
  try {
    await mongo.deleteUser(parseInt(req.params.userID, 10))
    res.status(200);
  } catch (error) {
    handleError(res, error, error, 500);
  }
});
// get userObject
router.get('/user/:userID', async (req, res) => {
  try {
    let result = await mongo.getUserData(parseInt(req.params.userID, 10))
    res.status(200).json(result);
  } catch (error) {
    handleError(res, error, error, 500);
  }
});

module.exports = router;
