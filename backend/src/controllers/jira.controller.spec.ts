// src/controllers/jira.controller.spec.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { type Request, type Response, type NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { AppError } from '../helpers/AppError.js';

// --- Mock setup (vi.hoisted ensures availability during vi.mock hoisting) ---
const {
	mockedExternalAccountService,
	mockedLogger
} = vi.hoisted(() => ({
	mockedExternalAccountService: {
		buildAuthString: vi.fn(),
		updateJiraCredential: vi.fn(),
		disconnectJira: vi.fn(),
		jiraDecryptPassword: vi.fn()
	},
	mockedLogger: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn()
	}
}));

vi.mock('../services/externalAccount.service', () => mockedExternalAccountService);
vi.mock('../logging', () => ({ logger: mockedLogger }));

// Import the module under test after mocks are registered
import * as controller from './jira.controller.js';

// --- Test constants ---
const VALID_ID = '507f1f77bcf86cd799439011';
const VALID_HOST = 'mycompany.atlassian.net';

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
 * Builds a mock fetch Response with configurable ok, status, headers, and body.
 */
function mockFetchResponse(overrides: {
	ok?: boolean;
	status?: number;
	statusText?: string;
	headers?: Record<string, string | null>;
	jsonBody?: any;
	textBody?: string;
} = {}): globalThis.Response {
	const {
		ok = true,
		status = 200,
		statusText = 'OK',
		headers = {},
		jsonBody = {},
		textBody
	} = overrides;
	return {
		ok,
		status,
		statusText,
		headers: {
			get: vi.fn((name: string) => headers[name.toLowerCase()] ?? null)
		},
		json: vi.fn().mockResolvedValue(jsonBody),
		text: vi.fn().mockResolvedValue(textBody ?? JSON.stringify(jsonBody))
	} as unknown as globalThis.Response;
}

