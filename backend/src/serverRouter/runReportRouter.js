const express = require('express');
const cors = require('cors');
const helper = require('../serverHelper');

const router = express.Router();
const stories = [];
// This router is used for accessing Cucumber/Selenium Reports
router
  .use(cors())
  .use((_, __, next) => {
    console.log('Time of submitted Run:', Date.now());
    next();
  });
// run single Feature
router.get('/Feature/:issueID', (req, res) => {
  helper.runReport(req, res, stories, 'feature');
});

// run single Scenario of a Feature
router.get('/Scenario/:issueID/:scenarioID', (req, res) => {
  helper.runReport(req, res, stories, 'scenario');
});

module.exports = router;
