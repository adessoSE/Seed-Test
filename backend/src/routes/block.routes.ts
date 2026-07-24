import express from 'express';
import * as blockController from '../controllers/block.controller';

const router = express.Router();

// CORS, body parsing, and authentication are handled globally in server.ts.

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
 * @access  Public or Private (depending on middleware)
 */
router.get('/getBlocks/:repoId', blockController.getBlocks);

/**
 * @route   PUT /api/block/:blockId
 * @desc    Update an existing block by its ID
 * @access  Private (Authenticated users, ownership checked in service/controller)
 */
router.put('/:blockId', blockController.updateBlock);

/**
 * @route   DELETE /api/block/:blockId
 * @desc    Delete a block by its ID
 * @access  Private (Authenticated users, ownership checked in controller)
 */
router.delete('/:blockId', blockController.deleteBlock);


export default router;