import express from 'express';
import * as testExecutionController from '../controllers/testExecution.controller.js';
import { authorizeRepo, authorizeByStory } from '../middleware/authorize.js';

const router = express.Router();

// CORS, body parsing, and authentication are handled globally in server.ts.

// Authorization: test execution requires edit access to the target story/repo
const canRunByStory = authorizeByStory('issueID', { requireEdit: true });
const canRunGroup = authorizeRepo('repoID', { requireEdit: true });
const canRunTempGroup = authorizeRepo('repositoryId', { requireEdit: true, source: 'body' });

// --- Test Execution Routes ---

/**
 * @route   POST /api/execute/Feature/:issueID
 * @desc    Run all scenarios in a single feature/story
 * @access  Private (repo edit access)
 */
router.post('/Feature/:issueID', canRunByStory, testExecutionController.runFeature);

/**
 * @route   POST /api/execute/Scenario/:issueID/:scenarioId
 * @desc    Run a single scenario within a feature/story
 * @access  Private (repo edit access)
 */
router.post('/Scenario/:issueID/:scenarioId', canRunByStory, testExecutionController.runScenario);

/**
 * @route   POST /api/execute/Group/:repoID/:groupID
 * @desc    Run all stories in a predefined group
 * @access  Private (repo edit access)
 */
router.post('/Group/:repoID/:groupID', canRunGroup, testExecutionController.runGroup);

/**
 * @route   POST /api/execute/TempGroup
 * @desc    Run stories from a dynamically provided temporary group
 * @access  Private (repo edit access)
 */
router.post('/TempGroup', canRunTempGroup, testExecutionController.runTempGroup);

export default router;