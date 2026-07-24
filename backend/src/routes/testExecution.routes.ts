import express from 'express';
import * as testExecutionController from '../controllers/testExecution.controller';

const router = express.Router();

// CORS, body parsing, and authentication are handled globally in server.ts.
router.use((_, __, next) => {
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