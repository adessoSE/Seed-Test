import express from 'express';
import * as repositoryController from '../controllers/repository.controller';

const router = express.Router();

// CORS, body parsing, and authentication are handled globally in server.ts.

// --- Repository Management Routes ---

/**
 * @route   GET /api/repository/
 * @desc    Get all repositories for the logged-in user
 * @access  Private
 */
router.get('/', repositoryController.getRepositories);

/**
 * @route   POST /api/repository/
 * @desc    Create a new repository
 * @access  Private
 */
router.post('/', repositoryController.createRepository);

/**
 * @route   GET /api/repository/settings/:repo_id
 * @desc    Get global settings for a repository
 * @access  Private
 */
router.get('/settings/:repo_id', repositoryController.getRepositorySettings);

/**
 * @route   GET /api/repository/aiconfig/:repo_id
 * @desc    Get AI config for a repository
 * @access  Private
 */
router.get('/aiconfig/:repo_id', repositoryController.getRepositoryAiConfig);

/**
 * @route   PUT /api/repository/settings/:repo_id
 * @desc    Update repository settings (name, global, ai)
 * @access  Private
 */
router.put('/settings/:repo_id', repositoryController.updateRepositorySettings);

/**
 * @route   PUT /api/repository/owner/:repo_id
 * @desc    Transfer ownership of a repository
 * @access  Private
 */
router.put('/owner/:repo_id', repositoryController.updateRepositoryOwner);

/**
 * @route   DELETE /api/repository/:repo_id
 * @desc    Delete a repository
 * @access  Private
 */
router.delete('/:repo_id', repositoryController.deleteRepository);


export default router;