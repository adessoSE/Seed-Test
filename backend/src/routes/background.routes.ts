import express from 'express';
import * as backgroundController from '../controllers/background.controller';

const router = express.Router();

// CORS, body parsing, and authentication are handled globally in server.ts.

// --- Route Definitions ---

/**
 * @route   PUT /api/background/:storyID
 * @desc    Update the background of a story
 * @access  Private (Authenticated users)
 */
router.put('/:storyID', backgroundController.updateBackground);

/**
 * @route   DELETE /api/background/:storyID
 * @desc    Delete/Reset the background of a story
 * @access  Private (Authenticated users)
 */
router.delete('/:storyID', backgroundController.deleteBackground);

export default router;