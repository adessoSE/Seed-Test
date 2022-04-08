const express = require('express');
const cors = require('cors');
const helper = require('../serverHelper');
const mongo = require('../database/DbServices');

const router = express.Router();
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
	})
	.use((req, res, next) => {
		if (req.user) next();
		else console.log('not Authenticated');
	});

// run single Feature
router.post('/Feature/:issueID/:storySource', (req, res) => {
	helper.runReport(req, res, [], 'feature', req.body);
});

// run single Scenario of a Feature
router.post('/Scenario/:issueID/:storySource/:scenarioId', (req, res) => {
	helper.runReport(req, res, [], 'scenario', req.body);
});

// run one Group and return report
router.post('/Group/:repoID/:groupID', async (req, res) => {
	const group = await mongo.getOneStoryGroup(req.params.repoID, req.params.groupID);
	const mystories = [];
	for (const ms of group.member_stories) {
		const id = typeof(ms) === 'object' ? ms._id : ms; 
		mystories.push(await mongo.getOneStory(id, 'db'));
	}
	req.body = group;
	helper.runReport(req, res, mystories, 'group', req.body);
});

router.get('/report/:reportName', (req, res) => {
	helper.createReport(res, req.params.reportName);
});

router.get('/reportHistory/:storyId', async (req, res) => {
	const { storyId } = req.params;
	const reportContainer = await helper.getReportHistory(storyId);
	res.status(200).json(reportContainer);
});

// delete a report
router.delete('/report/:reportId', async (req, res) => {
	try {
		// TODO: Authenticate user
		console.log('params', req.params.reportId);
		const result = await mongo.deleteReport(req.params.reportId);
		res.status(200).json(result);
	} catch (error) {
		console.log('error in delete report', error);
		res.sendStatus(401);
	}
});

// save Report
router.get('/saveReport/:reportId', async (req, res) => {
	try {
		// TODO: Authenticate user
		const result = await mongo.setIsSavedTestReport(req.params.reportId, true);
		res.status(200).json(result);
	} catch (error) {
		console.log('error in saveReport', error);
		res.sendStatus(401);
	}
});

// unsave Report
router.get('/unsaveReport/:reportId', async (req, res) => {
	try {
		// TODO: Authenticate user
		const result = await mongo.setIsSavedTestReport(req.params.reportId, false);
		res.status(200).json(result);
	} catch (error) {
		console.log('error in unsaveReport', error);

		res.sendStatus(401);
	}
});

module.exports = router;
