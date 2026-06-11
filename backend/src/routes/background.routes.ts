import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import * as backgroundController from '../controllers/background.controller';

const router = express.Router();

// --- Basic Middleware (CORS, BodyParser, Headers) ---
// Authentication is assumed to be handled globally before this router.
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
        console.log('Time of background router request:', Date.now());
        next();
    });

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