// src/controllers/logging.controller.spec.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { type Request, type Response, type NextFunction } from 'express';

// --- Mock setup (vi.hoisted ensures availability during vi.mock hoisting) ---
const {
	mockedFs,
	mockedPath
} = vi.hoisted(() => ({
	mockedFs: {
		existsSync: vi.fn(),
		mkdirSync: vi.fn(),
		createWriteStream: vi.fn(),
		default: undefined as any
	},
	mockedPath: {
		join: vi.fn(),
		default: undefined as any
	}
}));

// Wire up default exports so `import fs from 'node:fs'` resolves correctly
mockedFs.default = mockedFs;
mockedPath.default = mockedPath;

vi.mock('node:fs', () => mockedFs);
vi.mock('node:path', () => mockedPath);

// Import the module under test after mocks are registered
import * as controller from './logging.controller.js';

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

/** Creates a mock write stream with write() and end() stubs. */
function createMockStream() {
	return {
		write: vi.fn(),
		end: vi.fn()
	};
}


// --- Test Suite ---
describe('LoggingController', () => {
	let res: Response;
	let next: NextFunction;
	let mockStream: ReturnType<typeof createMockStream>;

	beforeEach(() => {
		vi.clearAllMocks();
		res = createRes();
		next = vi.fn();
		mockStream = createMockStream();

		// Default behavior: logs directory already exists, stream works
		mockedPath.join.mockReturnValue('/fake/logs/front.log');
		mockedFs.existsSync.mockReturnValue(true);
		mockedFs.createWriteStream.mockReturnValue(mockStream);
	});

	// ---------------------------------------------------------------
	// logFrontendMessage
	// ---------------------------------------------------------------
	describe('logFrontendMessage', () => {
		it('logs a message from the frontend and returns 200', async () => {
			const req = createReq({ body: { message: 'Button clicked' } });
			await controller.logFrontendMessage(req, res, next);

			// Verify the log entry was written
			expect(mockStream.write).toHaveBeenCalledWith(
				expect.stringContaining('Button clicked')
			);
			expect(mockStream.end).toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({ message: 'logged' });
			expect(next).not.toHaveBeenCalled();
		});

		it('uses default message when body.message is missing', async () => {
			const req = createReq({ body: {} });
			await controller.logFrontendMessage(req, res, next);

			// Controller falls back to 'No message provided'
			expect(mockStream.write).toHaveBeenCalledWith(
				expect.stringContaining('No message provided')
			);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(next).not.toHaveBeenCalled();
		});

		it('includes additional info when provided in body', async () => {
			const additional = { component: 'LoginPage', userId: 42 };
			const req = createReq({ body: { message: 'Login failed', additional } });
			await controller.logFrontendMessage(req, res, next);

			// Verify additional info is JSON-stringified in the log line
			expect(mockStream.write).toHaveBeenCalledWith(
				expect.stringContaining(JSON.stringify(additional))
			);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(next).not.toHaveBeenCalled();
		});

		it('creates the logs directory when it does not exist', async () => {
			mockedFs.existsSync.mockReturnValue(false);

			const req = createReq({ body: { message: 'First log entry' } });
			await controller.logFrontendMessage(req, res, next);

			// Verify mkdirSync was called to create the missing directory
			expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
				expect.anything(),
				{ recursive: true }
			);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(next).not.toHaveBeenCalled();
		});

		it('does not create the logs directory when it already exists', async () => {
			mockedFs.existsSync.mockReturnValue(true);

			const req = createReq({ body: { message: 'Repeat log' } });
			await controller.logFrontendMessage(req, res, next);

			expect(mockedFs.mkdirSync).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(200);
		});

		it('forwards errors to next() when file operations fail', async () => {
			const fsError = new Error('Permission denied');
			mockedFs.createWriteStream.mockImplementation(() => {
				throw fsError;
			});

			const req = createReq({ body: { message: 'This will fail' } });
			await controller.logFrontendMessage(req, res, next);

			expect(next).toHaveBeenCalledWith(fsError);
			expect(res.status).not.toHaveBeenCalled();
		});
	});
});
