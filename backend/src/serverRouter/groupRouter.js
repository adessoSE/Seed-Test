const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongo = require('../database/mongodatabase');

const router = express.Router();

// Handling response errors
function handleError(res, reason, statusMessage, code) {
	console.error(`ERROR: ${reason}`);
	res.status(code || 500)
		.json({ error: statusMessage });
}

// router for all requests regarding groups
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
		res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Credentials');
		next();
	})
	.use((_, __, next) => {
		console.log('Time of mongoDB request:', Date.now());
		next();
	})
	.use((req, res, next) => {
		if (req.user) next();
		else console.log('not Authenticated');
	});

// get All Groups and StoryIds
router.get('/:repo_id', async (req, res) => {
	try {
		const groups = await mongo.getAllStoryGroups(req.params.repo_id);
		res.status(200).json(groups.groups);
	} catch (e) {
		handleError(res, e, e, 500);
	}
	console.log('get story ', req.params.repo_id, req.params.group_id);
});

// create Group
router.post('/:repo_id', async (req, res) => {
	console.log('Create StoryGroup ', req.params.repo_id);
	try {
		const groupID = await mongo.createStoryGroup(req.params.repo_id, req.body.name, req.body.member_stories);
		res.status(200).json({ group_id: groupID });
	} catch (e) {
		handleError(res, e, e, 500);
	}
});

// update Group
router.put('/:repo_id/:group_id', async (req, res) => {
	console.log('Update StoryGroup ', req.params.repo_id, req.params.group_id, req.body);
	try {
		const group = await mongo.updateStoryGroup(req.params.repo_id, req.params.group_id, req.body);
		res.status(200).json(group);
	} catch (e) {
		handleError(res, e, e, 500);
	}
});

// delete Group
router.delete('/:repo_id/:group_id', async (req, res) => {
	console.log('Delete StoryGroup ', req.params.repo_id, req.params.group_id);
	try {
		await mongo.deleteStoryGroup(req.params.repo_id, req.params.group_id);
		res.status(200).json({ text: 'success' });
	} catch (e) {
		handleError(res, e, e, 500);
	}
});

// add Story to Group
router.post('/:repo_id/:group_id/:story_id', async (req, res) => {
	console.log('Add Story to Group ', req.params.repo_id, req.params.group_id, req.params.story_id);
	try {
		await mongo.addToStoryGroup(req.params.repo_id, req.params.group_id, req.params.story_id);
		res.status(200).json({ text: 'success' });
	} catch (e) {
		handleError(res, e, e, 500);
	}
});

// remove Story from Group
router.delete('/:repo_id/:group_id/:story_id', async (req, res) => {
	console.log('Remove Story from Group ', req.params.repo_id, req.params.group_id, req.params.story_id);
	try {
		await mongo.removeFromStoryGroup(req.params.repo_id, req.params.group_id, req.params.story_id);
		res.status(200).json({ text: 'success' });
	} catch (e) {
		handleError(res, e, e, 500);
	}
});

// update Groups-Array in repo
router.put('/:repo_id', async (req, res) => {
	try {
		await mongo.updateStoryGroupsArray(req.params.repo_id, req.body);
		res.status(200).json({ text: 'success' });
	} catch (e) {
		handleError(res, e, e, 500);
	}
});

module.exports = router;
