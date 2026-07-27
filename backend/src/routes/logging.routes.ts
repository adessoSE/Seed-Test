import express from 'express';
import * as loggingController from '../controllers/logging.controller.js';

const router = express.Router();

// CORS, body parsing, and authentication are handled globally in server.ts.

/**
 * @route   POST /api/log
 * @desc    Logs a message from the frontend to the server's file system
 * @access  Public (or Private if auth middleware is added)
 */
router.post('/', loggingController.logFrontendMessage);

export default router;