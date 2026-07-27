import { Request, Response, NextFunction } from 'express';
import { devices } from '@playwright/test';
import { logger } from '../logging.js';

/**
 * Handles fetching all available Playwright device descriptors.
 */
export function getDevices(req: Request, res: Response, next: NextFunction): void {
	try {
		// The 'devices' object from playwright/test contains device descriptors
		res.status(200).json(devices);
	} catch (error) {
		logger.error(`Error fetching Playwright devices: ${error}`);
		// Pass a generic error to the central handler, but log the specific one
		next(new Error('Failed to fetch Playwright devices'));
	}
}

/**
 * Handles fetching only the names of available Playwright devices.
 */
export function getDeviceNames(req: Request, res: Response, next: NextFunction): void {
	try {
		// Get the keys (names) from the 'devices' object
		res.status(200).json(Object.keys(devices));
	} catch (error) {
		logger.error(`Error fetching Playwright device names: ${error}`);
		next(new Error('Failed to fetch Playwright device names'));
	}
}