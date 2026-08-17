import express from 'express';
import * as backgroundController from '../controllers/background.controller.js';
import { authorizeByStory } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { updateBackgroundSchema } from '@shared/schemas/background.schemas.js';

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
router.put('/:storyID', canEdit, validate(updateBackgroundSchema), backgroundController.updateBackground);

/**
 * @route   DELETE /api/background/:storyID
 * @desc    Delete/Reset the background of a story
 * @access  Private (repo editor)
 */
router.delete('/:storyID', canEdit, backgroundController.deleteBackground);

export default router;