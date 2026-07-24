import express from 'express';
import * as blockController from '../controllers/block.controller';
import { authorizeRepo } from '../middleware/authorize';

const router = express.Router();

// CORS, body parsing, and authentication are handled globally in server.ts.

// Authorization: GET checks repo access; PUT/DELETE already enforce block ownership in the service layer
const canRead = authorizeRepo('repoId');

// --- Route Definitions ---

/**
 * @route   POST /api/block/
 * @desc    Save a new custom block
 * @access  Private (Authenticated users)
 */
router.post('/', blockController.saveBlock);

/**
 * @route   GET /api/block/getBlocks/:repoId
 * @desc    Get all blocks for a repository
 * @access  Private (repo member)
 */
router.get('/getBlocks/:repoId', canRead, blockController.getBlocks);

/**
 * @route   PUT /api/block/:blockId
 * @desc    Update an existing block by its ID
 * @access  Private (block ownership checked in service layer)
 */
router.put('/:blockId', blockController.updateBlock);

/**
 * @route   DELETE /api/block/:blockId
 * @desc    Delete a block by its ID
 * @access  Private (block ownership checked in service layer)
 */
router.delete('/:blockId', blockController.deleteBlock);


export default router;