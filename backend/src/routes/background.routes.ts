import express from 'express';
import * as backgroundController from '../controllers/background.controller';
import { authorizeByStory } from '../middleware/authorize';

const router = express.Router();

// CORS, body parsing, and authentication are handled globally in server.ts.

// Authorization: background modifications require edit access to the story's repository
const canEdit = authorizeByStory('storyID', { requireEdit: true });

// --- Route Definitions ---

/**
 * @route   PUT /api/background/:storyID
 * @desc    Update the background of a story
 * @access  Private (repo editor)
 */
router.put('/:storyID', canEdit, backgroundController.updateBackground);

/**
 * @route   DELETE /api/background/:storyID
 * @desc    Delete/Reset the background of a story
 * @access  Private (repo editor)
 */
router.delete('/:storyID', canEdit, backgroundController.deleteBackground);

export default router;