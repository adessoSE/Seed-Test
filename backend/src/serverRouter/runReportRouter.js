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
	.use((req, res, next) => {
		res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL);
		res.header('Access-Control-Allow-Credentials', 'true');
		res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Credentials');
		next();
	});

// run single Feature
router.post('/Feature/:issueID/:storySource', (req, res) => {
		console.log(req.body);
	helper.runReport(req, res, stories, 'feature', req.body);
});

// run single Scenario of a Feature
router.post('/Scenario/:issueID/:storySource/:scenarioID', (req, res) => {
		console.log(req.body);
	helper.runReport(req, res, stories, 'scenario', req.body);
});

router.get('/report/:reportName', (req, res) => {
	helper.createReport(res, req.params.reportName);
});

module.exports = router;
