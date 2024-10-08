const express = require('express');
const cors = require('cors');
const multer = require('multer');
const bodyParser = require('body-parser');
const helper = require('../serverHelper');
const mongo = require('../database/DbServices');
const pmHelper = require('../../dist/helpers/projectManagement');

const router = express.Router();
const upload = multer({
	storage: multer.memoryStorage(),
	// 5 MB limit
	limits: { fileSize: 5000000 }
});

router
	.use(cors())
	.use(bodyParser.json({ limit: '500kb' }))
	.use(bodyParser.urlencoded({
		limit: '500kb',
		extended: true
	}))
	.use((req, res, next) => {
		res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:4200');
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
router.get('/:_id', async (req, res) => {
	try {
		const story = await mongo.getOneStory(req.params._id);
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
		helper.updateFeatureFile(db_id);
		res.status(200).json(db_id);
	} catch (e) {
		handleError(res, e, e, 500);
	}
});



// delete scenario
router.delete('/scenario/:story_id/:_id', async (req, res) => {
	try {
		await mongo
			.deleteScenario(req.params.story_id, parseInt(req.params._id, 10));
		await helper.updateFeatureFile(req.params.story_id);
		res.status(200)
			.json({ text: 'success' });
	} catch (error) {
		handleError(res, error, error, 500);
	}
});

router.get('/download/story/:_id', async (req, res) => {
	try {
		console.log('download feature-file', req.params._id);
		const file = await helper.exportSingleFeatureFile(req.params._id);
		console.log(file);
		res.send(file);
	} catch (error) {
		handleError(res, error, error, 500);
	}
});

router.get('/download/project/:repo_id', async (req, res) => {
	try {
		console.log('download project feature-files', req.params.repo_id);
		const version = req.query.version_id ? req.query.version_id : '';
		const file = await helper.exportProjectFeatureFiles(req.params.repo_id, version);
		console.log(file);
		res.send(file);
	} catch (error) {
		handleError(res, error, error, 500);
	}
});

router.get('/download/export/:repo_id', async (req, res) => {
	try {
		console.log('export project ', req.params.repo_id);
		const version = req.query.version_id ? req.query.version_id : '';
		const file = await pmHelper.exportProject(req.params.repo_id, version);
		res.send(file);
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

router.post('/uploadFile/:repoId/', multer().single('file'), async (req, res) => {
	try {
		console.log('uploadfile');

		const { repoId } = req.params;

		console.log(req.file)

		const file = await mongo.fileUpload(req.file.originalname, repoId, req.file.buffer)
		if(file) res.status(200).json(file);
		else res.status(500)
		
	} catch (error) {
		handleError(res, error, error, 500);
	}
});

router.get('/uploadFile/:repoId', async (req, res) => {
	try {
		const result = await mongo.getFileList(req.params.repoId);
		res.status(200).json(result);
	} catch (error) {
		handleError(res, error, error, 500);
	}
});
router.delete('/uploadFile/:fileId', async (req, res) => {
	try {
		console.log(req.params.fileId)
		await mongo.deleteFile(req.params.fileId);
		res.status(200).json({ message: 'File deleted' });
	} catch (error) {
		handleError(res, error, error, 500);
	}
});

// update Story
router.put('/:_id', async (req, res) => {
	try {
		const story = await mongo.updateStory(req.body);
		await helper.updateFeatureFile(req.params._id);
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

// Import into new project
router.post('/upload/import/', upload.single('file'), async (req, res) => {
	try {
		if (req.query.projectName) {
			const result = pmHelper.importProject(req.file, req.query.repo_id, req.query.projectName, req.query.importMode);
			res.status(200).json(result);
		} else res.status(200).json('');
	} catch (error) {
		handleError(res, error, error, 500);
	}
});

// Import into existing project
router.put('/upload/import/', upload.single('file'), async (req, res) => {
	try {
		if (req.query.repo_id) {
			const result = pmHelper.importProject(req.file, req.query.repo_id, req.query.projectName, req.query.importMode);
			res.status(200).json(result);
		} else res.status(200).json('');
	} catch (error) {
		handleError(res, error, error, 500);
	}
});

// update only Scenariolist
router.patch('/:story_id', async (req, res) => {
	try {
		await mongo.updateScenarioList(req.params.story_id, req.body);
		await helper.updateFeatureFile(req.params.story_id);
	} catch (e) {
		handleError(res, e, e, 500);
	}
});

// get one scenario
router.get('/:story_id/:_id', async (req, res) => {
	try {
		const scenario = await mongo.getOneScenario(req.params.story_id, parseInt(req.params._id, 10));
		res.status(200).json(scenario);
	} catch (e) {
		handleError(res, e, e, 500);
	}
});

// create scenario
router.post('/:story_id', async (req, res) => {
	try {
		const scenario = await mongo.createScenario(req.params.story_id, req.body.name);
		await helper.updateFeatureFile(req.params.story_id);
		res.status(200)
			.json(scenario);
	} catch (error) {
		handleError(res, error, error, 500);
	}
});

// update scenario
router.put('/:story_id/:_id', async (req, res) => {
	try {
		const scenario = req.body;
		const updatedStory = await mongo.updateScenario(req.params.story_id, scenario);
		await helper.updateFeatureFile(req.params.story_id);
		res.status(200)
			.json(updatedStory);
	} catch (error) {
		handleError(res, error, error, 500);
	}
});

// delete scenario
router.delete('/scenario/:story_id/:_id', async (req, res) => {
	try {
		await mongo
			.deleteScenario(req.params.story_id, parseInt(req.params._id, 10));
		await helper.updateFeatureFile(req.params.story_id);
		res.status(200)
			.json({ text: 'success' });
	} catch (error) {
		handleError(res, error, error, 500);
	}
});

router.get('/download/story/:_id', async (req, res) => {
	try {
		console.log('download feature-file', req.params._id);
		const file = await helper.exportSingleFeatureFile(req.params._id);
		console.log(file);
		res.send(file);
	} catch (error) {
		handleError(res, error, error, 500);
	}
});

router.get('/download/project/:repo_id', async (req, res) => {
	try {
		console.log('download project feature-files', req.params.repo_id);
		const version = req.query.version_id ? req.query.version_id : '';
		const file = await helper.exportProjectFeatureFiles(req.params.repo_id, version);
		console.log(file);
		res.send(file);
	} catch (error) {
		handleError(res, error, error, 500);
	}
});

router.get('/download/export/:repo_id', async (req, res) => {
	try {
		console.log('export project ', req.params.repo_id);
		const version = req.query.version_id ? req.query.version_id : '';
		const file = await pmHelper.exportProject(req.params.repo_id, version);
		res.send(file);
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

router.post('/specialCommands/resolve', async (req, res) => {
	try {
		const result = helper.applySpecialCommands(req.body.command);
		res.status(200).json(result);
	} catch (error) {
		handleError(res, error, error.message, 500);
	}
});

module.exports = router;
