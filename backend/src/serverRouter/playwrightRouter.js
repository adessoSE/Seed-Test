const express = require('express');

const router = express.Router();
const { devices } = require('@playwright/test');

/**
 * @route GET /api/playwright/devices
 * @desc Gibt alle verfügbaren Playwright-Geräte zurück
 */
router.get('/devices', (req, res) => {
	try {
		res.status(200).json(devices);
	} catch (error) {
		console.error('Error fetching Playwright devices:', error);
		res.status(500).json({ error: 'Failed to fetch Playwright devices' });
	}
});

/**
 * @route GET /api/playwright/device-names
 * @desc Gibt nur die Namen der verfügbaren Playwright-Geräte zurück
 */
router.get('/device-names', (req, res) => {
	try {
		res.status(200).json(Object.keys(devices));
	} catch (error) {
		console.error('Error fetching Playwright device names:', error);
		res.status(500).json({ error: 'Failed to fetch Playwright device names' });
	}
});

module.exports = router;
