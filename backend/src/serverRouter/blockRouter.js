const express = require('express');

const router = express.Router();
const cors = require('cors');
const bodyParser = require('body-parser');
const { ObjectId } = require('mongodb');
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
		console.log('Time of block router request:', Date.now());
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

// save custom Blocks
router.post('/', async (req, res) => {
	try {
		const { body } = req;
		if (!req.user) { res.sendStatus(401); return; }
		body.owner = new ObjectId(req.user._id);
		const result = await mongo.saveBlock(body);
		res.status(200).json(result);
	} catch (error) {
		handleError(res, error, error, 500);
	}
});

// update Block a Block
router.put('/block', async (req, res) => {
	try {
		const { body } = req;
		if (!req.user) res.sendStatus(401);
		else {
			const result = await mongo.updateBlock(body);
			res.status(200).json(result);
		}
	} catch (error) {
		handleError(res, error, error, 500);
	}
});

// update custom Blocks
router.put('/:blockId', async (req, res) => {
	try {
		const result = await mongo.updateBlock(req.params.blockId, req.body);
		res.status(200).json(result);
	} catch (error) {
		handleError(res, error, error, 500);
	}
});

router.delete('/:blockId', async (req, res) => {
	try {
		const result = await mongo.deleteBlock(req.params.blockId, req.user._id);
		res.status(200).json(result);
	} catch (error) {
		handleError(res, error, error, 404);
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

module.exports = router;
