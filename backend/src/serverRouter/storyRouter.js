const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helper = require('../serverHelper');
const mongo = require('../database/DbServices');

const router = express.Router();

router
	.use(cors())
	.use(bodyParser.json({ limit: '100kb' }))
	.use(bodyParser.urlencoded({
		limit: '100kb',
		extended: true
	}))
	.use((req, res, next) => {
		res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL);
		res.header('Access-Control-Allow-Credentials', 'true');
		res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Credentials, Authorization, X-Redirect');
		next();
	})
	.use((_, __, next) => {
		console.log('Time of user request:', Date.now());
		next();
	})
	.use((req, res, next) => {
		if (req.user) next();
		else console.log('not Authenticated');
	});

// Handling response errors
function handleError(res, reason, statusMessage, code) {
	console.error(`ERROR: ${reason}`);
	res.status(code || 500)
		.json({ error: statusMessage });
}

// get one Story
router.get('/:_id/:source', async (req, res) => {
	try {
		const story = await mongo.getOneStory(req.params._id, req.params.source);
		res.status(200).json(story);
	} catch (e) {
		handleError(res, e, e, 500);
	}
});

// create Story
router.post('/', async (req, res) => {
	try {
		const db_id = await mongo.createStory(req.body.title, req.body.description, req.body._id);
		await mongo.insertStoryIdIntoRepo(db_id, req.body._id);
		helper.updateFeatureFile(db_id, req.body.repo);
		res.status(200).json(db_id);
	} catch (e) {
		handleError(res, e, e, 500);
	}
});

// update Story
router.put('/:_id', async (req, res) => {
	try {
		console.log(req.body);
		const story = await mongo.updateStory(req.body);
		await helper.updateFeatureFile(req.params._id, req.body.storySource);
		res.status(200).json(story);
	} catch (e) {
		handleError(res, e, e, 500);
	}
});

// delete Story
router.delete('/:repo_id/:_id', async (req, res) => {
	try {
		const story = await mongo.deleteStory(req.params.repo_id, req.params._id);
		await helper.deleteFeatureFile(story.title, story._id);
		res.status(200).json({ text: 'success' });
	} catch (e) {
		handleError(res, e, e, 500);
	}
});

// update only Scenariolist
router.patch('/:story_id/:source', async (req, res) => {
	try {
		await mongo.updateScenarioList(req.params.story_id, req.body);
		await helper.updateFeatureFile(req.params.story_id, req.params.source);
	} catch (e) {
		handleError(res, e, e, 500);
	}
});

// get one scenario
router.get('/:story_id/:source/:_id', async (req, res) => {
	try {
		const scenario = await mongo.getOneScenario(req.params.story_id, req.params.source, parseInt(req.params._id, 10));
		res.status(200).json(scenario);
	} catch (e) {
		handleError(res, e, e, 500);
	}
});

// create scenario
router.post('/:story_id/:source', async (req, res) => {
	try {
		const scenario = await mongo.createScenario(req.params.story_id, req.params.source, req.body.name);
		await helper.updateFeatureFile(req.params.story_id, req.params.source);
		res.status(200)
			.json(scenario);
	} catch (error) {
		handleError(res, error, error, 500);
	}
});

// update scenario
router.put('/:story_id/:source/:_id', async (req, res) => {
	console.log(req.body);
	try {
		const scenario = req.body;
		const updatedStory = await mongo.updateScenario(req.params.story_id, req.params.source, scenario);
		await helper.updateFeatureFile(req.params.story_id, req.params.source);
		res.status(200)
			.json(updatedStory);
	} catch (error) {
		handleError(res, error, error, 500);
	}
});

// delete scenario
router.delete('/:story_id/:source/:_id', async (req, res) => {
	try {
		await mongo
			.deleteScenario(req.params.story_id, req.params.source, parseInt(req.params._id, 10));
		await helper.updateFeatureFile(req.params.story_id, req.params.source);
		res.status(200)
			.json({ text: 'success' });
	} catch (error) {
		handleError(res, error, error, 500);
	}
});

router.get('/download/story/:source/:_id', async (req, res) => {
	try {
		console.log('download feature-file', req.params.source, req.params._id);
		const file = await helper.exportSingleFeatureFile(req.params._id, req.params.source);
		console.log(file);
		res.send(file);
	} catch (error) {
		handleError(res, error, error, 500);
	}
});

router.get('/download/project/:source/:repo_id', async (req, res) => {
	try {
		console.log('download project feature-files', req.params.repo_id);
		const file = await helper.exportProjectFeatureFiles(req.params.repo_id);
		console.log(file);
		res.send(file);
	} catch (error) {
		handleError(res, error, error, 500);
	}
});

module.exports = router;
