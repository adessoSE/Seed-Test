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
  })
  .use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "http://localhost:4200");
    res.header('Access-Control-Allow-Credentials','true' );
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Credentials");
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
