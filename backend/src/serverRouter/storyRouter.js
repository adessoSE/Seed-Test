const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
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

router.get('/:id/:source', (req, res)=>{
    try {

        const story = mongo.getOneStory(req.params._id, req.params.source)
        res.status(200).json(story)
    } catch (e) {
        handleError(res, e, e, 500)
    }
});

router.post('/',async (req, res)=> {
    try {
        const db_id = await mongo.createStory(req.body.title, req.body.description, req.body._id);
        mongo.insertStoryIdIntoRepo( db_id, req.body._id)
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

router.delete('/:repo_id/:_id', (req, res)=>{
   try {
       mongo.deleteStory(req.params.repo_id, req.params._id)
       res.status(200).json({text: 'success'})
   } catch (e) {
       handleError(res, e, e, 500);
   }
});

module.exports = router;