// --- Test Suite ---
describe('JiraController', () => {
	let res: Response;
	let next: NextFunction;

	beforeEach(() => {
		vi.clearAllMocks();
		res = createRes();
		next = vi.fn();
		// Stub global fetch for controllers that call external Jira APIs
		vi.stubGlobal('fetch', vi.fn());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	// ---------------------------------------------------------------
	// linkJiraCredentials
	// ---------------------------------------------------------------
	describe('linkJiraCredentials', () => {
		const validBody = {
			jiraAccountName: 'jiraUser',
			jiraPassword: 'jiraPass',
			jiraHost: VALID_HOST,
			jiraAuthMethod: 'bearer'
		};

		it('verifies credentials via Jira API and stores them on success', async () => {
			mockedExternalAccountService.buildAuthString.mockReturnValue('Bearer jiraPass');
			vi.mocked(fetch).mockResolvedValue(mockFetchResponse());
			mockedExternalAccountService.updateJiraCredential.mockResolvedValue(undefined);

			const req = createReq({ body: { ...validBody } });
			await controller.linkJiraCredentials(req, res, next);

			// Should call Jira session endpoint for verification
			expect(fetch).toHaveBeenCalledWith(
				`https://${VALID_HOST}/rest/auth/1/session`,
				expect.objectContaining({ method: 'GET' })
			);
			expect(mockedExternalAccountService.updateJiraCredential).toHaveBeenCalledWith(
				VALID_ID, 'jiraUser', 'jiraPass', VALID_HOST, 'bearer'
			);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({ message: 'Jira credentials updated successfully.' });
		});

		it('defaults jiraAuthMethod to "bearer" when not provided', async () => {
			mockedExternalAccountService.buildAuthString.mockReturnValue('Bearer tok');
			vi.mocked(fetch).mockResolvedValue(mockFetchResponse());
			mockedExternalAccountService.updateJiraCredential.mockResolvedValue(undefined);

			const bodyWithoutMethod = { jiraAccountName: 'user', jiraPassword: 'pass', jiraHost: VALID_HOST };
			const req = createReq({ body: bodyWithoutMethod });
			await controller.linkJiraCredentials(req, res, next);

			expect(mockedExternalAccountService.updateJiraCredential).toHaveBeenCalledWith(
				VALID_ID, 'user', 'pass', VALID_HOST, 'bearer'
			);
		});

		// The bearer tab has no account-name field, so a token-only body must pass validation without jiraAccountName.
		it('accepts bearer without jiraAccountName and stores an empty account name', async () => {
			mockedExternalAccountService.buildAuthString.mockReturnValue('Bearer tok');
			vi.mocked(fetch).mockResolvedValue(mockFetchResponse());
			mockedExternalAccountService.updateJiraCredential.mockResolvedValue(undefined);

			const req = createReq({ body: { jiraPassword: 'tok', jiraHost: VALID_HOST, jiraAuthMethod: 'bearer' } });
			await controller.linkJiraCredentials(req, res, next);

			expect(next).not.toHaveBeenCalled();
			expect(mockedExternalAccountService.updateJiraCredential).toHaveBeenCalledWith(
				VALID_ID, '', 'tok', VALID_HOST, 'bearer'
			);
			expect(res.status).toHaveBeenCalledWith(200);
		});

		it('calls next when user is not authenticated', async () => {
			const req = createReq({ body: { ...validBody }, user: null });
			await controller.linkJiraCredentials(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			const error = next.mock.calls[0][0];
			expect(error).toBeInstanceOf(AppError);
			expect((error as AppError).statusCode).toBe(401);
		});

		it('calls next when required credentials are missing', async () => {
			// Missing jiraPassword
			const req = createReq({
				body: { jiraAccountName: 'user', jiraHost: VALID_HOST }
			});
			await controller.linkJiraCredentials(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			const error = next.mock.calls[0][0];
			expect(error).toBeInstanceOf(AppError);
			expect((error as AppError).statusCode).toBe(400);
		});

		it('rejects invalid host via requireSafeExternalHost (SSRF protection)', async () => {
			const req = createReq({
				body: { ...validBody, jiraHost: 'localhost' }
			});
			await controller.linkJiraCredentials(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			const error = next.mock.calls[0][0];
			expect(error).toBeInstanceOf(AppError);
			expect((error as AppError).statusCode).toBe(400);
			expect(fetch).not.toHaveBeenCalled();
		});

		it('calls next when Jira API returns a non-ok response', async () => {
			mockedExternalAccountService.buildAuthString.mockReturnValue('Bearer bad');
			vi.mocked(fetch).mockResolvedValue(mockFetchResponse({
				ok: false,
				status: 401,
				statusText: 'Unauthorized'
			}));

			const req = createReq({ body: { ...validBody } });
			await controller.linkJiraCredentials(req, res, next);

			// The catch block converts verification failure to a specific error
			expect(next).toHaveBeenCalledTimes(1);
			expect(mockedExternalAccountService.updateJiraCredential).not.toHaveBeenCalled();
		});
	});

	// ---------------------------------------------------------------
	// disconnectJira
	// ---------------------------------------------------------------
	describe('disconnectJira', () => {
		it('disconnects Jira and returns 200', async () => {
			mockedExternalAccountService.disconnectJira.mockResolvedValue(undefined);

			const req = createReq();
			await controller.disconnectJira(req, res, next);

			expect(mockedExternalAccountService.disconnectJira).toHaveBeenCalledWith(VALID_ID);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({ message: 'Jira account disconnected successfully.' });
			expect(next).not.toHaveBeenCalled();
		});

		it('calls next with 401 when user is not authenticated', async () => {
			const req = createReq({ user: null });
			await controller.disconnectJira(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			const error = next.mock.calls[0][0];
			expect(error).toBeInstanceOf(AppError);
			expect((error as AppError).statusCode).toBe(401);
		});

		it('forwards service errors to next()', async () => {
			const serviceError = new Error('DB failure');
			mockedExternalAccountService.disconnectJira.mockRejectedValue(serviceError);

			const req = createReq();
			await controller.disconnectJira(req, res, next);

			expect(next).toHaveBeenCalledWith(serviceError);
		});
	});

	// ---------------------------------------------------------------
	// jiraLogin
	// ---------------------------------------------------------------
	describe('jiraLogin', () => {
		const validLoginBody = {
			jiraAccountName: 'user',
			jiraPassword: 'pass',
			jiraServer: VALID_HOST,
			AuthMethod: 'basic'
		};

		it('returns session cookie on successful login', async () => {
			mockedExternalAccountService.buildAuthString.mockReturnValue('Basic dXNlcjpwYXNz');
			vi.mocked(fetch).mockResolvedValue(mockFetchResponse({
				headers: { 'set-cookie': 'JSESSIONID=abc123; Path=/' }
			}));

			const req = createReq({ body: { ...validLoginBody } });
			await controller.jiraLogin(req, res, next);

			expect(fetch).toHaveBeenCalledWith(
				`https://${VALID_HOST}/rest/auth/1/session`,
				expect.objectContaining({ method: 'GET' })
			);
			expect(res.status).toHaveBeenCalledWith(200);
			// Cookie is split at ';' — only the first segment is returned
			expect(res.json).toHaveBeenCalledWith({ sessionCookie: 'JSESSIONID=abc123' });
			expect(next).not.toHaveBeenCalled();
		});

		it('returns success message when no cookie is set (API token auth)', async () => {
			mockedExternalAccountService.buildAuthString.mockReturnValue('Bearer tok');
			vi.mocked(fetch).mockResolvedValue(mockFetchResponse({
				headers: { 'set-cookie': null }
			}));

			const req = createReq({ body: { ...validLoginBody } });
			await controller.jiraLogin(req, res, next);

			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({
				message: 'Authentication successful, but no session cookie set.'
			});
		});

		it('calls next with 400 when required fields are missing', async () => {
			// Missing jiraServer
			const req = createReq({
				body: { jiraAccountName: 'user', jiraPassword: 'pass' }
			});
			await controller.jiraLogin(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 400 })
			);
		});

		it('rejects SSRF-unsafe host via requireSafeExternalHost', async () => {
			const req = createReq({
				body: { ...validLoginBody, jiraServer: '192.168.1.1' }
			});
			await controller.jiraLogin(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 400 })
			);
			expect(fetch).not.toHaveBeenCalled();
		});

		it('calls next with 401 when Jira returns non-ok response', async () => {
			mockedExternalAccountService.buildAuthString.mockReturnValue('Basic bad');
			vi.mocked(fetch).mockResolvedValue(mockFetchResponse({
				ok: false,
				status: 401,
				statusText: 'Unauthorized'
			}));

			const req = createReq({ body: { ...validLoginBody } });
			await controller.jiraLogin(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 401 })
			);
		});
	});

	// ---------------------------------------------------------------
	// updateXrayStatus
	// ---------------------------------------------------------------
	describe('updateXrayStatus', () => {
		const jiraUser = {
			_id: new ObjectId(VALID_ID),
			email: 'test@seed.de',
			jira: {
				AccountName: 'jiraUser',
				Password: 'encryptedPass',
				Password_Nonce: 'nonce123',
				Password_Tag: 'tag456',
				AuthMethod: 'bearer',
				Host: VALID_HOST
			}
		};

		it('updates Xray step status and returns response data', async () => {
			mockedExternalAccountService.jiraDecryptPassword.mockReturnValue('clearPass');
			mockedExternalAccountService.buildAuthString.mockReturnValue('Bearer clearPass');
			vi.mocked(fetch).mockResolvedValue(mockFetchResponse({
				status: 200,
				headers: { 'content-type': 'application/json' },
				textBody: JSON.stringify({ result: 'ok' })
			}));

			const req = createReq({
				user: jiraUser,
				body: { testRunId: '100', stepId: '5', status: 'PASS' }
			});
			await controller.updateXrayStatus(req, res, next);

			expect(mockedExternalAccountService.jiraDecryptPassword).toHaveBeenCalledWith(
				'encryptedPass', 'nonce123', 'tag456'
			);
			// URL should include status as a query parameter
			const fetchCall = vi.mocked(fetch).mock.calls[0];
			expect(fetchCall[0]).toContain('/rest/raven/1.0/api/testrun/100/step/5/status');
			expect(fetchCall[0]).toContain('status=PASS');
			expect(fetchCall[1]).toEqual(expect.objectContaining({ method: 'PUT' }));
			expect(res.status).toHaveBeenCalledWith(200);
			expect(next).not.toHaveBeenCalled();
		});

		it('calls next with 401 when user has no linked Jira account', async () => {
			const req = createReq({
				user: { _id: new ObjectId(VALID_ID), email: 'test@seed.de' },
				body: { testRunId: '100', stepId: '5', status: 'PASS' }
			});
			await controller.updateXrayStatus(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 401 })
			);
		});

		it('calls next with 400 when required body fields are missing', async () => {
			// Missing stepId
			const req = createReq({
				user: jiraUser,
				body: { testRunId: '100', status: 'FAIL' }
			});

			mockedExternalAccountService.jiraDecryptPassword.mockReturnValue('clearPass');
			mockedExternalAccountService.buildAuthString.mockReturnValue('Bearer clearPass');

			await controller.updateXrayStatus(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 400, message: 'Missing testRunId, stepId, or status' })
			);
			expect(fetch).not.toHaveBeenCalled();
		});

		it('calls next with 502 when Xray API returns non-ok response', async () => {
			mockedExternalAccountService.jiraDecryptPassword.mockReturnValue('clearPass');
			mockedExternalAccountService.buildAuthString.mockReturnValue('Bearer clearPass');
			vi.mocked(fetch).mockResolvedValue(mockFetchResponse({
				ok: false,
				status: 500,
				textBody: 'Internal Server Error'
			}));

			const req = createReq({
				user: jiraUser,
				body: { testRunId: '100', stepId: '5', status: 'PASS' }
			});
			await controller.updateXrayStatus(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 502 })
			);
		});
	});
});
