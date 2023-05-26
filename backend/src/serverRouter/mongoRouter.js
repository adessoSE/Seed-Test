const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { ObjectID } = require('mongodb');
const helper = require('../serverHelper');
const mongo = require('../database/DbServices');

const router = express.Router();

// Handling response errors
function handleError(res, reason, statusMessage, code) {
	console.error(`ERROR: ${reason}`);
	res.status(code || 500)
		.json({ error: statusMessage });
}

// router for all mongo requests
router
	.use(cors())
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
	.use((_, __, next) => {
		console.log('Time of mongoDB request:', Date.now());
		next();
	});

// get steptypes from mongo
router.get('/stepTypes', async (_, res) => {
	try {
		const result = await mongo.showSteptypes();
		res.status(200)
			.json(result);
	} catch (error) {
		handleError(res, error, error, 500);
	}
});

// create Repository in Database
router.post('/createRepository', async (req, res) => {
	mongo.createRepo(req.user._id, req.body.name);
	res.status(200).json('');
});

// creates a new empty Story in the DB and adds the generated StoryId to the "stories"-Array in the corresponding Repo
router.post('/createStory', async (req, res) => {
	console.log('Der Create wird ausgeführt');
	const resultStoryId = await mongo.createStory(req.body.title, req.body.description, req.body._id);
	await mongo.insertStoryIdIntoRepo(resultStoryId, req.body._id);
	res.status(200).json('');
});

// update background
router.post('/background/update/:storyID', async (req, res) => {
	try {
		const background = req.body;
		const result = await mongo.updateBackground(req.params.storyID, background);
		helper.updateFeatureFile(req.params.storyID);
		res.status(200)
			.json(result);
	} catch (error) {
		handleError(res, error, error, 500);
	}
});

// delete background
router.delete('/background/delete/:storyID', async (req, res) => {
	try {
		await mongo.deleteBackground(req.params.storyID);
		helper.updateFeatureFile(req.params.storyID);
		res.status(200)
			.json({});
	} catch (error) {
		handleError(res, error, error, 500);
	}
});

// update user
router.post('/user/update/:userID', async (req, res) => {
	try {
		const user = req.body;
		const updatedUser = await mongo.updateUser(req.params.userID.toString(), user);
		res.status(200).json(updatedUser);
	} catch (error) {
		handleError(res, error, error, 500);
	}
});

router.get('/getBlocks/:repoId', async (req, res) => {
	try {
		const result = await mongo.getBlocks(req.params.repoId);
		res.status(200).json(result);
	} catch (error) {
		handleError(res, error, error, 500);
	}
});


router.post('/oneDriver/:storyID', async (req, res) => {
	try {
		const result = await mongo.updateOneDriver(req.params.storyID, req.body);
		res.status(200).json(result);
	} catch (error) {
		handleError(res, error, error, 500);
	}
});

module.exports = router;
