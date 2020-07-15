const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const process = require('process');
const fetch = require('node-fetch');
const request = require('request');
const passport = require('passport');
const bcrypt = require('bcrypt');
const initializePassport = require('../passport-config');
const helper = require('../serverHelper');
const mongo = require('../database/mongodatabase');

const router = express.Router();
const salt = bcrypt.genSaltSync(10);

const unassignedAvatarLink = process.env.Unassigned_AVATAR_URL;
// router for all user requests

initializePassport(passport, mongo.getUserByEmail, mongo.getUserById, mongo.getUserByGithub);

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
		console.log('Time of user request:', Date.now());
		next();
	});

// login user
router.post('/login', (req, res, next) => {
if(req.body.stayLoggedIn) req.session.cookie.maxAge = 864000000;
    try{
        passport.authenticate('normal-local', function(error, user, info){
            if(error){
                throw new UserError(error)
            }else if(!user){
                info.status = 'error';
                return res.json(info);
            }
            req.logIn(user, async function(err){
                if(err){
                    throw new UserError(err)
                }else {
                    res.json(user);
                }
            });
        })
        (req, res, next)
    }catch(error){
        if(error instanceof UserError){
            res.status(401).json(error);
        }else{
            res.status(401).json(error);
        }
    }
});

// login github account
router.post('/githubLogin', (req, res) => {
	req.body.id = parseInt(req.body.id, 10);
	passport.authenticate('github-local', (error, user) => {
		if (error) res.status(401).json(error);
		req.logIn(user, async (err) => {
			if (err) return res.status(401).json(err);
			return res.json(user);
		});
	})(req, res);
});

// register github account
router.post('/githubRegister', async (req, res) => {
	console.log('githubRegister:');
	try {
		const user = await mongo.findOrRegister(req.body);
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
		req.logIn(mergedUser, function(err) {
			if (err) return res.sendStatus(400)
			res.send(200)
		})
	} catch (error) {
		res.sendStatus(400);
	}
});


// registers user
router.post('/register', async (req, res) => {
	req.body.password = bcrypt.hashSync(req.body.password, salt);
	try {
		const user = await mongo.registerUser(req.body);
		res.json(user);
	} catch (error) {
		res.status(400).send(error);
	}
});

// logout for user
router.get('/logout', async (req, res) => {
    req.logout();
    res.clearCookie('connect.sid', {path: '/'});
    res.status(200).send({status: 'success'});
});

// get repositories from all sources(Github,Jira)
router.get('/repositories', (req, res) => {
	let githubName;
	let token;
	if (req.user) {
		if (req.user.github) {
			githubName = req.user.github.login;
			token = req.user.github.githubToken;
		}
	} else {
		githubName = process.env.TESTACCOUNT_NAME;
		token = process.env.TESTACCOUNT_TOKEN;
	}
	// get repositories from individual sources
	Promise.all([
		helper.starredRepositories(githubName, token),
		helper.ownRepositories(githubName, token),
		helper.jiraProjects(req.user),
		helper.dbProjects(req.user)
	])
		.then((repos) => {
			let merged = [].concat(...repos);
			// remove duplicates
			merged = helper.uniqueRepositories(merged);
			res.status(200).json(merged);
		})
		.catch((reason) => {
			res.status(400).json('Wrong Github name or Token');
			console.error(`Get Repositories Error: ${reason}`);
		});
});

