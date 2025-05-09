const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helper = require('../serverHelper');
const reporter = require('../../dist/helpers/reporting');
const mongo = require('../database/DbServices');

const router = express.Router();
// This router is used for accessing Cucumber/Selenium Reports

router
	.use(cors())
	.use((_, __, next) => {
		console.log('Time of submitted Run:', Date.now());
		next();
	})
	.use(bodyParser.json({ limit: '100kb' }))
	.use(bodyParser.urlencoded({
		limit: '100kb',
		extended: true
	}))
	.use((req, res, next) => {
		res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:4200');
		res.header('Access-Control-Allow-Credentials', 'true');
		res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Credentials');
		next();
	})
	.use((req, res, next) => {
		if (req.user) next();
		else console.log('not Authenticated');
	});

// run single Feature
router.post('/Feature/:issueID', (req, res) => {
	reporter.runReport(req, res, [], 'feature', req.body).catch((reason) => { console.log('failed in runreport', reason); res.status(500).send(reason); });
});

// run single Scenario of a Feature
router.post('/Scenario/:issueID/:scenarioId', (req, res) => {
	reporter.runReport(req, res, [], 'scenario', req.body).catch((reason) => res.status(500).send(reason));
});

// run one Group and return report
router.post('/Group/:repoID/:groupID', async (req, res) => {
	const group = await mongo.getOneStoryGroup(req.params.repoID, req.params.groupID);
	const mystories = [];
	for (const ms of group.member_stories) {
		const id = typeof (ms) === 'object' ? ms._id : ms; // inconsistent in database
		mystories.push(await mongo.getOneStory(id));
	}
	const params = group;
	params.repository = req.body.repository;
	params.repoId = req.params.repoID;
	req.body = group;
	console.log('Mystories', mystories);
	reporter.runReport(req, res, mystories, 'group', req.body).catch((reason) => res.status(500).send(reason));
});

// run one temporary group and return report
router.post('/TempGroup', async (req, res) => {
	const tempGroup = req.body.group;
	const mystories = tempGroup.member_stories;

	const params = tempGroup;
	params.repository = req.body.repository;
	params.repoId = req.body.id;
	req.body = tempGroup;
	reporter.runReport(req, res, mystories, 'group', tempGroup).then(() => {
		console.log('Report for temporary group created');
	})
		.catch((reason) => res.status(500).send(reason));
});

// generate older Report
router.get('/report/:reportName', (req, res) => {
	reporter.createReport(res, req.params.reportName);
});

// get Report Data for a Story
router.get('/reportHistory/:storyId', async (req, res) => {
	const { storyId } = req.params;
	const reportContainer = await helper.getReportHistory(storyId);
	res.status(200).json(reportContainer);
});

// delete a Report
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
