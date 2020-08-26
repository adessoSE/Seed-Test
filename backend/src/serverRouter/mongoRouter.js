const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helper = require('../serverHelper');
const mongo = require('../database/mongodatabase');

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
		console.log(_.url + JSON.stringify(_.user));
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
	console.log('Email:');
	console.log(req.body.email);
	console.log('Name');
	console.log(req.body.name);
	mongo.insertEntry(req.body.email, req.body.name);
	res.status(200);
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
router.post('/background/update/:issueID', async (req, res) => {
	try {
		const background = req.body;
		const result = await mongo.updateBackground(parseInt(req.params.issueID, 10), background);
		helper.updateFeatureFile(parseInt(req.params.issueID, 10));
		res.status(200)
			.json(result);
	} catch (error) {
		handleError(res, error, error, 500);
	}
});
// delete background
router.delete('/background/delete/:issueID/', async (req, res) => {
	try {
		await mongo.deleteBackground(parseInt(req.params.issueID, 10));
		helper.updateFeatureFile(parseInt(req.params.issueID, 10));
		res.status(200)
			.json({});
	} catch (error) {
		handleError(res, error, error, 500);
	}
});
// create scenario
router.get('/scenario/add/:issueID', async (req, res) => {
	try {
		const scenario = await mongo.createScenario(parseInt(req.params.issueID, 10));
		helper.updateFeatureFile(parseInt(req.params.issueID, 10));
		res.status(200)
			.json(scenario);
	} catch (error) {
		handleError(res, error, error, 500);
	}
});
// update scenario
router.post('/scenario/update/:issueID', async (req, res) => {
	try {
		const scenario = req.body;
		const updatedStory = await mongo.updateScenario(parseInt(req.params.issueID, 10), scenario);
		helper.updateFeatureFile(parseInt(req.params.issueID, 10));
		res.status(200)
			.json(updatedStory);
	} catch (error) {
		handleError(res, error, error, 500);
	}
});
// delete scenario
router.delete('/scenario/delete/:issueID/:scenarioID', async (req, res) => {
	try {
		await mongo
			.deleteScenario(parseInt(req.params.issueID, 10), parseInt(req.params.scenarioID, 10));
		helper.updateFeatureFile(parseInt(req.params.issueID, 10));
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
    await mongo.deleteUser(parseString(req.params.userID, 10))
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

module.exports = router;