// get stories from github
router.get('/stories', async (req, res) => {
	console.log(req.query.source);
	const { source } = req.query;
	if (source === 'github' || !source) try {
		const githubName = (req.user) ? req.query.githubName : process.env.TESTACCOUNT_NAME;
		const githubRepo = (req.user) ? req.query.repository : process.env.TESTACCOUNT_REPO;
		const token = (req.user) ? req.user.github.githubToken : process.env.TESTACCOUNT_TOKEN;
		const tmpStories = [];
		// get Issues from GitHub .
		const headers = {
			Authorization: `token ${token}`
		};
		const response = await fetch(`https://api.github.com/repos/${githubName}/${githubRepo}/issues?labels=story`, { headers });
		if (response.status === 401) res.status(401).json('Github Status 401');
		if (response.status === 200) {
			const json = await response.json();
			for (const issue of json) {
				// only relevant issues with label: "story"
				const story = {
					story_id: issue.id,
					title: issue.title,
					body: issue.body,
					state: issue.state,
					issue_number: issue.number
				};
				if (issue.assignee !== null) {
					// skip in case of "unassigned"
					story.assignee = issue.assignee.login;
					story.assignee_avatar_url = issue.assignee.avatar_url;
				} else {
					story.assignee = 'unassigned';
					story.assignee_avatar_url = unassignedAvatarLink;
				}
				tmpStories.push(helper.fuseGitWithDb(story, issue.id));
			}
		}
		Promise.all(tmpStories)
			.then((results) => {
				res.status(200)
					.json(results);
				// let stories = results; // need this to clear promises from the Story List
			})
			.catch((e) => {
				console.log(e);
			});
	} catch (err) {
		res.status(503).send(err.message);
	} else if (source === 'jira' && typeof req.user !== 'undefined' && typeof req.user.jira !== 'undefined' && req.query.projectKey !== 'null') {
		const { Host, AccountName, Password } = req.user.jira;
		const { projectKey } = req.query;
		const auth = Buffer.from(`${AccountName}:${Password}`)
			.toString('base64');
		const cookieJar = request.jar();
		const tmpStories = [];
		const options = {
			method: 'GET',
			url: `http://${Host}/rest/api/2/search?jql=project=${projectKey}`,
			jar: cookieJar,
			qs: {
				type: 'page',
				title: 'title'
			},
			headers: {
				'cache-control': 'no-cache',
				Authorization: `Basic ${auth}`
			}
		};
		request(options, (error) => {
			if (error) res.status(500).json(error);
			else request(options, (error2, response2, body) => {
				if (error2) res.status(500).json(error);
				const json = JSON.parse(body).issues;
				for (const issue of json) {
					const story = {
						story_id: issue.id,
						title: issue.fields.summary,
						body: issue.fields.description,
						state: issue.fields.status.name,
						issue_number: issue.id
					};
					if (issue.fields.assignee !== null) {
						// skip in case of "unassigned"
						story.assignee = issue.fields.assignee.name;
						story.assignee_avatar_url = issue.fields.assignee.avatarUrls['48x48'];
					} else {
						story.assignee = 'unassigned';
						story.assignee_avatar_url = unassignedAvatarLink;
					}
					tmpStories.push(helper.fuseGitWithDb(story, issue.id));
				}
				Promise.all(tmpStories)
					.then((results) => {
						res.status(200)
							.json(results);
						// let stories = results; // need this to clear promises from the Story List
					})
					.catch((e) => {
						console.log(e);
					});
			});
		});
	} else if (source === 'db' && typeof req.user !== 'undefined' && req.query.name !== 'null') {
		const tmpStories = [];
		const { name } = req.query;
		mongo.getOneRepository(name).then((body) => {
			const json = body.issues;
			console.log(json);
			if (Object.keys(json).length > 0) for (const key of Object.keys(json)) {
				const issue = json[key];
				const story = {
					story_id: issue.id,
					title: issue.title,
					body: issue.description,
					state: issue.status,
					issue_number: issue.id,
					assignee: issue.assignee,
					assignee_avatar_url: unassignedAvatarLink
				};
				tmpStories.push(helper.fuseGitWithDb(story, issue.id));
			}
			console.log(tmpStories);
			// let stories = results; // need this to clear promises from the Story List
			Promise.all(tmpStories).then((results) => { res.status(200).json(results); })
				.catch((e) => {
					console.log(e);
				});
		});
	} else res.sendStatus(401);
});

router.get('/callback', (req, res) =>{
    let code = req.query.code;
    const TOKEN_URL = 'https://github.com/login/oauth/access_token'
      request(
          {
              uri: TOKEN_URL,
              method: "POST",
              form: {
                  client_id: process.env.GITHUB_CLIENT_ID,
                  client_secret: process.env.GITHUB_CLIENT_SECRET,
                  code: code
              },
          }, function(err, response, body){
              const accessToken = body.split("&")[0].split("=")[1];
              helper.getGithubData(res, req, accessToken);
          }
      )
});


module.exports = router;
