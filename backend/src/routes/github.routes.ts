import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import * as githubController from '../controllers/github.controller';

const router = express.Router();

// --- Basic Middleware (CORS, BodyParser, Headers) ---
// Authentication is assumed to be handled globally before this router.
router
    .use(cors({
        origin: [process.env.FRONTEND_URL || 'http://localhost:4200'],
        credentials: true
    }))
    .use(bodyParser.json({ limit: '100kb' }))
    .use(bodyParser.urlencoded({
        limit: '100kb',
        extended: true
    }))
    .use((req, res, next) => { // Standard Headers
		res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:4200');
		res.header('Access-Control-Allow-Credentials', 'true');
		res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Credentials');
		next();
	})
    .use((_, __, next) => { // Simple request logging
        console.log('Time of github router request:', Date.now());
        next();
    });


// --- Route Definitions ---

/**
 * @route   POST /api/github/submitIssue/
 * @desc    Submit a new StepType request as a GitHub issue
 * @access  Private (or Public depending on if TESTACCOUNT_TOKEN is used) - Requires careful consideration
 */
router.post('/submitIssue/', githubController.submitIssue);

/**
 * @route   DELETE /api/github/disconnectGithub
 * @desc    Disconnect the logged-in user's GitHub account linkage
 * @access  Private (Requires Authentication)
 */
router.delete('/disconnectGithub', githubController.disconnectGithub);


export default router;