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
		res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL);
		res.header('Access-Control-Allow-Credentials', 'true');
		res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Credentials');
		next();
	})
	.use((_, __, next) => {
		//console.log(_.url + JSON.stringify(_.user));
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

//creates a new empty Story in the DB and adds the generated StoryId to the "stories"-Array in the corresponding Repo
router.post('/createStory', async (req, res) => {
	console.log("Der Create wird ausgeführt")
	let resultStoryId = await mongo.createStory(req.body.title, req.body.description, req.body._id)
	await mongo.insertStoryIdIntoRepo( resultStoryId, req.body._id)
		res.status(200).json('');
});

// update background
router.post('/background/update/:storyID/:storySource', async (req, res) => {
	try {
		const background = req.body;
		const result = await mongo.updateBackground(req.params.storyID, req.params.storySource, background);
		helper.updateFeatureFile(req.params.storyID, req.params.storySource);
		res.status(200)
			.json(result);
	} catch (error) {
		handleError(res, error, error, 500);
	}
});
// delete background
//TODO storySource aus dem Frontend mitsenden
router.delete('/background/delete/:storyID/:storySource', async (req, res) => {
	try {
		await mongo.deleteBackground(req.params.storyID, req.params.storySource);
		helper.updateFeatureFile(req.params.storyID, req.params.storySource);
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
		let updatedUser = await mongo.updateUser(parseString(req.params.userID, 10), user)
		res.status(200).json(updatedUser);
	} catch (error) {
		handleError(res, error, error, 500);
	}
});
// delete user
router.delete('/user/delete', async (req, res) => {
	try {
		if (req.user){
			await mongo.deleteUser(req.user._id)
		} else {
			res.sendStatus(401);
		}
		res.sendStatus(200);
	} catch (error) {
		handleError(res, error, error, 500);
	}
});

// get userObject
router.get('/user', async (req, res) => {
	if (req.user) {
		try {
			const result = await mongo.getUserData(req.user._id);
			res.status(200).json(result);
		} catch (error) {
			handleError(res, error, error, 500);
		}
	} else {
		res.sendStatus(400);
	}
});

// save custom Blocks
router.post('/saveBlock', async (req, res) => {
	try {
		const body = req.body;
		if (!req.user) {
			res.sendStatus(401);
		} else {
			body.owner = ObjectID(req.user._id);
			const result = await mongo.saveBlock(body);
			res.status(200).json(result);
		}
	} catch (error) {
		handleError(res, error, error, 500);
	}
});

// update custom Blocks
router.post('/updateBlock/:name', async (req, res) => {
	try {
		const result = await mongo.updateBlock(req.params.name, req.body);
		res.status(200).json(result);
	} catch (error) {
		handleError(res, error, error, 500);
	}
});

router.get('/getBlocks/:repoId', async (req, res) => {
	try {
		const result = await mongo.getBlocks(req.user._id, req.params.repoId);
		res.status(200).json(result);
	} catch (error) {
		handleError(res, error, error, 500);
	}
});

//delete a CustomBlock needs the name of the block
router.delete('/deleteBlock/:blockId', async (req, res) => {
	try {
		const result = await mongo.deleteBlock(req.params.blockId, req.user._id);
		res.status(200).json(result);
	} catch (error) {
		handleError(res, error, error, 404);
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
