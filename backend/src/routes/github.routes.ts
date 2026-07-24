import express from 'express';
import * as githubController from '../controllers/github.controller';

const router = express.Router();

// CORS, body parsing, and authentication are handled globally in server.ts.


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