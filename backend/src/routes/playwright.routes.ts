import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import * as playwrightController from '../controllers/playwright.controller';
const router = express.Router();

// --- Basic Middleware (CORS, BodyParser, Headers, Logging) ---
// Authentication: Assuming these routes might be public or auth is handled globally if needed.
// If authentication is required, add the 'isAuthenticated' middleware.
router
    .use(cors({
        origin: [process.env.FRONTEND_URL || 'http://localhost:4200'],
        credentials: true
    }))
    .use(bodyParser.json()) // No need for large limits usually
    .use(bodyParser.urlencoded({ extended: true }))
    .use((req, res, next) => { // Standard Headers
		res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:4200');
		res.header('Access-Control-Allow-Credentials', 'true');
		res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Credentials');
		next();
	})
    .use((_, __, next) => { // Simple request logging
        console.log('Time of playwright router request:', Date.now());
        next();
    });

// --- Playwright Routes ---

/**
 * @route   GET /api/playwright/devices
 * @desc    Get all available Playwright device descriptors
 * @access  Public (or Private based on global auth)
 */
router.get('/devices', playwrightController.getDevices);

/**
 * @route   GET /api/playwright/device-names
 * @desc    Get only the names of available Playwright devices
 * @access  Public (or Private based on global auth)
 */
router.get('/device-names', playwrightController.getDeviceNames);

export default router;