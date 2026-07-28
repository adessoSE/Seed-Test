// src/controllers/block.controller.spec.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { type Request, type Response, type NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { AppError } from '../helpers/AppError.js';

// --- Mock setup (vi.hoisted ensures availability during vi.mock hoisting) ---
const {
	mockedBlockService,
	mockedLogger
} = vi.hoisted(() => ({
	mockedBlockService: {
		saveBlock: vi.fn(),
		getBlocks: vi.fn(),
		updateBlock: vi.fn(),
		deleteBlock: vi.fn()
	},
	mockedLogger: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn()
	}
}));

vi.mock('../services/block.service', () => mockedBlockService);
vi.mock('../logging', () => ({ logger: mockedLogger }));

// Import the module under test after mocks are registered
import * as controller from './block.controller.js';

// --- Test constants ---
const VALID_ID = '507f1f77bcf86cd799439011';
const VALID_ID_2 = '507f1f77bcf86cd799439012';
const INVALID_ID = 'invalid';

// --- Test helpers ---

/** Creates a minimal Express Request with sensible defaults and optional overrides. */
function createReq(overrides: Record<string, any> = {}): Request {
	return {
		body: {},
		params: {},
		query: {},
		user: { _id: new ObjectId(VALID_ID), email: 'test@seed.de' },
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
describe('BlockController', () => {
	let res: Response;
	let next: NextFunction;

	beforeEach(() => {
		vi.clearAllMocks();
		res = createRes();
		next = vi.fn();
	});

	// ---------------------------------------------------------------
	// saveBlock
	// ---------------------------------------------------------------
	describe('saveBlock', () => {
		it('creates a block and returns the inserted ID', async () => {
			const insertedId = new ObjectId(VALID_ID_2);
			mockedBlockService.saveBlock.mockResolvedValue({ insertedId });

			const req = createReq({ body: { name: 'Login Steps' } });
			await controller.saveBlock(req, res, next);

			expect(mockedBlockService.saveBlock).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'Login Steps' })
			);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({ insertedId });
			expect(next).not.toHaveBeenCalled();
		});

		it('sets the block owner to the authenticated user ID', async () => {
			mockedBlockService.saveBlock.mockResolvedValue({ insertedId: new ObjectId() });

			const userId = new ObjectId(VALID_ID);
			const req = createReq({ body: { name: 'Block' }, user: { _id: userId } });
			await controller.saveBlock(req, res, next);

			// The controller converts user._id to an ObjectId and assigns it as owner
			const savedBlock = mockedBlockService.saveBlock.mock.calls[0][0];
			expect(savedBlock.owner).toBeInstanceOf(ObjectId);
		});

		it('returns 401 when user is not authenticated', async () => {
			const req = createReq({ user: {} });
			await controller.saveBlock(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 401, message: 'User not authenticated' })
			);
			expect(res.status).not.toHaveBeenCalled();
		});

		it('forwards service errors to next()', async () => {
			const serviceError = new Error('DB write failed');
			mockedBlockService.saveBlock.mockRejectedValue(serviceError);

			const req = createReq({ body: { name: 'Block' } });
			await controller.saveBlock(req, res, next);

			expect(next).toHaveBeenCalledWith(serviceError);
			expect(res.status).not.toHaveBeenCalled();
		});
	});

	// ---------------------------------------------------------------
	// getBlocks
	// ---------------------------------------------------------------
	describe('getBlocks', () => {
		it('returns blocks for a valid repository ID', async () => {
			const blocks = [{ _id: VALID_ID_2, name: 'Login Steps' }];
			mockedBlockService.getBlocks.mockResolvedValue(blocks);

			const req = createReq({ params: { repoId: VALID_ID } });
			await controller.getBlocks(req, res, next);

			expect(mockedBlockService.getBlocks).toHaveBeenCalledWith(VALID_ID);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(blocks);
			expect(next).not.toHaveBeenCalled();
		});

		it('returns 400 for an invalid repository ID', async () => {
			const req = createReq({ params: { repoId: INVALID_ID } });
			await controller.getBlocks(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 400, message: 'Invalid or missing repository ID' })
			);
			expect(res.status).not.toHaveBeenCalled();
		});

		it('forwards service errors to next()', async () => {
			const serviceError = new Error('DB read failed');
			mockedBlockService.getBlocks.mockRejectedValue(serviceError);

			const req = createReq({ params: { repoId: VALID_ID } });
			await controller.getBlocks(req, res, next);

			expect(next).toHaveBeenCalledWith(serviceError);
			expect(res.status).not.toHaveBeenCalled();
		});
	});

	// ---------------------------------------------------------------
	// updateBlock
	// ---------------------------------------------------------------
	describe('updateBlock', () => {
		it('updates a block and returns the result', async () => {
			const updatedBlock = { _id: VALID_ID_2, name: 'Updated Block' };
			mockedBlockService.updateBlock.mockResolvedValue(updatedBlock);

			const req = createReq({
				params: { blockId: VALID_ID_2 },
				body: { name: 'Updated Block' }
			});
			await controller.updateBlock(req, res, next);

			expect(mockedBlockService.updateBlock).toHaveBeenCalledWith(
				VALID_ID_2,
				{ name: 'Updated Block' },
				VALID_ID // userId is user._id.toString()
			);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(updatedBlock);
			expect(next).not.toHaveBeenCalled();
		});

		it('returns 400 for an invalid block ID', async () => {
			const req = createReq({ params: { blockId: INVALID_ID } });
			await controller.updateBlock(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 400, message: 'Invalid or missing block ID' })
			);
			expect(res.status).not.toHaveBeenCalled();
		});

		it('returns 401 when user is not authenticated', async () => {
			const req = createReq({ params: { blockId: VALID_ID_2 }, user: {} });
			await controller.updateBlock(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 401, message: 'User not authenticated' })
			);
			expect(res.status).not.toHaveBeenCalled();
		});

		it('returns 404 when block is not found or user not authorized', async () => {
			// Service returns null — block not found or ownership mismatch
			mockedBlockService.updateBlock.mockResolvedValue(null);

			const req = createReq({
				params: { blockId: VALID_ID_2 },
				body: { name: 'Updated Block' }
			});
			await controller.updateBlock(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404, message: 'Block not found or user not authorized to update' })
			);
			expect(res.status).not.toHaveBeenCalled();
		});
	});

	// ---------------------------------------------------------------
	// deleteBlock
	// ---------------------------------------------------------------
	describe('deleteBlock', () => {
		it('deletes a block and returns success message', async () => {
			mockedBlockService.deleteBlock.mockResolvedValue({ deletedCount: 1 });

			const req = createReq({ params: { blockId: VALID_ID_2 } });
			await controller.deleteBlock(req, res, next);

			expect(mockedBlockService.deleteBlock).toHaveBeenCalledWith(VALID_ID_2, VALID_ID);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({ message: 'Block deleted successfully' });
			expect(next).not.toHaveBeenCalled();
		});

		it('returns 400 for an invalid block ID', async () => {
			const req = createReq({ params: { blockId: INVALID_ID } });
			await controller.deleteBlock(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 400, message: 'Invalid or missing block ID' })
			);
			expect(res.status).not.toHaveBeenCalled();
		});

		it('returns 401 when user is not authenticated', async () => {
			const req = createReq({ params: { blockId: VALID_ID_2 }, user: {} });
			await controller.deleteBlock(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 401, message: 'User not authenticated' })
			);
			expect(res.status).not.toHaveBeenCalled();
		});

		it('returns 404 when block is not found or user not authorized', async () => {
			// Service returns deletedCount 0 — block not found or ownership mismatch
			mockedBlockService.deleteBlock.mockResolvedValue({ deletedCount: 0 });

			const req = createReq({ params: { blockId: VALID_ID_2 } });
			await controller.deleteBlock(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404, message: 'Block not found or user not authorized to delete' })
			);
			expect(res.status).not.toHaveBeenCalled();
		});
	});
});
