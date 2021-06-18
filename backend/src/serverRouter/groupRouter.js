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

// router for all mongo requests
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
        //console.log(_.url + JSON.stringify(_.user));
        console.log('Time of mongoDB request:', Date.now());
        next();
    });

//get Stories in Group
router.get('/:repo_id/:group_id', async (req, res) => {
    //query param full=true storyIDs vs Story Objects
    console.log("get story ", req.params.repo_id, req.params.group_id)
    res.send().status(501)
});

//create Group
router.post('/:repo_id', async (req, res) => {
    console.log("Create StoryGroup ",req.params.repo_id)
    res.send().status(501)
});

//update Group
router.put('/:repo_id/:group_id', async (req, res) => {
    console.log("Update StoryGroup ", req.params.repo_id, req.params.group_id, req.body)
    res.send().status(501)
});

//delete Group
router.delete('/:repo_id/:group_id',  async (req, res) => {
    console.log("Delete StoryGroup ", req.params.repo_id, req.params.group_id)
    res.send().status(501)
});

//add Story to Group
router.post('/:repo_id/:group_id/:story_id', async (req, res) => {
    console.log("Add Story to Group ", req.params.repo_id, req.params.group_id, req.params.story_id)
    res.send().status(501)
});

//remove Story from Group
router.delete('/:repo_id/:group_id/:story_id', async (req, res) => {
    console.log("Remove Story from Group ", req.params.repo_id, req.params.group_id, req.params.story_id)
    res.send().status(501)
});