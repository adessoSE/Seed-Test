// src/controllers/github.controller.spec.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { type Request, type Response, type NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { AppError } from '../helpers/AppError.js';

// --- Mock setup (vi.hoisted ensures availability during vi.mock hoisting) ---
const {
	mockedUserService,
	mockedLogger
} = vi.hoisted(() => ({
	mockedUserService: {
		disconnectGithub: vi.fn()
	},
	mockedLogger: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn()
	}
}));

vi.mock('../services/user.service', () => mockedUserService);
vi.mock('../logging', () => ({ logger: mockedLogger }));

// Import the module under test after mocks are registered
import * as controller from './github.controller.js';

// --- Test constants ---
const VALID_ID = '507f1f77bcf86cd799439011';
const FAKE_TOKEN = 'ghp_testtoken123456';

// --- Test helpers ---

/** Creates a minimal Express Request with sensible defaults and optional overrides. */
function createReq(overrides: Record<string, any> = {}): Request {
	return {
		body: {},
		params: {},
		query: {},
		user: {
			_id: new ObjectId(VALID_ID),
			email: 'test@seed.de'
		},
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

/**
 * Builds a mock fetch Response with configurable ok, status, and body.
 */
function mockFetchResponse(overrides: {
	ok?: boolean;
	status?: number;
	jsonBody?: any;
} = {}): globalThis.Response {
	const { ok = true, status = 200, jsonBody = {} } = overrides;
	return {
		ok,
		status,
		json: vi.fn().mockResolvedValue(jsonBody),
		text: vi.fn().mockResolvedValue(JSON.stringify(jsonBody))
	} as unknown as globalThis.Response;
}

// --- Test Suite ---
describe('GithubController', () => {
	let res: Response;
	let next: NextFunction;

	beforeEach(() => {
		vi.clearAllMocks();
		res = createRes();
		next = vi.fn();
		// Stub global fetch for controllers that call the GitHub API
		vi.stubGlobal('fetch', vi.fn());
		// Provide a valid token for submitIssue tests
		process.env.TESTACCOUNT_TOKEN = FAKE_TOKEN;
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		delete process.env.TESTACCOUNT_TOKEN;
	});

	// ---------------------------------------------------------------
	// submitIssue
	// ---------------------------------------------------------------
	describe('submitIssue', () => {
		it('submits an issue to GitHub and returns 200 on success', async () => {
			const ghResponse = { id: 42, number: 7, title: 'Bug report' };
			vi.mocked(fetch).mockResolvedValue(mockFetchResponse({ jsonBody: ghResponse }));

			const req = createReq({
				body: {
					title: '  Bug report  ',
					body: 'Steps to reproduce',
					assignees: ['dev1'],
					labels: ['bug'],
					milestone: 3
				}
			});
			await controller.submitIssue(req, res, next);

			// Verify fetch was called with the sanitized payload and correct headers
			const fetchCall = vi.mocked(fetch).mock.calls[0];
			expect(fetchCall[0]).toBe('https://api.github.com/repos/adessoAG/Seed-Test/issues');
			const sentPayload = JSON.parse(fetchCall[1]!.body as string);
			expect(sentPayload.title).toBe('Bug report'); // trimmed
			expect(sentPayload.body).toBe('Steps to reproduce');
			expect(sentPayload.assignees).toEqual(['dev1']);
			expect(sentPayload.labels).toEqual(['bug']);
			expect(sentPayload.milestone).toBe(3);

			// Authorization header should contain the token
			expect(fetchCall[1]!.headers).toEqual(
				expect.objectContaining({ 'Authorization': `token ${FAKE_TOKEN}` })
			);

			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(ghResponse);
			expect(next).not.toHaveBeenCalled();
		});

		it('sanitizes payload — only whitelisted fields are sent', async () => {
			vi.mocked(fetch).mockResolvedValue(mockFetchResponse({ jsonBody: { id: 1 } }));

			// Include an unknown field that should be stripped by the allowlist
			const req = createReq({
				body: {
					title: 'Valid title',
					maliciousField: 'should be stripped',
					assignees: ['dev1', 42] // non-string element should be filtered
				}
			});
			await controller.submitIssue(req, res, next);

			const sentPayload = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
			expect(sentPayload).not.toHaveProperty('maliciousField');
			// Non-string assignees should be filtered out
			expect(sentPayload.assignees).toEqual(['dev1']);
		});

		it('omits optional fields when not provided', async () => {
			vi.mocked(fetch).mockResolvedValue(mockFetchResponse({ jsonBody: { id: 1 } }));

			const req = createReq({ body: { title: 'Minimal issue' } });
			await controller.submitIssue(req, res, next);

			const sentPayload = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
			expect(sentPayload).toEqual({ title: 'Minimal issue' });
			expect(sentPayload).not.toHaveProperty('body');
			expect(sentPayload).not.toHaveProperty('assignees');
			expect(sentPayload).not.toHaveProperty('labels');
			expect(sentPayload).not.toHaveProperty('milestone');
		});

		it('calls next with 400 when title is missing', async () => {
			const req = createReq({ body: { body: 'No title here' } });
			await controller.submitIssue(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 400, message: 'Missing or invalid issue title' })
			);
			expect(fetch).not.toHaveBeenCalled();
		});

		it('calls next with 500 when TESTACCOUNT_TOKEN is not set', async () => {
			delete process.env.TESTACCOUNT_TOKEN;

			const req = createReq({ body: { title: 'Issue' } });
			await controller.submitIssue(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			const error = next.mock.calls[0][0];
			expect(error).toBeInstanceOf(AppError);
			expect((error as AppError).statusCode).toBe(500);
			expect(fetch).not.toHaveBeenCalled();
		});

		it('forwards GitHub error status when API returns non-ok response', async () => {
			const errorData = { message: 'Validation Failed' };
			vi.mocked(fetch).mockResolvedValue(mockFetchResponse({
				ok: false,
				status: 422,
				jsonBody: errorData
			}));

			const req = createReq({ body: { title: 'Bad issue' } });
			await controller.submitIssue(req, res, next);

			// Controller forwards GitHub's status code directly to the client
			expect(res.status).toHaveBeenCalledWith(422);
			expect(res.json).toHaveBeenCalledWith(errorData);
			expect(next).not.toHaveBeenCalled();
		});
	});

	// ---------------------------------------------------------------
	// disconnectGithub
	// ---------------------------------------------------------------
	describe('disconnectGithub', () => {
		it('disconnects GitHub and returns 200 when no session github property', async () => {
			mockedUserService.disconnectGithub.mockResolvedValue({ modifiedCount: 1 });

			// User without github property — takes the else branch (no session save)
			const req = createReq({
				user: { _id: new ObjectId(VALID_ID), email: 'test@seed.de' },
				session: { save: vi.fn() }
			});
			await controller.disconnectGithub(req, res, next);

			expect(mockedUserService.disconnectGithub).toHaveBeenCalledWith(new ObjectId(VALID_ID));
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({ message: 'GitHub account disconnected successfully.' });
			expect(next).not.toHaveBeenCalled();
		});

		it('saves session after removing github property and returns 200', async () => {
			mockedUserService.disconnectGithub.mockResolvedValue({ modifiedCount: 1 });

			// User with github property — triggers session save branch
			const saveMock = vi.fn((cb: (err: any) => void) => cb(null));
			const req = createReq({
				user: {
					_id: new ObjectId(VALID_ID),
					email: 'test@seed.de',
					github: { login: 'ghuser', id: 42 }
				},
				session: { save: saveMock }
			});
			await controller.disconnectGithub(req, res, next);

			expect(mockedUserService.disconnectGithub).toHaveBeenCalledWith(new ObjectId(VALID_ID));
			expect(saveMock).toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({ message: 'GitHub account disconnected successfully.' });
		});

		it('calls next when session save fails', async () => {
			mockedUserService.disconnectGithub.mockResolvedValue({ modifiedCount: 1 });
			const saveError = new Error('Session save failed');
			const saveMock = vi.fn((cb: (err: any) => void) => cb(saveError));

			const req = createReq({
				user: {
					_id: new ObjectId(VALID_ID),
					email: 'test@seed.de',
					github: { login: 'ghuser', id: 42 }
				},
				session: { save: saveMock }
			});
			await controller.disconnectGithub(req, res, next);

			expect(next).toHaveBeenCalledWith(saveError);
			expect(res.status).not.toHaveBeenCalled();
		});

		it('calls next with 401 when user is not authenticated', async () => {
			const req = createReq({ user: null });
			await controller.disconnectGithub(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			const error = next.mock.calls[0][0];
			expect(error).toBeInstanceOf(AppError);
			expect((error as AppError).statusCode).toBe(401);
		});

		it('forwards service errors to next()', async () => {
			const serviceError = new Error('DB failure');
			mockedUserService.disconnectGithub.mockRejectedValue(serviceError);

			const req = createReq();
			await controller.disconnectGithub(req, res, next);

			expect(next).toHaveBeenCalledWith(serviceError);
		});
	});
});
