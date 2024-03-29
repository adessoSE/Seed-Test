/* eslint-disable prefer-arrow-callback */
/* eslint-disable curly */
/* eslint-disable max-len */
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const process = require('process');
const passport = require('passport');
const initializePassport = require('../passport-config');
const reporter = require('../../dist/helpers/reporting');
const mongo = require('../database/DbServices');

const router = express.Router();

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
		res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:4200');
		res.header('Access-Control-Allow-Credentials', 'true');
		res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Credentials, Authorization, X-Redirect');
		next();
	})
	.use((_, __, next) => {
		console.log('Time of user request:', Date.now());
		next();
	});

router.post('/Group', (req, res, next) => {
	if (req.body.stayLoggedIn) req.session.cookie.maxAge = 864000000;
	req.body.email = req.body.email.toLowerCase();
	try {
		passport.authenticate('normal-local', (error, user, info) => {
			if (error) {
				throw new UserError(error);
			} else if (!user) {
				info.status = 'error';
				return res.json(info);
			}
			req.logIn(user, async function (err) {
				if (err) {
					throw new UserError(err);
				} else {
					const group = await mongo.getOneStoryGroup(req.body.repoID, req.body.groupID);
					const mystories = [];
					for (const id of group.member_stories) mystories.push(await mongo.getOneStory(id));
					req.body = group;
					reporter.runReport(req, res, mystories, 'group', req.body);
					// res.json(user);
				}
			});
		})(req, res, next);
	} catch (error) {
		res.status(401).json(error);
	}
});

router.post('/Feature/:issueID', (req, res, next) => {
	if (req.body.stayLoggedIn) req.session.cookie.maxAge = 864000000;
	req.body.email = req.body.email.toLowerCase();
	try {
		passport.authenticate('normal-local', (error, user, info) => {
			if (error) {
				throw new UserError(error);
			} else if (!user) {
				info.status = 'error';
				return res.json(info);
			}
			req.logIn(user, async function (err) {
				if (err) {
					throw new UserError(err);
				} else {
					const stories = [];
					reporter.runReport(req, res, stories, 'feature', req.body);
					// res.json(user);
				}
			});
		})(req, res, next);
	} catch (error) {
		res.status(401).json(error);
	}
});

module.exports = router;
