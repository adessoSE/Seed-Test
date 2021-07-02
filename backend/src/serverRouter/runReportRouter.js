const express = require('express');
const cors = require('cors');
const helper = require('../serverHelper');
const mongo = require('../database/mongodatabase');
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
	helper.runReport(req, res, stories, 'feature', req.body);
});

// run single Scenario of a Feature
router.post('/Scenario/:issueID/:storySource/:scenarioID', (req, res) => {
	helper.runReport(req, res, stories, 'scenario', req.body);
});

// run one Group
router.post('/Group/:repoID/:groupID', (req, res) => {
	console.log('runGroup Not Implemented yet')
	res.sendStatus(501)
})

router.get('/report/:reportName', (req, res) => {
	helper.createReport(res, req.params.reportName);
});

router.get('/reportHistory/:storyId', async (req, res) => {
	let storyId = req.params.storyId;
	let history = await helper.getReportHistory(storyId);
	let storyReports = [];
	let scenarioReports = [];
	history.forEach(element => {
		if (element.mode =='feature'){
			storyReports.push(element)
		}else{
			scenarioReports.push(element)
		}
	});
	let reportContainer = {storyReports, scenarioReports}
	//console.log('reportContainer', reportContainer)
	res.status(200).json(reportContainer);
});

//delete a report
router.delete('/report/:reportId', async (req, res) => {
	try {
		// TODO: Authenticate user
		console.log('params', req.params.reportId)
		const result = await mongo.deleteReport(req.params.reportId);
		res.status(200).json(result);
	} catch (error) {
		console.log('error in delete report', error)
		res.sendStatus(401);
	}
});

//save Report
router.get('/saveReport/:reportId', async (req, res) => {
	try {
		// TODO: Authenticate user
		const result = await mongo.setIsSavedTestReport(req.params.reportId, true);
		res.status(200).json(result);
	} catch (error) {
		console.log('error in saveReport', error)

		res.sendStatus(401);
	}
});

//unsave Report
router.get('/unsaveReport/:reportId', async (req, res) => {
	try {
		// TODO: Authenticate user
		const result = await mongo.setIsSavedTestReport(req.params.reportId, false);
		res.status(200).json(result);
	} catch (error) {
		console.log('error in unsaveReport', error)

		res.sendStatus(401);
	}
});

module.exports = router;
