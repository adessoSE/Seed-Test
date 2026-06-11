import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import * as jiraController from '../controllers/jira.controller';

const router = express.Router();

// --- Basic Middleware (CORS, BodyParser, Headers, Logging) ---
// Authentication is assumed to be handled globally.
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
		res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Credentials, Authorization, X-Redirect');
		next();
	})
    .use((_, __, next) => { // Simple request logging
        console.log('Time of jira router request:', Date.now());
        next();
    });

// --- Jira Routes ---

/**
 * @route   POST /api/jira/link
 * @desc    Links or updates Jira credentials for the logged-in user
 * @access  Private
 */
router.post('/link', jiraController.linkJiraCredentials);

/**
 * @route   DELETE /api/jira/disconnect
 * @desc    Disconnects the Jira account for the logged-in user
 * @access  Private
 */
router.delete('/disconnect', jiraController.disconnectJira);

/**
 * @route   POST /api/jira/login
 * @desc    Performs a Jira login test (legacy route)
 * @access  Private
 */
router.post('/login', jiraController.jiraLogin);

/**
 * @route   PUT /api/jira/xray-status
 * @desc    Updates the status of an XRay test step
 * @access  Private
 */
router.put('/xray-status', jiraController.updateXrayStatus);

export default router;