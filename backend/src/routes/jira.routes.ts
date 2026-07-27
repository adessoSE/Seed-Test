import express from 'express';
import * as jiraController from '../controllers/jira.controller.js';

const router = express.Router();

// CORS, body parsing, and authentication are handled globally in server.ts.

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