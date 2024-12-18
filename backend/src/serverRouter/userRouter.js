/* eslint-disable curly */
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const passport = require('passport');
const bcrypt = require('bcrypt');
const { v1: uuidv1 } = require('uuid');
const fs = require('fs');
const crypto = require('crypto');
const initializePassport = require('../passport-config');
const db = require('../database/DbServices');
const nodeMail = require('../nodemailer');
const userMng = require('../../dist/helpers/userManagement');
const { Sources } = require('../../dist/models/project');
const ticketMng = require('../../dist/helpers/ticketManagement');

const router = express.Router();
const salt = bcrypt.genSaltSync(10);

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
		console.log('Time of /user request:', Date.now());
		next();
	});

// checks if a reset request already exists if true it deletes the old request.
// Checks if an Account with this email exists, if true creates a request and saves it.
// also sends an email via nodemailer with reset-link to the given email-adress.
router.post('/resetpassword', async (req, res) => {
	const checkRequest = await db.getResetRequestByEmail(req.body.email);
	if (checkRequest) await db.deleteRequest(req.body.email);

	const thisUser = await db.getUserByEmail(req.body.email);
	// TODO if (!user)
	if (thisUser) try {
		const id = uuidv1();
		await db.createResetRequest({
			createdAt: new Date(),
			uuid: id,
			email: thisUser.email
		});
		try {
			await nodeMail.sendResetLink(thisUser.email, id);
			res.status(200)
				.json();
		} catch (err) {
			res.status(500).send(err.message);
		}
	} catch (error) {
		res.status(401)
			.json(error);
	} else {
		console.log('UserRouter/ResetPassword: der Benutzer konnte nicht in der Datenbank gefunden werden!');
		res.status(404).send('No user found with the given email adress!');
	}
});

// checks if requests exist if true, gets the according Account and changes the password
router.patch('/reset', async (req, res) => {
	const thisRequest = await db.getResetRequest(req.body.uuid);
	if (thisRequest) {
		const user = await db.getUserByEmail(thisRequest.email);
		user.password = req.body.password;
		req.body.password = bcrypt.hashSync(req.body.password, salt);
		user.password = req.body.password;
		await db.updateUser(user._id, user);
		await db.deleteRequest(user.email);
		res.status(204).json();
	} else res.status(401).json();
});

// login user
router.post('/login', (req, res, next) => {
	if (req.body.stayLoggedIn) req.session.cookie.maxAge = 864000000;
	req.body.email = req.body.email.toLowerCase();
	try {
		passport.authenticate('normal-local', {}, (error, user, info) => {
			if (error) throw error;
			else if (!user) {
				info.status = 'error';
				return res.json(info);
			}
			req.logIn(user, async (err) => {
				if (err) throw err;
				else {
					if (user.transitioned === false) {
						const hasher = crypto.createHash('sha256');
						hasher.update(req.body.password);
						const passHash = hasher.digest();
						const finalHash = bcrypt.hashSync(passHash.toString('hex'), salt);
						user.password = finalHash;
						user.transitioned = true;
						db.updateUser(user._id, user);
					}
					res.json(user);
				}
			});
		})(req, res, next);
	} catch (error) {
		res.status(401).json(error);
	}
});

// login github account
router.post('/githubLogin', (req, res) => {
	req.body.id = parseInt(req.body.id, 10);
	passport.authenticate('github-local', {}, (error, user) => {
		if (error) res.status(401).json(error);
		req.logIn(user, async (err) => {
			if (err) return res.status(401).json(err);
			return res.json(user);
		});
	})(req, res);
});

// register github account
router.post('/githubRegister', async (req, res) => {
	try {
		const user = await db.findOrRegisterGithub(req.body);
		res.json(user);
	} catch (error) {
		res.sendStatus(400);
	}
});

// Update DB to reflect github changes
router.post('/mergeGithub', async (req, res) => {
	const { userId, login } = req.body;
	const id = parseInt(req.body.id, 10);
	try {
		const mergedUser = await db.mergeGithub(userId, login, id);
		req.logIn(mergedUser, (err) => {
			if (err) {
				console.log('Merge Github login error:', err);
				return res.status(400).json({ status: 'error' });
			}
			res.status(200).json({ status: 'success' });
		});
	} catch (error) {
		console.log('Merge github error:', error);
		res.status(400).json({ status: 'error' });
	}
});

// registers user
router.post('/register', async (req, res) => {
	req.body.email = req.body.email.toLowerCase();
	req.body.password = bcrypt.hashSync(req.body.password, salt);
	req.body.transitioned = true;
	try {
		const user = await db.registerUser(req.body);
		res.json(user);
	} catch (error) {
		console.log('register error', error);
		res.status(400).json({ status: 'error', message: error.message });
	}
});

