const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const userHelper = require('../../dist/user');

const router = express.Router();

// router for all jira requests
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
		console.log('Time of jira request:', Date.now());
		next();
	});

router.post('/user/create/', (req, res) => {
	if (typeof req.user === 'undefined' && typeof req.user._id === 'undefined') {
		console.error('No Jira User sent. (Got undefinded)');
		res.status(401).json('No Jira User sent. (Got undefinded)');
	} else {
		const { jiraAccountName, jiraPassword, jiraHost: jiraServer } = req.body;
		const auth = Buffer.from(`${jiraAccountName}:${jiraPassword}`)
			.toString('base64');
		const options = {
			method: 'GET',
			qs: {
				type: 'page',
				title: 'title'
			},
			headers: {
				'cache-control': 'no-cache',
				Authorization: `Basic ${auth}`
			}
		};

		// jiraHost must only consist of letters, numbers, '.' and ':' to represent URLs, IPs or ports
		if (/^[.:a-zA-Z0-9]+$/.test(jiraServer)) {
			console.log(jiraServer);
			const jiraURL = `http://${jiraServer}/rest/auth/1/session`;
			fetch(jiraURL, options)
				.then((response) => response.json())
				.then(() => {
					userHelper.updateJiraCredential(req.user._id, jiraAccountName, jiraPassword, jiraServer)
						.then((result) => {
							res.status(200).json(result);
						});
				})
				.catch((error) => console.error(error));
			// in case of error
			res.status(401).json('User doesnt exist.');
		} else {
			console.error('Given Jira-Server does not comply with URL structure.');
			res.status(401).json('Given Jira-Server does not comply with URL structure.');
		}
	}
});

router.post('/login', (req, res) => {
	if (typeof req.body.jiraAccountName !== 'undefined') {
		const { jiraAccountName, jiraPassword, jiraServer } = req.body;
		const auth = Buffer.from(`${jiraAccountName}:${jiraPassword}`)
			.toString('base64');
		const options = {
			method: 'GET',
			qs: {
				type: 'page',
				title: 'title'
			},
			headers: {
				'cache-control': 'no-cache',
				Authorization: `Basic ${auth}`
			}
		};
		if (/^[.:a-zA-Z0-9]+$/.test(jiraServer)) fetch(`http://${jiraServer}/rest/auth/1/session`, options)
			.then((response, error) => {
				if (error) {
					res.status(500);
					console.error('Cant connect to Jira-Server.');
				}
				if (response.headers['set-cookie'] !== undefined) res.status(200).json(response.headers['set-cookie'][0]);
				else {
					res.status(401);
					console.log('Failed to log in to Jira-Server.');
				}
			});
		else {
			console.error('Given Jira-Server does not comply with URL structure.');
			res.status(401).json('Given Jira-Server does not comply with URL structure.');
		}
	} else {
		console.log('No Jira User sent. (Got undefinded)');
		res.status(500).json('No Jira User sent. (Got undefinded)');
	}
});

module.exports = router;
