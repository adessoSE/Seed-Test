const express = require('express');

const router = express.Router();
const cors = require('cors');
const bodyParser = require('body-parser');
const helper = require('../serverHelper');
const mongo = require('../database/DbServices');

// router for all block requests
router
	.use(cors())
	.use(bodyParser.json({ limit: '100kb' }))
	.use(bodyParser.urlencoded({
		limit: '100kb',
		extended: true
	}))
	.use((_, __, next) => {
		console.log('Time of background router request:', Date.now());
		next();
	})
	.use((req, res, next) => {
		res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:4200');
		res.header('Access-Control-Allow-Credentials', 'true');
		res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Credentials');
		next();
	});

// Handling response errors
function handleError(res, reason, statusMessage, code) {
	console.error(`ERROR: ${reason}`);
	res.status(code || 500)
		.json({ error: statusMessage });
}

// update background
router.put('/:storyID', async (req, res) => {
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
router.delete('/:storyID', async (req, res) => {
	try {
		await mongo.deleteBackground(req.params.storyID);
		helper.updateFeatureFile(req.params.storyID);
		res.status(200)
			.json({});
	} catch (error) {
		handleError(res, error, error, 500);
	}
});

module.exports = router;
