const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const userHelper = require('../../dist/helpers/userManagement');
const issueTracker = require('../../dist/models/IssueTracker');

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
		const {
			jiraAccountName, jiraPassword, jiraHost: jiraServer, jiraAuthMethod
		} = req.body;
		let authString = `Bearer ${jiraPassword}`;
		if (jiraAuthMethod === 'basic') {
			const auth = Buffer.from(`${jiraAccountName}:${jiraPassword}`).toString('base64');
			authString = `Basic ${auth}`;
		}
		const options = {
			method: 'GET',
			qs: {
				type: 'page',
				title: 'title'
			},
			headers: {
				'cache-control': 'no-cache',
				Authorization: authString
			}
		};

		// jiraHost must only consist of letters, numbers, '.' and ':' to represent URLs, IPs or ports
		if (/^[.:a-zA-Z0-9]+$/.test(jiraServer)) {
			const jiraURL = `http://${jiraServer}/rest/auth/1/session`;
			fetch(jiraURL, options)
				.then((response) => response.json())
				.then(() => {
					userHelper.updateJiraCredential(
						req.user._id,
						jiraAccountName,
						jiraPassword,
						jiraServer,
						jiraAuthMethod
					).then((result) => {
						res.status(200).json(result);
					});
				})
				.catch((error) => {
					console.error(error);
					res.status(401).json('User doesnt exist.');
				});
		} else {
			console.error('Given Jira-Server does not comply with URL structure.');
			res.status(401).json('Given Jira-Server does not comply with URL structure.');
		}
	}
});

router.delete('/user/disconnect/', (req, res) => {
	if (typeof req.user === 'undefined' && typeof req.user._id === 'undefined') {
		console.error('No Jira User sent. (Got undefinded)');
		res.status(401).json('No Jira User sent. (Got undefinded)');
	} else userHelper.disconnectJira(req.user._id).then((result) => res.status(200).json(result))
		.catch((error) => console.error(error));
});

router.post('/login', (req, res) => {
	if (typeof req.body.jiraAccountName !== 'undefined') {
		const {
			jiraAccountName, jiraPassword, jiraServer, AuthMethod
		} = req.body;
		let authString = `Bearer ${jiraPassword}`;
		if (AuthMethod === 'basic') {
			const auth = Buffer.from(`${jiraAccountName}:${jiraPassword}`).toString('base64');
			authString = `Basic ${auth}`;
		}
		const options = {
			method: 'GET',
			qs: {
				type: 'page',
				title: 'title'
			},
			headers: {
				'cache-control': 'no-cache',
				Authorization: authString
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

router.put('/update-xray-status', async (req, res) => {
	if (typeof req.user !== 'undefined' && typeof req.user.jira !== 'undefined') {
		const jiraTracker = issueTracker.IssueTracker
			.getIssueTracker(issueTracker.IssueTrackerOption.JIRA);
		const clearPass = jiraTracker.decryptPassword(req.user.jira);
		const {
			AccountName, AuthMethod, Host
		} = req.user.jira;
		let authString = `Bearer ${clearPass}`;
		if (AuthMethod === 'basic') {
			const auth = Buffer.from(`${AccountName}:${clearPass}`).toString('base64');
			authString = `Basic ${auth}`;
		}
		const { testRunId, stepId, status } = req.body;
		const url = new URL(`https://${Host}/rest/raven/1.0/api/testrun/${testRunId}/step/${stepId}/status`);
		url.searchParams.append('status', status);

		const options = {
			method: 'PUT',
			headers: {
				'cache-control': 'no-cache',
				'Content-Type': 'application/json',
				Authorization: authString
			}
		};
		try {
			const response = await fetch(url, options);
			if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
			let data;
			const contentType = response.headers.get('content-type');
			if (contentType && contentType.includes('application/json')) {
				const text = await response.text();
				if (text) data = JSON.parse(text);
			} else data = { message: 'Success', status: response.status };
			res.json(data);
		} catch (error) {
			console.error('Error while updating Xray status:', error);
			res.status(500).json({ message: 'Internal server error while updating Xray status' });
		}
	} else {
		console.log('No Jira User sent. (Got undefined)');
		res.status(500).json('No Jira User sent. Got (undefined)');
	}
});

module.exports = router;
