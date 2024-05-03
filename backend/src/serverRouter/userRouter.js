/* eslint-disable no-underscore-dangle */
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');
const passport = require('passport');
const bcrypt = require('bcrypt');
const { v1: uuidv1 } = require('uuid');
const fs = require('fs');
const initializePassport = require('../passport-config');
const mongo = require('../database/DbServices');
const nodeMail = require('../nodemailer');
const userMng = require('../../dist/helpers/userManagement');
const projectMng = require('../../dist/helpers/projectManagement');
const issueTracker = require('../../dist/models/IssueTracker');

const router = express.Router();
const salt = bcrypt.genSaltSync(10);

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

// checks if a reset request already exists if true it deletes the old request.
// Checks if an Account with this email exists, if true creates a request and saves it.
// also sends an email via nodemailer with reset-link to the given email-adress.
router.post('/resetpassword', async (req, res) => {
	const checkRequest = await mongo.getResetRequestByEmail(req.body.email);
	if (checkRequest) await mongo.deleteRequest(req.body.email);

	const thisUser = await mongo.getUserByEmail(req.body.email);
	// TODO if (!user)
	if (thisUser) try {
		const id = uuidv1();
		await mongo.createResetRequest({
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
	const thisRequest = await mongo.getResetRequest(req.body.uuid);
	if (thisRequest) {
		const user = await mongo.getUserByEmail(thisRequest.email);
		user.password = req.body.password;
		req.body.password = bcrypt.hashSync(req.body.password, salt);
		user.password = req.body.password;
		await mongo.updateUser(user._id, user);
		await mongo.deleteRequest(user.email);
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
				else res.json(user);
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
		const user = await mongo.findOrRegisterGithub(req.body);
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
		const mergedUser = await mongo.mergeGithub(userId, login, id);
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
	try {
		const user = await mongo.registerUser(req.body);
		res.json(user);
	} catch (error) {
		console.log('register error', error);
		res.status(400).json({ status: 'error', message: error.message });
	}
});

// logout for user
router.get('/logout', async (req, res) => {
	req.logout({}, () => { });
	res.clearCookie('connect.sid', { path: '/' });
	res.status(200).send({ status: 'success' });
});

// get repositories from all sources(Github,Jira)
router.get('/repositories', (req, res) => {
	let githubName;
	let token;
	let githubId;
	if (req.user && req.user.github) { // note order
		githubName = req.user.github.login;
		token = req.user.github.githubToken;
		githubId = req.user.github.id;
	} else {
		githubName = process.env.TESTACCOUNT_NAME;
		token = process.env.TESTACCOUNT_TOKEN;
		githubId = 0;
	}
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
		.catch((reason) => { // TODO: individuell abfangen, wo ein Fehler (GitHub / Jira / DB) aufgetreten ist.
			// bei Jira behandeln, falls der Token abgelaufen ist
			res.status(401).json('Wrong Username or Password');
			console.error(`Get Repositories Error: ${reason}`);
		});
});

// create Repository in Database
router.post('/createRepository', async (req, res) => {
	mongo.createRepo(req.user._id, req.body.name);
	res.status(200).json('');
});

// update repository
router.put('/repository/:repo_id/:owner_id', async (req, res) => {
	const { repoName, settings } = req.body;
	try {
		const repo = await mongo.updateRepository(req.params.repo_id, repoName, settings);
		res.status(200).json(repo);
	} catch (error) {
		console.error(error);
		res.status(500).send('Error while updating Repository.');
	}
});

// get global repository settings
router.get('/repository/settings/:repo_id', async (req, res) => {
	try {
		const globalSettings = await mongo.getRepoSettingsById(req.params.repo_id);
		res.status(200).json(globalSettings);
	} catch (error) {
		console.error(error);
		res.status(500).send('Error getting global repository settings');
	}
});

// update user
router.post('/update/:userID', async (req, res) => {
	try {
		const user = req.body;
		const updatedUser = await mongo.updateUser(req.params.userID.toString(), user);
		res.status(200).json(updatedUser);
	} catch (error) {
		handleError(res, error, error, 500);
	}
});

// update repository owner
router.put('/repository/:repo_id', async (req, res) => {
	try {
		const newOwner = await mongo.getUserByEmail(req.body.email);
		const repo = await mongo.updateOwnerInRepo(req.params.repo_id, newOwner._id, req.user._id);
		res.status(200).json(repo);
	} catch (error) {
		handleError(res, 'in update Repository Owner', 'Could not set new Owner', 500);
	}
});

// delete repository
router.delete('/repositories/:repo_id/:owner_id', async (req, res) => {
	try {
		await mongo
			.deleteRepository(req.params.repo_id, req.user._id, parseInt(req.params._id, 10));
		res.status(200)
			.json({ text: 'success' });
	} catch (error) {
		handleError(res, 'in delete Repository', 'Could not delete Project', 500);
	}
});

// get stories
router.get('/stories', async (req, res) => { // put into ticketManagement.ts
	const { source } = req.query;
	// get GitHub Repo / Projects
	if (source === 'github' || !source) try {
		if (!userMng.checkValidGithub(req.query.githubName, req.query.repository)) console.log('Username or Reponame not valid');

		const githubName = (req.user) ? req.query.githubName : process.env.TESTACCOUNT_NAME;
		const githubRepo = (req.user) ? req.query.repository : process.env.TESTACCOUNT_REPO;
		const token = (req.user) ? req.user.github.githubToken : process.env.TESTACCOUNT_TOKEN;
		const githubRepoUrl = `${githubName.toString()}/${githubRepo.toString()}`;
		const tmpStories = new Map();
		const tmpStoriesArray = [];

		let repo;
		// get Issues from GitHub .
		const headers = {
			Authorization: `token ${token}`
		};
		const response = await fetch(`https://api.github.com/repos/${githubRepoUrl}/issues?labels=story`, { headers });
		if (response.status === 401) res.status(401).json('Github Status 401');
		if (response.status === 200) {
			repo = await mongo.getOneGitRepository(req.query.repoName);
			const json = await response.json();
			for (const issue of json) {
				// only relevant issues with label: "story"
				const story = {
					story_id: issue.id,
					title: issue.title,
					body: issue.body,
					state: issue.state,
					issue_number: issue.number,
					storySource: 'github'
				};
				// skip in case of "unassigned"
				if (issue.assignee !== null) {
					story.assignee = issue.assignee.login;
					story.assignee_avatar_url = issue.assignee.avatar_url;
				} else {
					story.assignee = 'unassigned';
					story.assignee_avatar_url = null;
				}
				const entry = await projectMng.fuseStoryWithDb(story);
				tmpStories.set(entry._id.toString(), entry);
				tmpStoriesArray.push(entry._id);
			}

			Promise.all(tmpStoriesArray).then((array) => {
				const orderedStories = matchOrder(array, tmpStories, repo);
				res.status(200).json(orderedStories);
			})
				.catch((e) => {
					console.log(e);
				});
		}
	} catch (err) {
		res.status(503).send(err.message);

		// get Jira Repo / Projects
	} else if (source === 'jira' && typeof req.user !== 'undefined' && typeof req.user.jira !== 'undefined' && req.query.projectKey !== 'null') {
		// prepare request
		const { projectKey } = req.query;
		const jiraTracker = issueTracker.IssueTracker.getIssueTracker(issueTracker.IssueTrackerOption.JIRA);
		const clearPass = jiraTracker.decryptPassword(req.user.jira);
		const { AccountName, AuthMethod, Host } = req.user.jira;
		let authString = `Bearer ${clearPass}`;
		if (AuthMethod === 'basic') {
			const auth = Buffer.from(`${AccountName}:${clearPass}`).toString('base64');
			authString = `Basic ${auth}`;
		}

		const tmpStories = new Map();
		const storiesArray = [];
		const options = {
			method: 'GET',
			headers: {
				'cache-control': 'no-cache',
				Authorization: authString
			}
		};
		let repo;
		// send request to Jira API
		try {
			await fetch(
				`http://${Host}/rest/api/2/search?jql=project=${projectKey}+AND+labels=Seed-Test&startAt=0&maxResults=200`,
				options
			)
				.then(async (response) => response.json())
				.then(async (json) => {
					try {
						repo = await mongo.getOneJiraRepository(req.query.projectKey);
						for (const issue of json.issues) if (issue.fields.labels.includes('Seed-Test')) {
							const story = {
								story_id: issue.id,
								title: issue.fields.summary,
								body: issue.fields.description,
								state: issue.fields.status.name,
								issue_number: issue.key,
								storySource: 'jira'
							};
							if (issue.fields.assignee !== null) {
								// skip in case of "unassigned"
								story.assignee = issue.fields.assignee.name;
								story.assignee_avatar_url = issue.fields.assignee.avatarUrls['32x32'];
							} else {
								story.assignee = 'unassigned';
								story.assignee_avatar_url = null;
							}
							const entry = await projectMng.fuseStoryWithDb(story, issue.id);
							tmpStories.set(entry._id.toString(), entry);
							storiesArray.push(entry._id);
						}
					} catch (e) {
						console.error('Error while getting Jira issues:', e);
					}
					Promise.all(storiesArray)
						.then((array) => {
							const orderedStories = matchOrder(array, tmpStories, repo);
							res.status(200)
								.json(orderedStories);
						})
						.catch((e) => {
							console.error(e);
						});
				});
		} catch (e) {
			console.error('Jira Error during API call:', e);
		}

		// get DB Repo / Projects
	} else if (source === 'db' && typeof req.user !== 'undefined' && req.query.repoName !== 'null') {
		const result = await mongo.getAllStoriesOfRepo(req.query.id);
		res.status(200).json(result);
	} else res.sendStatus(401);

	function matchOrder(storiesIdList, storiesArray, repo) {
		const mySet = new Set(storiesIdList.concat(repo.stories).map((i) => i.toString()));
		for (const i of repo.stories) mySet.delete(i.toString());
		const storyList = repo.stories.concat([...mySet]);
		if (repo) mongo.updateStoriesArrayInRepo(repo._id, storyList);
		return storyList.map((i) => storiesArray.get(i.toString())).filter((s) => s !== undefined);
	}
});

// delete user
router.delete('/', async (req, res) => {
	try {
		if (req.user) await mongo.deleteUser(req.user._id);
		else res.sendStatus(401);
		res.sendStatus(200);
	} catch (error) {
		handleError(res, error, error, 500);
	}
});

// get userObject
router.get('/', async (req, res) => {
	if (req.user) try {
		const result = await mongo.getUserData(req.user._id);
		res.status(200).json(result);
	} catch (error) {
		handleError(res, error, error, 500);
	}
	else res.sendStatus(400);
});

router.put('/stories/:_id', async (req, res) => {
	const result = await mongo.updateStoriesArrayInRepo(req.params._id, req.body);
	res.status(200).json(result);
});

const mapper = (str) => { // maps Url endoded data to new object
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
