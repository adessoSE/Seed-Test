import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import * as blockController from '../controllers/block.controller';

const router = express.Router();

// --- Middleware Setup (Basic: CORS, BodyParser, Headers) ---
// Authentication is now assumed to be handled globally *before* this router.
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
        console.log('Time of block router request:', Date.now());
        next();
    });

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