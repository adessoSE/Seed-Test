// src/controllers/background.controller.spec.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { AppError } from '../helpers/AppError.js';

// --- Mock setup (vi.hoisted ensures availability during vi.mock hoisting) ---
const {
	mockedStoryService,
	mockedFeatureFileService,
	mockedLogger,
} = vi.hoisted(() => ({
	mockedStoryService: {
		updateBackground: vi.fn(),
		deleteBackground: vi.fn(),
	},
	mockedFeatureFileService: {
		updateFeatureFile: vi.fn(),
	},
	mockedLogger: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
	},
}));

vi.mock('../services/story.service', () => mockedStoryService);
vi.mock('../services/feature-file.service', () => mockedFeatureFileService);
vi.mock('../logging', () => ({ logger: mockedLogger }));

// Import the module under test after mocks are registered
import * as controller from './background.controller.js';

// --- Test constants ---
const VALID_ID = '507f1f77bcf86cd799439011';
const INVALID_ID = 'invalid';

// --- Test helpers ---

/** Creates a minimal Express Request with sensible defaults and optional overrides. */
function createReq(overrides: Record<string, any> = {}): Request {
	return {
		body: {},
		params: {},
		query: {},
		user: { _id: new ObjectId(VALID_ID), email: 'test@seed.de' },
		...overrides,
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
describe('BackgroundController', () => {
	let res: Response;
	let next: NextFunction;

	beforeEach(() => {
		vi.clearAllMocks();
		res = createRes();
		next = vi.fn() as unknown as NextFunction;
	});

	// ---------------------------------------------------------------
	// updateBackground
	// ---------------------------------------------------------------
	describe('updateBackground', () => {
		it('updates the background and triggers a feature file update', async () => {
			mockedStoryService.updateBackground.mockResolvedValue(undefined);
			mockedFeatureFileService.updateFeatureFile.mockResolvedValue(undefined);

			const backgroundData = { name: 'Background', stepDefinitions: { when: [] } };
			const req = createReq({ params: { storyID: VALID_ID }, body: backgroundData });
			await controller.updateBackground(req, res, next);

			expect(mockedStoryService.updateBackground).toHaveBeenCalledWith(VALID_ID, backgroundData);
			// Feature file update must be triggered after the DB write
			expect(mockedFeatureFileService.updateFeatureFile).toHaveBeenCalledWith(VALID_ID);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(backgroundData);
			expect(next).not.toHaveBeenCalled();
		});

		it('returns 400 for an invalid story ID', async () => {
			const req = createReq({ params: { storyID: INVALID_ID } });
			await controller.updateBackground(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 400, message: 'Invalid or missing story ID' })
			);
			expect(res.status).not.toHaveBeenCalled();
		});

		it('forwards story service errors to next()', async () => {
			const serviceError = new Error('DB write failed');
			mockedStoryService.updateBackground.mockRejectedValue(serviceError);

			const req = createReq({ params: { storyID: VALID_ID }, body: {} });
			await controller.updateBackground(req, res, next);

			expect(next).toHaveBeenCalledWith(serviceError);
			// Feature file update should NOT be called when the DB write fails
			expect(mockedFeatureFileService.updateFeatureFile).not.toHaveBeenCalled();
			expect(res.status).not.toHaveBeenCalled();
		});

		it('forwards feature file service errors to next()', async () => {
			mockedStoryService.updateBackground.mockResolvedValue(undefined);
			const featureError = new Error('Feature file write failed');
			mockedFeatureFileService.updateFeatureFile.mockRejectedValue(featureError);

			const req = createReq({ params: { storyID: VALID_ID }, body: {} });
			await controller.updateBackground(req, res, next);

			// Story service succeeds, but feature file update fails
			expect(mockedStoryService.updateBackground).toHaveBeenCalled();
			expect(next).toHaveBeenCalledWith(featureError);
			expect(res.status).not.toHaveBeenCalled();
		});
	});

	// ---------------------------------------------------------------
	// deleteBackground
	// ---------------------------------------------------------------
	describe('deleteBackground', () => {
		it('deletes the background and triggers a feature file update', async () => {
			mockedStoryService.deleteBackground.mockResolvedValue(undefined);
			mockedFeatureFileService.updateFeatureFile.mockResolvedValue(undefined);

			const req = createReq({ params: { storyID: VALID_ID } });
			await controller.deleteBackground(req, res, next);

			expect(mockedStoryService.deleteBackground).toHaveBeenCalledWith(VALID_ID);
			// Feature file update must be triggered after the DB delete
			expect(mockedFeatureFileService.updateFeatureFile).toHaveBeenCalledWith(VALID_ID);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({});
			expect(next).not.toHaveBeenCalled();
		});

		it('returns 400 for an invalid story ID', async () => {
			const req = createReq({ params: { storyID: INVALID_ID } });
			await controller.deleteBackground(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 400, message: 'Invalid or missing story ID' })
			);
			expect(res.status).not.toHaveBeenCalled();
		});

		it('forwards story service errors to next()', async () => {
			const serviceError = new Error('DB delete failed');
			mockedStoryService.deleteBackground.mockRejectedValue(serviceError);

			const req = createReq({ params: { storyID: VALID_ID } });
			await controller.deleteBackground(req, res, next);

			expect(next).toHaveBeenCalledWith(serviceError);
			// Feature file update should NOT be called when the DB delete fails
			expect(mockedFeatureFileService.updateFeatureFile).not.toHaveBeenCalled();
			expect(res.status).not.toHaveBeenCalled();
		});

		it('forwards feature file service errors to next()', async () => {
			mockedStoryService.deleteBackground.mockResolvedValue(undefined);
			const featureError = new Error('Feature file write failed');
			mockedFeatureFileService.updateFeatureFile.mockRejectedValue(featureError);

			const req = createReq({ params: { storyID: VALID_ID } });
			await controller.deleteBackground(req, res, next);

			// Story service succeeds, but feature file update fails
			expect(mockedStoryService.deleteBackground).toHaveBeenCalled();
			expect(next).toHaveBeenCalledWith(featureError);
			expect(res.status).not.toHaveBeenCalled();
		});
	});
});
