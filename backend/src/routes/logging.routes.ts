import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import * as loggingController from '../controllers/logging.controller';

const router = express.Router();

router
    .use(cors({
        origin: [process.env.FRONTEND_URL || 'http://localhost:4200'],
        credentials: true
    }))
    .use(bodyParser.json({ limit: '100kb' }))
    .use((req, res, next) => { // Standard Headers
		res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:4200');
		res.header('Access-Control-Allow-Credentials', 'true');
		res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Credentials');
		next();
	});

/**
 * @route   POST /api/log
 * @desc    Logs a message from the frontend to the server's file system
 * @access  Public (or Private if auth middleware is added)
 */
router.post('/', loggingController.logFrontendMessage);

export default router;