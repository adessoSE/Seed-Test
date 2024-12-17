/* eslint-disable curly */
/* eslint-disable no-underscore-dangle */
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const passport = require('passport');
const initializePassport = require('../passport-config');
const db = require('../database/DbServices');
const projectMng = require('../../dist/helpers/projectManagement');

const router = express.Router();

// Handling response errors
function handleError(res, reason, statusMessage, code) {
	console.error(`ERROR: ${reason}`);
	res.status(code || 500)
		.json({ error: statusMessage });
}

initializePassport(passport, db.getUserByEmail, db.getUserById, db.getUserByGithub);

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
		console.log('Time of /user/repositories request:', Date.now());
		next();
	});

// get repositories from all sources
router.get('/', (req, res) => {
	const githubName = (req.user.github) ? req.query.github.login : process.env.TESTACCOUNT_NAME;
	const token = (req.user.github) ? req.user.github.githubToken : process.env.TESTACCOUNT_TOKEN;
	const githubId = (req.user.github) ? req.user.github.id : undefined;

	// get repositories from individual sources
	Promise.all([
		projectMng.starredRepositories(req.user._id, githubId, githubName, token),
		projectMng.ownRepositories(req.user._id, githubId, githubName, token),
		projectMng.getJiraRepos(req.user.jira),
		projectMng.dbProjects(req.user._id)
	])
		.then((repos) => {
			let merged = [].concat(...repos);
			// remove duplicates
			merged = projectMng.uniqueRepositories(merged);
			res.status(200).json(merged);
		})
		.catch((reason) => {
			// TODO: individuell abfangen, wo ein Fehler (GitHub / Jira / DB) aufgetreten ist.
			// bei Jira behandeln, falls der Token abgelaufen ist
			res.status(401).json('Wrong Username or Password');
			console.error(`Get Repositories Error: ${reason}`);
		});
});

// create Repository in Database
router.post('/', async (req, res) => {
	db.createRepo(req.user._id, req.body.name);
	res.status(200).json('');
});

// update repository
router.put('/:repo_id/:owner_id', async (req, res) => {
	const { repoName, settings } = req.body;
	try {
		const repo = await db.updateRepository(req.params.repo_id, repoName, settings);
		res.status(200).json(repo);
	} catch (error) {
		console.error(error);
		res.status(500).send('Error while updating Repository.');
	}
});

// get global repository settings
router.get('/settings/:repo_id', async (req, res) => {
	try {
		const globalSettings = await db.getRepoSettingsById(req.params.repo_id);
		res.status(200).json(globalSettings);
	} catch (error) {
		console.error(error);
		res.status(500).send('Error getting global repository settings');
	}
});

// update repository owner
router.put('/:repo_id', async (req, res) => {
	try {
		const newOwner = await db.getUserByEmail(req.body.email);
		const repo = await db.updateOwnerInRepo(req.params.repo_id, newOwner._id, req.user._id);
		res.status(200).json(repo);
	} catch (error) {
		handleError(res, 'in update Repository Owner', 'Could not set new Owner', 500);
	}
});

// delete repository
router.delete('/:repo_id/:owner_id', async (req, res) => {
	try {
		await db
			.deleteRepository(req.params.repo_id, req.user._id, parseInt(req.params._id, 10));
		res.status(200)
			.json({ text: 'success' });
	} catch (error) {
		handleError(res, 'in delete Repository', 'Could not delete Project', 500);
	}
});

module.exports = router;
