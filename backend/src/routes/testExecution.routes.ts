import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import * as testExecutionController from '../controllers/testExecution.controller';

const router = express.Router();

// --- Basic Middleware (CORS, BodyParser, Headers, Logging) ---
// Authentication is assumed to be handled globally before this router.
router
    .use(cors({
        origin: [process.env.FRONTEND_URL || 'http://localhost:4200'],
        credentials: true
    }))
    .use(bodyParser.json({ limit: '100kb' })) // Adjust limits if needed
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
        console.log('Time of test execution request:', Date.now());
        next();
    });

// --- Test Execution Routes ---

/**
 * @route   POST /api/execute/Feature/:issueID
 * @desc    Run all scenarios in a single feature/story
 * @access  Private
 */
router.post('/Feature/:issueID', testExecutionController.runFeature);

/**
 * @route   POST /api/execute/Scenario/:issueID/:scenarioId
 * @desc    Run a single scenario within a feature/story
 * @access  Private
 */
router.post('/Scenario/:issueID/:scenarioId', testExecutionController.runScenario);

/**
 * @route   POST /api/execute/Group/:repoID/:groupID
 * @desc    Run all stories in a predefined group
 * @access  Private
 */
router.post('/Group/:repoID/:groupID', testExecutionController.runGroup);

/**
 * @route   POST /api/execute/TempGroup
 * @desc    Run stories from a dynamically provided temporary group
 * @access  Private
 */
router.post('/TempGroup', testExecutionController.runTempGroup);

export default router;