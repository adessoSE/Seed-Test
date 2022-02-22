const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const helper = require('../serverHelper');

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
		res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL);
		res.header('Access-Control-Allow-Credentials', 'true');
		res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Credentials, Authorization, X-Redirect');
		next();
	})
	.use((_, __, next) => {
		console.log('Time of jira request:', Date.now());
		next();
	});

router.post('/user/create/', (req, res) => {
	if (typeof req.user !== 'undefined' && typeof req.user._id !== 'undefined') {
		const { jiraAccountName, jiraPassword, jiraHost } = req.body;
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
		fetch(`http://${jiraHost}/rest/auth/1/session`, options)
			.then((response) => response.json())
			.then(() => {
				helper.updateJira(req.user._id, req.body)
					.then((result) => {
						res.status(200).json(result);
					});
			});
	} else {
		console.error('User doesnt exist.');
		res.status(401)
			.json('User doesnt exist.');
	}
});

router.post('/login', (req, res) => {
	if (typeof req.body.jiraAccountName !== 'undefined') {
		const { jiraAccountName, jiraPassword, jiraServer } = req.body;
		// console.log(jiraAccountName, jiraPassword, jiraServer);
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
		fetch(`http://${jiraServer}/rest/auth/1/session`, options)
			.then((response, error) => {
				if (error) {
					res.status(500);
					console.error('Cant connect to Jira Server');
				}
				if (response.headers['set-cookie'] !== undefined) {
					res.status(200).json(response.headers['set-cookie'][0]);
				} else {
					res.status(401);
					console.log('Jira-Login failed');
				}
			});
	} else {
		res.status(500);
		console.log('No Jira Account sent');
	}
});

module.exports = router;
