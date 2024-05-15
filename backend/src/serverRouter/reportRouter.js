import * as express from "express";
import cors from "cors";
import * as bodyParser from "body-parser";
import * as mongodb from "mongodb";
import mongo from "../database/DbServices.js";
const router = express.Router();
const { ObjectId } = mongodb;
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
// if json needed create a query option <path>?format=json and getReportById()
router.get('/:reportId', async (req, res) => {
    try {
        const result = await mongo.getReportDataById(req.params.reportId);
        res.status(200).json(result);
    }
    catch (error) {
        handleError(res, error, error, 500);
    }
});
export default router;
