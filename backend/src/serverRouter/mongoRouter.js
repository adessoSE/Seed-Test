const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helper = require('../serverHelper');
const mongo = require('../database/mongodatabase');
const { ObjectID } = require('mongodb');

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
	mongo.insertEntry(req.user._id, req.body.name);
	res.status(200).json('');
});

// create Repository in Database
router.post('/createStory', async (req, res) => {
	const issue = {
		id: Math.floor(Math.random() * 10000),
		title: req.body.title,
		description: req.body.description,
		status: 'open',
		assignee: req.user.email
	};
	mongo.addIssue(issue, req.body.repo).then((body) => {
		res.status(200).json(body);
	});
});

// update background
router.post('/background/update/:issueID/:storySource', async (req, res) => {
	try {
		const background = req.body;
		const result = await mongo.updateBackground(parseInt(req.params.issueID, 10), req.params.storySource, background);
		helper.updateFeatureFile(parseInt(req.params.issueID, 10), req.params.storySource);
		res.status(200)
			.json(result);
	} catch (error) {
		handleError(res, error, error, 500);
	}
});
// delete background
//TODO storySource aus dem Frontend mitsenden
router.delete('/background/delete/:issueID/:storySource', async (req, res) => {
	try {
		await mongo.deleteBackground(parseInt(req.params.issueID, 10), req.params.storySource);
		helper.updateFeatureFile(parseInt(req.params.issueID, 10), req.params.storySource);
		res.status(200)
			.json({});
	} catch (error) {
		handleError(res, error, error, 500);
	}
});
// create scenario
// TODO: add storySource parameter in frontend
router.get('/scenario/add/:issueID/:storySource', async (req, res) => {
	try {
		const scenario = await mongo.createScenario(parseInt(req.params.issueID, 10), req.params.storySource);
		helper.updateFeatureFile(parseInt(req.params.issueID, 10), req.params.storySource);
		res.status(200)
			.json(scenario);
	} catch (error) {
		handleError(res, error, error, 500);
	}
});
// update scenario
// TODO: add storySource parameter in frontend
router.post('/scenario/update/:issueID/:storySource', async (req, res) => {
	try {
		const scenario = req.body;
		const updatedStory = await mongo.updateScenario(parseInt(req.params.issueID, 10), req.params.storySource, scenario);
		helper.updateFeatureFile(parseInt(req.params.issueID, 10), req.params.storySource);
		res.status(200)
			.json(updatedStory);
	} catch (error) {
		handleError(res, error, error, 500);
	}
});
// delete scenario
// TODO: add storySource parameter in frontend
router.delete('/scenario/delete/:issueID/:storySource/:scenarioID', async (req, res) => {
	try {
		await mongo
			.deleteScenario(parseInt(req.params.issueID, 10), req.params.storySource, parseInt(req.params.scenarioID, 10));
		helper.updateFeatureFile(parseInt(req.params.issueID, 10), req.params.storySource);
		res.status(200)
			.json({});
	} catch (error) {
		handleError(res, error, error, 500);
	}
});
// create user
router.post('/user/add', async (req, res) => {
	try {
		const user = req.body;
		const result = await mongo.createUser(user);
		res.status(200)
			.json(result);
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
router.delete('/user/delete/:userID', async (req, res) => {
	try {
		await mongo.deleteUser(req.body.id)
		res.status(200);
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

//save custom Blocks
router.post('/saveBlock', async (req, res) => {
	try {
		let body = req.body
		if (!req.user){
			res.sendStatus(401)
		}else{
			body.owner = ObjectID(req.user._id)
			const result = await mongo.saveBlock(body);
			res.status(200).json(result);
		}
	} catch (error) {
		handleError(res, error, error, 500);
	}
});

//update custom Blocks
router.post('/updateBlock/:name', async (req, res) => {
	try {
		const result = await mongo.updateBlock(req.params.name, req.body);
		res.status(200).json(result);
	} catch (error) {
		handleError(res, error, error, 500);
	}
});

//get custom Blocks by ownerId
router.get('/getBlocksById', async (req, res) => {
	try {
		const result = await mongo.getBlocksById(req.body.id, req.body.repo);
		res.status(200).json(result);
	} catch (error) {
		handleError(res, error, error, 500);
	}
});

router.get('/getBlocks', async (req, res) => {
	try {
		//if (!req.user){
		//	res.sendStatus(401)
		//}else{
			const result = await mongo.getBlocks(req.user._id);
			res.status(200).json(result);
		//}
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
		handleError(res, error, error, 500);
	}
});

module.exports = router;
