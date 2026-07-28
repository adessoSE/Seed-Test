// src/controllers/workgroup.controller.spec.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { AppError } from '../helpers/AppError.js';

// --- Mock setup (vi.hoisted ensures availability during vi.mock hoisting) ---
const {
	mockedWorkgroupService,
	mockedUserService,
	mockedLogger,
} = vi.hoisted(() => ({
	mockedWorkgroupService: {
		getMembers: vi.fn(),
		addMember: vi.fn(),
		updateMemberStatus: vi.fn(),
		removeFromWorkgroup: vi.fn(),
	},
	mockedUserService: {
		getUserByEmail: vi.fn(),
	},
	mockedLogger: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
	},
}));

vi.mock('../services/workgroup.service', () => mockedWorkgroupService);
vi.mock('../services/user.service', () => mockedUserService);
vi.mock('../logging', () => ({ logger: mockedLogger }));

// Import the module under test after mocks are registered
import * as controller from './workgroup.controller.js';

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
		user: {
			_id: new ObjectId(VALID_ID),
			email: 'test@seed.de',
		},
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
describe('WorkgroupController', () => {
	let res: Response;
	let next: NextFunction;

	beforeEach(() => {
		vi.clearAllMocks();
		res = createRes();
		next = vi.fn() as unknown as NextFunction;
	});

	// ---------------------------------------------------------------
	// getMembers
	// ---------------------------------------------------------------
	describe('getMembers', () => {
		it('returns members for a valid repository ID', async () => {
			const members = {
				owner: { email: 'owner@seed.de', canEdit: true },
				member: [{ email: 'member@seed.de', canEdit: false }],
			};
			mockedWorkgroupService.getMembers.mockResolvedValue(members);

			const req = createReq({ params: { id: VALID_ID } });
			await controller.getMembers(req, res, next);

			expect(mockedWorkgroupService.getMembers).toHaveBeenCalledWith(VALID_ID);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(members);
			expect(next).not.toHaveBeenCalled();
		});

		it('returns 400 for an invalid repository ID', async () => {
			const req = createReq({ params: { id: INVALID_ID } });
			await controller.getMembers(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 400 })
			);
			expect(res.status).not.toHaveBeenCalled();
		});

		it('returns 400 when repository ID is missing', async () => {
			const req = createReq({ params: {} });
			await controller.getMembers(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 400 })
			);
			expect(res.status).not.toHaveBeenCalled();
		});

		it('forwards service errors to next()', async () => {
			const serviceError = new Error('DB connection failed');
			mockedWorkgroupService.getMembers.mockRejectedValue(serviceError);

			const req = createReq({ params: { id: VALID_ID } });
			await controller.getMembers(req, res, next);

			expect(next).toHaveBeenCalledWith(serviceError);
			expect(res.status).not.toHaveBeenCalled();
		});
	});

	// ---------------------------------------------------------------
	// addMember
	// ---------------------------------------------------------------
	describe('addMember', () => {
		it('adds a member successfully and returns 200', async () => {
			const existingUser = { _id: new ObjectId(), email: 'new@seed.de' };
			const members = {
				owner: { email: 'owner@seed.de', canEdit: true },
				member: [],
			};
			const addResult = { modifiedCount: 1 };

			mockedUserService.getUserByEmail.mockResolvedValue(existingUser);
			mockedWorkgroupService.getMembers.mockResolvedValue(members);
			mockedWorkgroupService.addMember.mockResolvedValue(addResult);

			const req = createReq({
				params: { id: VALID_ID },
				body: { email: 'New@Seed.de', canEdit: true },
			});
			await controller.addMember(req, res, next);

			// Email should be lowercased before service calls
			expect(mockedUserService.getUserByEmail).toHaveBeenCalledWith('new@seed.de');
			expect(mockedWorkgroupService.addMember).toHaveBeenCalledWith(
				VALID_ID,
				{ email: 'new@seed.de', canEdit: true }
			);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(addResult);
		});

		it('returns 400 for an invalid repository ID', async () => {
			const req = createReq({
				params: { id: INVALID_ID },
				body: { email: 'new@seed.de', canEdit: false },
			});
			await controller.addMember(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 400 })
			);
			expect(mockedUserService.getUserByEmail).not.toHaveBeenCalled();
		});

		it('returns 404 when the user to add does not exist', async () => {
			mockedUserService.getUserByEmail.mockResolvedValue(null);

			const req = createReq({
				params: { id: VALID_ID },
				body: { email: 'nobody@seed.de', canEdit: false },
			});
			await controller.addMember(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404, message: 'No user found with this email' })
			);
			expect(res.status).not.toHaveBeenCalled();
		});

		it('returns 400 when trying to add the repository owner as a member', async () => {
			const owner = { _id: new ObjectId(), email: 'owner@seed.de' };
			const members = {
				owner: { email: 'owner@seed.de', canEdit: true },
				member: [],
			};

			mockedUserService.getUserByEmail.mockResolvedValue(owner);
			mockedWorkgroupService.getMembers.mockResolvedValue(members);

			const req = createReq({
				params: { id: VALID_ID },
				body: { email: 'owner@seed.de', canEdit: true },
			});
			await controller.addMember(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 400, message: 'Cannot add the repository owner as a member' })
			);
			expect(mockedWorkgroupService.addMember).not.toHaveBeenCalled();
		});

		it('defaults canEdit to false when not provided', async () => {
			const existingUser = { _id: new ObjectId(), email: 'new@seed.de' };
			const members = {
				owner: { email: 'owner@seed.de', canEdit: true },
				member: [],
			};

			mockedUserService.getUserByEmail.mockResolvedValue(existingUser);
			mockedWorkgroupService.getMembers.mockResolvedValue(members);
			mockedWorkgroupService.addMember.mockResolvedValue({ modifiedCount: 1 });

			const req = createReq({
				params: { id: VALID_ID },
				body: { email: 'new@seed.de' },
			});
			await controller.addMember(req, res, next);

			// canEdit should default to false
			expect(mockedWorkgroupService.addMember).toHaveBeenCalledWith(
				VALID_ID,
				{ email: 'new@seed.de', canEdit: false }
			);
		});
	});

	// ---------------------------------------------------------------
	// updateMemberStatus
	// ---------------------------------------------------------------
	describe('updateMemberStatus', () => {
		it('updates member status and returns 200', async () => {
			const updateResult = { modifiedCount: 1 };
			mockedWorkgroupService.updateMemberStatus.mockResolvedValue(updateResult);

			const req = createReq({
				params: { id: VALID_ID },
				body: { email: 'Member@Seed.de', canEdit: true },
			});
			await controller.updateMemberStatus(req, res, next);

			// Email should be lowercased
			expect(mockedWorkgroupService.updateMemberStatus).toHaveBeenCalledWith(
				VALID_ID,
				{ email: 'member@seed.de', canEdit: true }
			);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(updateResult);
			expect(next).not.toHaveBeenCalled();
		});

		it('returns 400 for an invalid repository ID', async () => {
			const req = createReq({
				params: { id: INVALID_ID },
				body: { email: 'member@seed.de', canEdit: false },
			});
			await controller.updateMemberStatus(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 400 })
			);
			expect(res.status).not.toHaveBeenCalled();
		});

		it('forwards service errors to next()', async () => {
			const serviceError = new Error('Update failed');
			mockedWorkgroupService.updateMemberStatus.mockRejectedValue(serviceError);

			const req = createReq({
				params: { id: VALID_ID },
				body: { email: 'member@seed.de', canEdit: true },
			});
			await controller.updateMemberStatus(req, res, next);

			expect(next).toHaveBeenCalledWith(serviceError);
		});
	});

	// ---------------------------------------------------------------
	// removeMember
	// ---------------------------------------------------------------
	describe('removeMember', () => {
		it('removes a member using flat email and returns 200', async () => {
			const removeResult = { modifiedCount: 1 };
			mockedWorkgroupService.removeFromWorkgroup.mockResolvedValue(removeResult);

			const req = createReq({
				params: { id: VALID_ID },
				body: { email: 'Member@Seed.de' },
			});
			await controller.removeMember(req, res, next);

			// Email should be lowercased
			expect(mockedWorkgroupService.removeFromWorkgroup).toHaveBeenCalledWith(
				VALID_ID,
				{ email: 'member@seed.de' }
			);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(removeResult);
			expect(next).not.toHaveBeenCalled();
		});

		it('handles nested email object format from legacy frontend', async () => {
			const removeResult = { modifiedCount: 1 };
			mockedWorkgroupService.removeFromWorkgroup.mockResolvedValue(removeResult);

			// Legacy frontend sends { email: { email: 'addr' } }
			const req = createReq({
				params: { id: VALID_ID },
				body: { email: { email: 'Nested@Seed.de' } },
			});
			await controller.removeMember(req, res, next);

			expect(mockedWorkgroupService.removeFromWorkgroup).toHaveBeenCalledWith(
				VALID_ID,
				{ email: 'nested@seed.de' }
			);
			expect(res.status).toHaveBeenCalledWith(200);
		});

		it('returns 400 for an invalid repository ID', async () => {
			const req = createReq({
				params: { id: INVALID_ID },
				body: { email: 'member@seed.de' },
			});
			await controller.removeMember(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 400 })
			);
			expect(res.status).not.toHaveBeenCalled();
		});

		it('returns 400 when email is missing entirely', async () => {
			const req = createReq({
				params: { id: VALID_ID },
				body: {},
			});
			await controller.removeMember(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 400, message: 'Email of the member to remove is required.' })
			);
			expect(res.status).not.toHaveBeenCalled();
		});

		it('forwards service errors to next()', async () => {
			const serviceError = new Error('Remove failed');
			mockedWorkgroupService.removeFromWorkgroup.mockRejectedValue(serviceError);

			const req = createReq({
				params: { id: VALID_ID },
				body: { email: 'member@seed.de' },
			});
			await controller.removeMember(req, res, next);

			expect(next).toHaveBeenCalledWith(serviceError);
		});
	});
});
