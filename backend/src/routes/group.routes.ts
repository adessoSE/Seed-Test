import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import * as groupController from '../controllers/group.controller';

const router = express.Router();

// --- Basic Middleware (CORS, BodyParser, Headers, Logging) ---
// Authentication is assumed to be handled globally.
router
    .use(cors({
        origin: [process.env.FRONTEND_URL || 'http://localhost:4200'],
        credentials: true
    }))
    .use(bodyParser.json({ limit: '100kb' }))
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
        console.log('Time of group router request:', Date.now());
        next();
    });

// --- Route Definitions ---

/**
 * @route   GET /api/group/:repo_id
 * @desc    Get all story groups for a repository
 * @access  Private
 */
router.get('/:repo_id', groupController.getAllGroups);

/**
 * @route   POST /api/group/:repo_id
 * @desc    Create a new story group
 * @access  Private
 */
router.post('/:repo_id', groupController.createGroup);

/**
 * @route   PUT /api/group/:repo_id/:group_id
 * @desc    Update an existing story group
 * @access  Private
 */
router.put('/:repo_id/:group_id', groupController.updateGroup);

/**
 * @route   DELETE /api/group/:repo_id/:group_id
 * @desc    Delete a story group
 * @access  Private
 */
router.delete('/:repo_id/:group_id', groupController.deleteGroup);

/**
 * @route   POST /api/group/:repo_id/:group_id/:story_id
 * @desc    Add a story to a group
 * @access  Private
 */
router.post('/:repo_id/:group_id/:story_id', groupController.addStoryToGroup);

/**
 * @route   DELETE /api/group/:repo_id/:group_id/:story_id
 * @desc    Remove a story from a group
 * @access  Private
 */
router.delete('/:repo_id/:group_id/:story_id', groupController.removeStoryFromGroup);

/**
 * @route   PUT /api/group/:repo_id
 * @desc    Update the entire array of groups (e.g., reorder)
 * @access  Private
 */
router.put('/:repo_id', groupController.updateGroupsArray);

export default router;