// update user
router.post('/update/:userID', async (req, res) => {
	try {
		const user = req.body;
		const updatedUser = await db.updateUser(req.params.userID.toString(), user);
		res.status(200).json(updatedUser);
	} catch (error) {
		handleError(res, error, error, 500);
	}
});

// logout for user
router.get('/logout', async (req, res) => {
	req.logout({}, () => { });
	res.clearCookie('connect.sid', { path: '/' });
	res.status(200).send({ status: 'success' });
});

// get stories for specific Project
router.get('/stories', async (req, res) => {
	switch (req.query.source) {
		case Sources.DB: {
			// get Stories in Custom Project
			try {
				if (typeof req.user !== 'undefined' && req.query.repoName !== 'null') {
					const result = await db.getAllStoriesOfRepo(req.query.id);
					res.status(200).json(result);
				} else res.sendStatus(401);
			} catch (err) {
				console.error('Error in get Stories in Custom Project', err.message);
				res.status(503).send('Could not get Stories in Custom Project');
			}
			break;
		}
		// get Stories in Jira Project
		case Sources.JIRA: {
			try {
				if (req.user !== 'undefined' && typeof req.user.jira !== 'undefined' && req.query.projectKey) {
					// outsourced ############################################################################
					const result = await ticketMng.getJiraStories(
						req.user.jira,
						req.query.projectKey,
						req.query.id
					);
					res.status(200).json(result);
				} else res.sendStatus(401);
			} catch (err) {
				console.error('Error in get Stories for Jira Project', err.message);
				res.status(503).send('Could not get Stories for Jira Project');
			}
			break;
		}
		// get Stories in GitHub Project
		case Sources.GITHUB: {
			const githubName = (req.user) ? req.query.githubName : process.env.TESTACCOUNT_NAME;
			const githubRepo = (req.user) ? req.query.repository : process.env.TESTACCOUNT_REPO;
			const token = (req.user) ? req.user.github.githubToken : process.env.TESTACCOUNT_TOKEN;
			try {
				if (!userMng.checkValidGithub(req.query.githubName, req.query.repository)) console.log('Username or Reponame not valid');
				// outsourced ############################################################################
				const gitHubissues = await ticketMng.getGitHubStories(
					githubName,
					githubRepo,
					token,
					req.query.repoName
				);
				res.status(200).json(gitHubissues);
			} catch (err) {
				if (err.message === 'Github Status 401') res.sendStatus(401).json('Github Status 401');
				console.error('Error in get Stories for GitHub Project', err);
				res.status(503).send('Could not get Stories for GitHub Project');
			}
			break;
		}

		default: {
			res.status(400).send('Unexpected Source specified.\n'
				+ `Source must be one of ${Object.values(Sources).join('" , "')}`);
			break;
		}
	}
});

// delete user
router.delete('/', async (req, res) => {
	try {
		if (req.user) await db.deleteUser(req.user._id);
		else res.sendStatus(401);
		res.sendStatus(200);
	} catch (error) {
		handleError(res, error, error, 500);
	}
});

// get userObject
router.get('/', async (req, res) => {
	if (req.user) try {
		const result = await db.getUserData(req.user._id);
		res.status(200).json(result);
	} catch (error) {
		handleError(res, error, error, 500);
	}
	else res.sendStatus(400);
});

router.put('/stories/:_id', async (req, res) => {
	const result = await db.updateStoriesArrayInRepo(req.params._id, req.body);
	res.status(200).json(result);
});

// maps Url endoded data to new object
const mapper = (str) => {
	const cleaned = decodeURIComponent(str);
	const entities = cleaned.split('&').filter(Boolean)
		.map((v) => {
			const a = v.split('=').map((x) => x.toString());
			return a;
		});
	return Object.fromEntries(entities);
};

router.get('/callback', (req, res) => {
	const TOKEN_URL = 'https://github.com/login/oauth/access_token';
	const params = new URLSearchParams();
	if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
		console.log('To use github authentication please provide your GITHUB_CLIENT_ID and your GITHUB_CLIENT_SECRET. You can see how to in the README.');
		res.status(501).send('No GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET provided.');
		return;
	}

	params.append('client_id', process.env.GITHUB_CLIENT_ID);
	params.append('client_secret', process.env.GITHUB_CLIENT_SECRET);
	params.append('code', req.query.code);
	fetch(
		TOKEN_URL,
		{
			method: 'POST',
			body: params
		}
	)
		.then((response) => response.text())
		.then((text) => mapper(text))
		.then((data) => {
			if (data.error) throw Error('github user register failed');
			else userMng.getGithubData(res, req, data.access_token);
		})
		.catch((error) => {
			res.status(401).send(error.message);
			console.error(error);
		});
});

router.post('/log', (req, res) => {
	const stream = fs.createWriteStream('./logs/front.log', { flags: 'a' });
	stream.write(`${req.body.message + JSON.stringify(req.body.additional)}\n`);
	stream.close();
	res.status(200).json('logged');
});

module.exports = router;
