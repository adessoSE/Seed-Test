// src/controllers/playwright.controller.spec.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { type Request, type Response, type NextFunction } from 'express';

// --- Mock setup (vi.hoisted ensures availability during vi.mock hoisting) ---
const {
	mockedDevices,
	mockedLogger
} = vi.hoisted(() => ({
	mockedDevices: {
		'iPhone 13': { userAgent: 'Mozilla/5.0 (iPhone)', viewport: { width: 390, height: 844 } },
		'Pixel 5': { userAgent: 'Mozilla/5.0 (Linux; Android)', viewport: { width: 393, height: 851 } }
	} as Record<string, any>,
	mockedLogger: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn()
	}
}));

vi.mock('@playwright/test', () => ({ devices: mockedDevices }));
vi.mock('../logging', () => ({ logger: mockedLogger }));

// Import the module under test after mocks are registered
import * as controller from './playwright.controller.js';

// --- Test helpers ---

/** Creates a minimal Express Request with sensible defaults and optional overrides. */
function createReq(overrides: Record<string, any> = {}): Request {
	return {
		body: {},
		params: {},
		query: {},
		...overrides
	} as unknown as Request;
}

/** Creates a mock Express Response with chainable status() and json(). */
function createRes(): Response {
	const res = {} as Response;
	res.status = vi.fn().mockReturnValue(res);
	res.json = vi.fn().mockReturnValue(res);
	return res;
}


// --- Test Suite ---
describe('PlaywrightController', () => {
	let res: Response;
	let next: NextFunction;

	beforeEach(() => {
		vi.clearAllMocks();
		res = createRes();
		next = vi.fn();
	});

	// ---------------------------------------------------------------
	// getDevices
	// ---------------------------------------------------------------
	describe('getDevices', () => {
		it('returns the full Playwright device descriptors', () => {
			const req = createReq();
			controller.getDevices(req, res, next);

			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(mockedDevices);
			expect(next).not.toHaveBeenCalled();
		});

		it('forwards errors to next() when res.json throws', () => {
			// Simulate an unexpected error during serialization
			const jsonError = new Error('Circular reference');
			(res.json as ReturnType<typeof vi.fn>).mockImplementation(() => {
				throw jsonError;
			});

			const req = createReq();
			controller.getDevices(req, res, next);

			// Controller wraps the error and forwards a generic message
			expect(mockedLogger.error).toHaveBeenCalled();
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ message: 'Failed to fetch Playwright devices' })
			);
		});
	});

	// ---------------------------------------------------------------
	// getDeviceNames
	// ---------------------------------------------------------------
	describe('getDeviceNames', () => {
		it('returns only device names as a string array', () => {
			const req = createReq();
			controller.getDeviceNames(req, res, next);

			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(['iPhone 13', 'Pixel 5']);
			expect(next).not.toHaveBeenCalled();
		});

		it('returns an empty array when no devices are available', () => {
			// Temporarily replace the devices object keys
			const originalKeys = Object.keys(mockedDevices);
			originalKeys.forEach((key) => delete mockedDevices[key]);

			const req = createReq();
			controller.getDeviceNames(req, res, next);

			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith([]);
			expect(next).not.toHaveBeenCalled();

			// Restore the mock devices for subsequent tests
			mockedDevices['iPhone 13'] = { userAgent: 'Mozilla/5.0 (iPhone)', viewport: { width: 390, height: 844 } };
			mockedDevices['Pixel 5'] = { userAgent: 'Mozilla/5.0 (Linux; Android)', viewport: { width: 393, height: 851 } };
		});

		it('forwards errors to next() when res.json throws', () => {
			const jsonError = new Error('Serialization error');
			(res.json as ReturnType<typeof vi.fn>).mockImplementation(() => {
				throw jsonError;
			});

			const req = createReq();
			controller.getDeviceNames(req, res, next);

			expect(mockedLogger.error).toHaveBeenCalled();
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ message: 'Failed to fetch Playwright device names' })
			);
		});
	});
});
