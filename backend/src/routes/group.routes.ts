import express from 'express';
import * as groupController from '../controllers/group.controller';
import { authorizeRepo } from '../middleware/authorize';

const router = express.Router();

// CORS, body parsing, and authentication are handled globally in server.ts.

// Authorization: all group routes require repo-level access
const canRead = authorizeRepo('repo_id');
const canEdit = authorizeRepo('repo_id', { requireEdit: true });

// --- Route Definitions ---

/**
 * @route   GET /api/group/:repo_id
 * @desc    Get all story groups for a repository
 * @access  Private (repo member)
 */
router.get('/:repo_id', canRead, groupController.getAllGroups);

/**
 * @route   POST /api/group/:repo_id
 * @desc    Create a new story group
 * @access  Private (repo editor)
 */
router.post('/:repo_id', canEdit, groupController.createGroup);

/**
 * @route   PUT /api/group/:repo_id/:group_id
 * @desc    Update an existing story group
 * @access  Private (repo editor)
 */
router.put('/:repo_id/:group_id', canEdit, groupController.updateGroup);

/**
 * @route   DELETE /api/group/:repo_id/:group_id
 * @desc    Delete a story group
 * @access  Private (repo editor)
 */
router.delete('/:repo_id/:group_id', canEdit, groupController.deleteGroup);

/**
 * @route   POST /api/group/:repo_id/:group_id/:story_id
 * @desc    Add a story to a group
 * @access  Private (repo editor)
 */
router.post('/:repo_id/:group_id/:story_id', canEdit, groupController.addStoryToGroup);

/**
 * @route   DELETE /api/group/:repo_id/:group_id/:story_id
 * @desc    Remove a story from a group
 * @access  Private (repo editor)
 */
router.delete('/:repo_id/:group_id/:story_id', canEdit, groupController.removeStoryFromGroup);

/**
 * @route   PUT /api/group/:repo_id
 * @desc    Update the entire array of groups (e.g., reorder)
 * @access  Private (repo editor)
 */
router.put('/:repo_id', canEdit, groupController.updateGroupsArray);

export default router;