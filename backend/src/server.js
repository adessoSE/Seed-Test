import { config } from "dotenv";
import * as express from "express";
import cors from "cors";
import * as bodyParser from "body-parser";
import * as passport from "passport";
import * as flash from "express-flash";
import * as session from "express-session";
import MongoStore from "connect-mongo";
import scriptRouter from "./serverRouter/scriptRouter.js";
import runReportRouter from "./serverRouter/runReportRouter.js";
import githubRouter from "./serverRouter/githubRouter.js";
import mongo from "./database/DbServices.js";
import jiraRouter from "./serverRouter/jiraRouter.js";
import userRouter from "./serverRouter/userRouter.js";
import groupRouter from "./serverRouter/groupRouter.js";
import workgroupsRouter from "./serverRouter/workgroups.js";
import storyRouter from "./serverRouter/storyRouter.js";
import blockRouter from "./serverRouter/blockRouter.js";
import reportRouter from "./serverRouter/reportRouter.js";
import backgroundRouter from "./serverRouter/backgroundRouter.js";
import sanityTest from "./serverRouter/sanityTest.js";
import logging from "./logging.js";
({ config }.config());
import './database/DbServices.js';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.disable('x-powered-by');
// Initialize the app.
const server = app.listen(process.env.PORT || 8080, () => {
    const { port } = server.address();
    console.log(`App now running on port: ${port}`);
});
server.setTimeout(600000);
/**
 * API Description
 */
if (process.env.NODE_ENV)
    app
        .use(flash())
        .use(session({
        store: MongoStore.create({
            mongoUrl: process.env.DATABASE_URI || 'mongodb://SeedAdmin:SeedTest@seedmongodb:27017',
            dbName: 'Seed',
            collectionName: 'Sessions'
        }),
        secret: process.env.SESSION_SECRET || 'unsaveSecret',
        resave: false,
        saveUninitialized: false,
        proxy: true,
        cookie: {
            secure: true,
            sameSite: 'none'
        }
    }));
else
    app
        .use(flash())
        .use(session({
        secret: process.env.SESSION_SECRET || 'unsaveSecret',
        resave: false,
        saveUninitialized: false,
        proxy: true
    }));
app
    .use(cors({
    origin: [
        process.env.FRONTEND_URL || 'http://localhost:4200'
    ],
    credentials: true
}));
app
    .use(passport.initialize())
    .use(passport.session())
    .use((_, __, next) => {
    logging.httpLog(_, __, next);
})
    .use('/api/script', scriptRouter)
    .use('/api/run', runReportRouter)
    .use('/api/github', githubRouter)
    .use('/api/jira', jiraRouter)
    .use('/api/user', userRouter)
    .use('/api/group', groupRouter)
    .use('/api/workgroups', workgroupsRouter)
    .use('/api/story', storyRouter)
    .use('/api/block', blockRouter)
    .use('/api/report', reportRouter)
    .use('/api/background', backgroundRouter)
    .use('/api/sanity', sanityTest)
    .get('/api/stepTypes', async (_, res) => {
    try {
        const result = await mongo.showSteptypes();
        res.status(200)
            .json(result);
    }
    catch (error) {
        console.error(`ERROR: ${error}`);
        res.status(500)
            .json({ error });
    }
})
    .get('/api', (_, res) => {
    res.sendFile('htmlresponse/apistandartresponse.html', { root: __dirname });
});
export { app };
export default {
    app
};
