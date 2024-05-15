import * as express from "express";
import cors from "cors";
import * as bodyParser from "body-parser";
import helper from "../serverHelper.js";
import mongo from "../database/DbServices.js";
const router = express.Router();
// router for all block requests
router
    .use(cors())
    .use(bodyParser.json({ limit: '100kb' }))
    .use(bodyParser.urlencoded({
    limit: '100kb',
    extended: true
}))
    .use((_, __, next) => {
    console.log('Time of github request:', Date.now());
    next();
})
    .use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:4200');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Credentials');
    next();
});
// Handling response errors
function handleError(res, reason, statusMessage, code) {
    console.error(`ERROR: ${reason}`);
    res.status(code || 500)
        .json({ error: statusMessage });
}
// update background
router.put('/:storyID', async (req, res) => {
    try {
        const background = req.body;
        const result = await mongo.updateBackground(req.params.storyID, background);
        helper.updateFeatureFile(req.params.storyID);
        res.status(200)
            .json(result);
    }
    catch (error) {
        handleError(res, error, error, 500);
    }
});
// delete background
router.delete('/:storyID', async (req, res) => {
    try {
        await mongo.deleteBackground(req.params.storyID);
        helper.updateFeatureFile(req.params.storyID);
        res.status(200)
            .json({});
    }
    catch (error) {
        handleError(res, error, error, 500);
    }
});
export default router;
