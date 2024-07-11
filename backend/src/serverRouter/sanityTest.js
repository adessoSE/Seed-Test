/* eslint-disable no-underscore-dangle */
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const passport = require('passport');
const bcrypt = require('bcrypt');
const winston = require('winston');
const path = require('path');
const initializePassport = require('../passport-config');
const mongo = require('../database/DbServices');
const reporter = require('../../dist/helpers/reporting');


const router = express.Router();
const salt = bcrypt.genSaltSync(10);

// Configure Winston logger
const logger = winston.createLogger({
	level: 'info',
	format: winston.format.combine(
		winston.format.timestamp(),
		winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level}]: ${message}`)
	),
	transports: [
		new winston.transports.Console(),
		new winston.transports.File({ filename: path.join(__dirname, 'app.log') })
	]
});

// Handling response errors
function handleError(res, reason, statusMessage, code) {
	console.error(`ERROR: ${reason}`);
	res.status(code || 500)
		.json({ error: statusMessage });
}

initializePassport(passport, mongo.getUserByEmail, mongo.getUserById, mongo.getUserByGithub);

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
		res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Credentials, Authorization, X-Redirect');
		next();
	})
	.use((_, __, next) => {
		console.log('Time of user request:', Date.now());
		next();
	});

router.post('/test/:repoID/:groupID', passport.authenticate('normal-local', { session: false }), async (req, res) => {
	try {
		req.body.email = req.body.email.toLowerCase();
		const { repoID, groupID } = req.params;
		logger.info(`Received test request for repoID: ${repoID} and groupID: ${groupID}`);
		logger.info(`Request body: ${JSON.stringify(req.body)}`);

		await test(req, res);
	} catch (error) {
		logger.error(`Error processing request: ${error.message}`);
		res.status(401).json(error);
	}
});

async function test(req, res) {
	const group = await mongo.getOneStoryGroup(req.params.repoID, req.params.groupID);
	const mystories = [];
	console.log('We are testing the group! ', group);
	for (const ms of group.member_stories) {
		console.log('We are testing the story! ', ms);
		const id = typeof (ms) === 'object' ? ms._id : ms; // inconsistent in database
		mystories.push(await mongo.getOneStory(id, 'db'));
	}
	const params = group;
	params.repository = req.body.repository;
	req.body = group;
	reporter.runSanityReport(req, res, mystories, 'group', req.body).catch((reason) => res.send(reason).status(500));
}

module.exports = router;
