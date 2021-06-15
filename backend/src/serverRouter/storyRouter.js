const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helper = require('../serverHelper');
const mongo = require('../database/mongodatabase')

const router = express.Router();

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

// Handling response errors
function handleError(res, reason, statusMessage, code) {
    console.error(`ERROR: ${reason}`);
    res.status(code || 500)
        .json({ error: statusMessage });
}

router.get('/:_id/:source', async (req, res) => {
    try {
        const story = await mongo.getOneStory(req.params._id, req.params.source)
        res.status(200).json(story)
    } catch (e) {
        handleError(res, e, e, 500)
    }
});

router.post('/',async (req, res)=> {
    try {
        const db_id = await mongo.createStory(req.body.title, req.body.description, req.body._id);
        await mongo.insertStoryIdIntoRepo( db_id, req.body._id)
        res.status(200).json(db_id)
    } catch (e) {
        handleError(res, e, e, 500);
    }

});

router.put('/:_id', async (req, res)=>{
    try {
        console.log(req.body)
        const story = await mongo.updateStory(req.body)
        res.status(200).json(story)
    } catch (e) {
        handleError(res, e, e, 500);
    }
});

router.delete('/:repo_id/:_id', async (req, res)=>{
   try {
       await mongo.deleteStory(req.params.repo_id, req.params._id)
       res.status(200).json({text: 'success'})
   } catch (e) {
       handleError(res, e, e, 500);
   }
});

// get one scenario
router.get('/:story_id/:source/:_id', async (req, res)=>{
    try {
        const scenario = await mongo.getOneScenario(req.params.story_id, req.params.source, parseInt(req.params._id, 10))
        console.log(scenario)
        res.status(200).json(scenario)
    } catch (e) {
        handleError(res, e, e, 500)
    }
});

// create scenario
// TODO: add storySource parameter in frontend
router.post('/:story_id/:source', async (req, res) => {
    try {
        const scenario = await mongo.createScenario(req.params.story_id, req.params.source);
        await helper.updateFeatureFile(req.params.story_id, req.params.source);
        res.status(200)
            .json(scenario);
    } catch (error) {
        handleError(res, error, error, 500);
    }
});
// update scenario
// TODO: add storySource parameter in frontend
router.put('/:story_id/:source/:_id', async (req, res) => {
    console.log(req.body)
    try {
        const scenario = req.body;
        const updatedStory = await mongo.updateScenario(req.params.story_id, req.params.source, scenario);
        await helper.updateFeatureFile(req.params.story_id, req.params.source);
        res.status(200)
            .json(updatedStory);
    } catch (error) {
        handleError(res, error, error, 500);
    }
});
// delete scenario
// TODO: add storySource parameter in frontend
router.delete('/:story_id/:source/:_id', async (req, res) => {
    try {
        await mongo
            .deleteScenario(req.params.story_id, req.params.source, parseInt(req.params._id, 10));
        await helper.updateFeatureFile(req.params.story_id, req.params.source);
        res.status(200)
            .json({text: 'success'});
    } catch (error) {
        handleError(res, error, error, 500);
    }
});


module.exports = router;