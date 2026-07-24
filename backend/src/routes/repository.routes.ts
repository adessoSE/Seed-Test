import express from 'express';
import * as repositoryController from '../controllers/repository.controller';
import { authorizeRepo } from '../middleware/authorize';

const router = express.Router();

// CORS, body parsing, and authentication are handled globally in server.ts.

// Authorization: repo-level access checked via authorizeRepo middleware.
const canRead = authorizeRepo('repo_id');
const canEdit = authorizeRepo('repo_id', { requireEdit: true });
const ownerOnly = authorizeRepo('repo_id', { ownerOnly: true });

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
 * @access  Private (repo member)
 */
router.get('/settings/:repo_id', canRead, repositoryController.getRepositorySettings);

/**
 * @route   GET /api/repository/aiconfig/:repo_id
 * @desc    Get AI config for a repository
 * @access  Private (repo member)
 */
router.get('/aiconfig/:repo_id', canRead, repositoryController.getRepositoryAiConfig);

/**
 * @route   PUT /api/repository/settings/:repo_id
 * @desc    Update repository settings (name, global, ai)
 * @access  Private (repo editor)
 */
router.put('/settings/:repo_id', canEdit, repositoryController.updateRepositorySettings);

/**
 * @route   PUT /api/repository/owner/:repo_id
 * @desc    Transfer ownership of a repository
 * @access  Private (owner only)
 */
router.put('/owner/:repo_id', ownerOnly, repositoryController.updateRepositoryOwner);

/**
 * @route   DELETE /api/repository/:repo_id
 * @desc    Delete a repository
 * @access  Private (owner only)
 */
router.delete('/:repo_id', ownerOnly, repositoryController.deleteRepository);


export default router;