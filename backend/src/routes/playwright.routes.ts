import express from 'express';
import * as playwrightController from '../controllers/playwright.controller.js';

const router = express.Router();

// CORS, body parsing, and authentication are handled globally in server.ts.

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