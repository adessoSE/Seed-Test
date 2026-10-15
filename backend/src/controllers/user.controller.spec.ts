// src/controllers/user.controller.spec.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type * as NodeCrypto from 'node:crypto';
import { ObjectId } from 'mongodb';

// --- 1. Mock all external dependencies before importing the controller ---

vi.mock('../services/user.service', () => ({
	getResetRequestByEmail: vi.fn(),
	deleteRequest: vi.fn(),
	getUserByEmail: vi.fn(),
	createResetRequest: vi.fn(),
	getResetRequest: vi.fn(),
	registerUser: vi.fn(),
	updateUser: vi.fn(),
	deleteUser: vi.fn(),
	mergeGithub: vi.fn(),
	findOrRegisterGithub: vi.fn(),
	isResetRequestExpired: vi.fn(() => false),
	createMergeIntent: vi.fn(() => 'test-uuid-merge-token'),
	consumeMergeIntent: vi.fn(() => null),
	isGithubOnlyStub: vi.fn(() => false),
	attachCredentialsToGithubStub: vi.fn()
}));

// GitHub OAuth is configured for the callback tests; requireGithub is a no-op here
vi.mock('../config', () => ({
	validatedConfig: { value: { GITHUB_CLIENT_ID: 'test-client-id', GITHUB_CLIENT_SECRET: 'test-client-secret' } },
	requireGithub: vi.fn()
}));

vi.mock('../nodemailer', () => ({
	sendResetLink: vi.fn().mockResolvedValue(undefined)
}));

// No-op logger to suppress output during tests
vi.mock('../logging', () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn()
	}
}));

vi.mock('passport', () => ({
	default: {
		authenticate: vi.fn()
	}
}));

vi.mock('bcrypt', () => ({
	default: {
		hash: vi.fn().mockResolvedValue('hashed_password_mock'),
		compare: vi.fn().mockResolvedValue(true)
	}
}));

vi.mock('node:crypto', async (importOriginal) => ({
	// Keep the real timingSafeEqual (used by the OAuth state check); only randomUUID is pinned
	...(await importOriginal<typeof NodeCrypto>()),
	randomUUID: vi.fn().mockReturnValue('test-uuid-merge-token')
}));

vi.mock('../helpers/userSanitize', () => ({
	sanitizeUser: vi.fn((user: any) => {
		// Simulate allowlist — strip sensitive fields, keep safe ones
		const { password: _password, transitioned: _transitioned, ...safe } = user;
		if (safe.github) {
			const { githubToken: _githubToken, ...safeGithub } = safe.github;
			safe.github = safeGithub;
		}
		if (safe.jira) {
			const { Password: _Password, Password_Nonce: _Password_Nonce, Password_Tag: _Password_Tag, ...safeJira } = safe.jira;
			safe.jira = safeJira;
		}
		return safe;
	})
}));

// --- 2. Import modules after mocks are set up ---

import * as userController from './user.controller.js';
import * as userService from '../services/user.service.js';
import * as nodeMail from '../nodemailer.js';
import passport from 'passport';
import bcrypt from 'bcrypt';
import { AppError } from '../helpers/AppError.js';

// Identical body for existing and unknown emails — the anti-enumeration contract
const GENERIC_RESET_MESSAGE = 'If an account exists for this email, a reset link has been sent';
const RESET_TTL_MS = 24 * 60 * 60 * 1000;

// --- 3. Test helpers ---

/** Flush pending microtasks so async callbacks inside sync wrappers complete. */
const flushPromises = () => new Promise<void>(resolve => { setTimeout(resolve, 0); });

/**
 * Creates mock Express req/res/next objects for controller testing.
 * Includes session, logIn, and logout mocks needed by auth controllers.
 */
function mockReqResNext(overrides: {
	params?: Record<string, string>;
	body?: Record<string, unknown>;
	query?: Record<string, string>;
	user?: Record<string, any> | null;
} = {}) {
	const res = {
		status: vi.fn().mockReturnThis(),
		json: vi.fn().mockReturnThis(),
		send: vi.fn().mockReturnThis(),
		clearCookie: vi.fn().mockReturnThis()
	};
	const next = vi.fn();
	const req = {
		params: overrides.params ?? {},
		body: { ...(overrides.body ?? {}) },
		query: overrides.query ?? {},
		user: overrides.user !== undefined ? overrides.user : null,
		isAuthenticated: () => !!(overrides.user !== undefined ? overrides.user : null),
		session: {
			cookie: { maxAge: null },
			regenerate: vi.fn((cb: (err: any) => void) => cb(null))
		},
		logIn: vi.fn((_user: any, cb: (err: any) => void) => cb(null)),
		logout: vi.fn((cb: (err: any) => void) => cb(null))
	};
	return { req: req as any, res: res as any, next };
}

// --- 4. Test Suite ---

describe('UserController', () => {
	const fakeUserId = new ObjectId().toHexString();
	const fakeUser = {
		_id: fakeUserId,
		email: 'test@example.com',
		password: 'existing_hashed_pw',
		transitioned: true,
		github: { githubToken: 'gh-token', login: 'ghuser', id: 42 },
		jira: undefined
	};

	beforeEach(() => {
		vi.clearAllMocks();
		// Reset decision mocks to their defaults so one test's mockReturnValueOnce cannot leak into the next
		vi.mocked(userService.consumeMergeIntent).mockReset().mockReturnValue(null);
		vi.mocked(userService.isGithubOnlyStub).mockReset().mockReturnValue(false);
		vi.mocked(userService.isResetRequestExpired).mockReset().mockReturnValue(false);
	});

	// ========== forgotPassword ==========

	describe('forgotPassword', () => {
		it('should send a reset link when the user exists', async () => {
			vi.mocked(userService.getResetRequestByEmail).mockResolvedValue(null);
			vi.mocked(userService.getUserByEmail).mockResolvedValue({ ...fakeUser });
			vi.mocked(userService.createResetRequest).mockResolvedValue({ insertedId: new ObjectId() });

			const { req, res, next } = mockReqResNext({
				body: { email: 'Test@Example.com' }
			});

			await userController.forgotPassword(req, res, next);

			// Email should be lowercased before lookup
			expect(userService.getUserByEmail).toHaveBeenCalledWith('test@example.com');
			expect(userService.createResetRequest).toHaveBeenCalledWith(
				expect.objectContaining({ uuid: 'test-uuid-merge-token', email: fakeUser.email })
			);
			expect(nodeMail.sendResetLink).toHaveBeenCalledWith(fakeUser.email, 'test-uuid-merge-token');
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({ message: GENERIC_RESET_MESSAGE });
			expect(next).not.toHaveBeenCalled();
		});

		it('should delete an existing reset request before creating a new one', async () => {
			vi.mocked(userService.getResetRequestByEmail).mockResolvedValue({
				uuid: 'old-uuid',
				email: 'test@example.com'
			});
			vi.mocked(userService.deleteRequest).mockResolvedValue({ deletedCount: 1 });
			vi.mocked(userService.getUserByEmail).mockResolvedValue({ ...fakeUser });
			vi.mocked(userService.createResetRequest).mockResolvedValue({ insertedId: new ObjectId() });

			const { req, res, next } = mockReqResNext({ body: { email: 'test@example.com' } });

			await userController.forgotPassword(req, res, next);

			// Old request must be removed first
			expect(userService.deleteRequest).toHaveBeenCalledWith('test@example.com');
			expect(res.status).toHaveBeenCalledWith(200);
		});

		it('responds 200 with the same body for an unknown email and sends no mail (no account enumeration)', async () => {
			vi.mocked(userService.getResetRequestByEmail).mockResolvedValue(null);
			vi.mocked(userService.getUserByEmail).mockResolvedValue(null);

			const { req, res, next } = mockReqResNext({
				body: { email: 'nobody@example.com' }
			});

			await userController.forgotPassword(req, res, next);

			expect(next).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({ message: GENERIC_RESET_MESSAGE });
			expect(userService.createResetRequest).not.toHaveBeenCalled();
			expect(nodeMail.sendResetLink).not.toHaveBeenCalled();
		});
	});

	// ========== resetPassword ==========

	describe('resetPassword', () => {
		it('should reset the password with a valid UUID', async () => {
			const resetRequest = { uuid: 'valid-uuid', email: fakeUser.email, createdAt: new Date() };
			vi.mocked(userService.getResetRequest).mockResolvedValue(resetRequest);
			vi.mocked(userService.getUserByEmail).mockResolvedValue({ ...fakeUser });
			vi.mocked(userService.updateUser).mockResolvedValue({ modifiedCount: 1 });
			vi.mocked(userService.deleteRequest).mockResolvedValue({ deletedCount: 1 });

			const { req, res, next } = mockReqResNext({
				body: { uuid: 'valid-uuid', password: 'newSecurePassword' }
			});

			await userController.resetPassword(req, res, next);

			expect(bcrypt.hash).toHaveBeenCalledWith('newSecurePassword', 10);
			expect(userService.updateUser).toHaveBeenCalledWith(
				fakeUser._id,
				expect.objectContaining({ password: 'hashed_password_mock', transitioned: true })
			);
			// Reset request should be cleaned up after successful password change
			expect(userService.deleteRequest).toHaveBeenCalledWith(fakeUser.email);
			expect(res.status).toHaveBeenCalledWith(204);
			expect(res.send).toHaveBeenCalled();
			expect(next).not.toHaveBeenCalled();
		});

		it('should call next with 401 AppError for an invalid or expired UUID', async () => {
			vi.mocked(userService.getResetRequest).mockResolvedValue(null);

			const { req, res, next } = mockReqResNext({
				body: { uuid: 'expired-uuid', password: 'newPassword' }
			});

			await userController.resetPassword(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			const error = next.mock.calls[0][0];
			expect(error).toBeInstanceOf(AppError);
			expect(error.statusCode).toBe(401);
			expect(error.message).toBe('Invalid or expired reset token');
		});

		it('should call next with 404 AppError when the user behind the reset request is missing', async () => {
			vi.mocked(userService.getResetRequest).mockResolvedValue({
				uuid: 'valid-uuid',
				email: 'deleted@example.com',
				createdAt: new Date()
			});
			vi.mocked(userService.getUserByEmail).mockResolvedValue(null);

			const { req, res, next } = mockReqResNext({
				body: { uuid: 'valid-uuid', password: 'newPassword' }
			});

			await userController.resetPassword(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			const error = next.mock.calls[0][0];
			expect(error).toBeInstanceOf(AppError);
			expect(error.statusCode).toBe(404);
		});

		// The TTL decision itself is tested against real timestamps in user.service.spec.ts
		it('rejects and deletes a reset token the service reports as expired (expiry regression)', async () => {
			vi.mocked(userService.getResetRequest).mockResolvedValue({
				uuid: 'old-uuid',
				email: fakeUser.email,
				createdAt: new Date(Date.now() - RESET_TTL_MS - 60_000)
			});
			vi.mocked(userService.isResetRequestExpired).mockReturnValueOnce(true);

			const { req, res, next } = mockReqResNext({
				body: { uuid: 'old-uuid', password: 'newPassword' }
			});

			await userController.resetPassword(req, res, next);

			const error = next.mock.calls[0][0];
			expect(error.statusCode).toBe(401);
			expect(userService.deleteRequest).toHaveBeenCalledWith(fakeUser.email);
			expect(userService.updateUser).not.toHaveBeenCalled();
			expect(res.status).not.toHaveBeenCalled();
		});

		it('accepts a reset token the service reports as still valid', async () => {
			vi.mocked(userService.getResetRequest).mockResolvedValue({
				uuid: 'fresh-uuid',
				email: fakeUser.email,
				createdAt: new Date()
			});
			vi.mocked(userService.getUserByEmail).mockResolvedValue({ ...fakeUser });
			vi.mocked(userService.updateUser).mockResolvedValue({ modifiedCount: 1 });
			vi.mocked(userService.deleteRequest).mockResolvedValue({ deletedCount: 1 });

			const { req, res, next } = mockReqResNext({
				body: { uuid: 'fresh-uuid', password: 'newPassword' }
			});

			await userController.resetPassword(req, res, next);

			expect(userService.isResetRequestExpired).toHaveBeenCalledWith(expect.any(Date));
			expect(res.status).toHaveBeenCalledWith(204);
		});
	});

	// ========== login ==========

	describe('login', () => {
		/**
		 * Configures passport.authenticate mock to invoke its callback
		 * with the given (error, user, info) triple when the middleware runs.
		 */
		function stubPassport(error: any, user: any, info: any) {
			vi.mocked(passport.authenticate).mockImplementation(
				(_strategy: any, _opts: any, cb: any) => (_req: any, _res: any, _next: any) => {
					cb(error, user, info);
				}
			);
		}

		it('should authenticate and return sanitized user on successful login', () => {
			const loginUser = { ...fakeUser };
			stubPassport(null, loginUser, null);

			const { req, res, next } = mockReqResNext({
				body: { email: 'Test@Example.com', password: 'password123' }
			});

			userController.login(req, res, next);

			expect(req.body.email).toBe('test@example.com');
			expect(req.session.regenerate).toHaveBeenCalled();
			expect(req.logIn).toHaveBeenCalled();
			// Response should be sanitized — no password or githubToken
			expect(res.json).toHaveBeenCalledWith(
				expect.not.objectContaining({ password: expect.anything() })
			);
			expect(next).not.toHaveBeenCalled();
		});

		it('should call next with 401 AppError when passport reports no user (invalid credentials)', () => {
			stubPassport(null, false, { message: 'Invalid credentials' });

			const { req, res, next } = mockReqResNext({
				body: { email: 'test@example.com', password: 'wrong' }
			});

			userController.login(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			const error = next.mock.calls[0][0];
			expect(error).toBeInstanceOf(AppError);
			expect(error.statusCode).toBe(401);
			expect(error.message).toBe('Invalid credentials');
		});

		it('should call next when passport encounters an internal error', () => {
			const passportError = new Error('Strategy failure');
			stubPassport(passportError, null, null);

			const { req, res, next } = mockReqResNext({
				body: { email: 'test@example.com', password: 'x' }
			});

			userController.login(req, res, next);

			expect(next).toHaveBeenCalledWith(passportError);
		});

		it('should extend session cookie when stayLoggedIn is true (set after regeneration)', () => {
			stubPassport(null, { ...fakeUser }, null);

			const { req, res, next } = mockReqResNext({
				body: { email: 'test@example.com', password: 'p', stayLoggedIn: true }
			});

			userController.login(req, res, next);

			// stayLoggedIn cookie is set inside the regenerate callback
			expect(req.session.regenerate).toHaveBeenCalled();
			// 10 days in milliseconds
			expect(req.session.cookie.maxAge).toBe(864000000);
		});

		it('should rehash the password for legacy users (transitioned === false)', async () => {
			const legacyUser = { ...fakeUser, transitioned: false };
			stubPassport(null, legacyUser, null);
			vi.mocked(userService.updateUser).mockResolvedValue({ modifiedCount: 1 });

			const { req, res, next } = mockReqResNext({
				body: { email: 'test@example.com', password: 'legacyPw' }
			});

			userController.login(req, res, next);

			// The logIn callback is async — wait for hash + updateUser promises to settle
			await flushPromises();

			expect(bcrypt.hash).toHaveBeenCalledWith('legacyPw', 10);
			expect(userService.updateUser).toHaveBeenCalled();
			// After transition, sanitized user data should still be sent back
			expect(res.json).toHaveBeenCalled();
		});

		it('should call next when req.logIn fails', () => {
			stubPassport(null, { ...fakeUser }, null);
			const loginError = new Error('Session save failed');

			const { req, res, next } = mockReqResNext({
				body: { email: 'test@example.com', password: 'p' }
			});
			// Override logIn to simulate a session-save error
			req.logIn = vi.fn((_user: any, cb: (err: any) => void) => cb(loginError));

			userController.login(req, res, next);

			expect(req.session.regenerate).toHaveBeenCalled();
			expect(next).toHaveBeenCalledWith(loginError);
		});

		it('should call next when session.regenerate fails', () => {
			stubPassport(null, { ...fakeUser }, null);
			const regenerateError = new Error('Session store failure');

			const { req, res, next } = mockReqResNext({
				body: { email: 'test@example.com', password: 'p' }
			});
			// Override regenerate to simulate a session store error
			req.session.regenerate = vi.fn((cb: (err: any) => void) => cb(regenerateError));

			userController.login(req, res, next);

			expect(next).toHaveBeenCalledWith(regenerateError);
			expect(req.logIn).not.toHaveBeenCalled();
		});
	});

	// ========== register ==========

	describe('register', () => {
		it('should register a new user and return 201 with insertedId', async () => {
			const insertedId = new ObjectId();
			vi.mocked(userService.registerUser).mockResolvedValue({ insertedId });

			const { req, res, next } = mockReqResNext({
				body: { email: 'New@Example.com', password: 'securePassword' }
			});

			await userController.register(req, res, next);

			// Email lowercased, password hashed, transitioned flag set
			expect(req.body.email).toBe('new@example.com');
			expect(bcrypt.hash).toHaveBeenCalledWith('securePassword', 10);
			expect(req.body.password).toBe('hashed_password_mock');
			expect(req.body.transitioned).toBe(true);
			expect(userService.registerUser).toHaveBeenCalledWith(req.body);
			expect(res.status).toHaveBeenCalledWith(201);
			expect(res.json).toHaveBeenCalledWith({ insertedId });
		});

		it('never passes an _id to the service, even when the body carries userId (account-takeover regression)', async () => {
			vi.mocked(userService.registerUser).mockResolvedValue({ insertedId: new ObjectId() });

			const { req, res, next } = mockReqResNext({
				body: { email: 'new@example.com', password: 'securePassword', userId: fakeUserId }
			});

			await userController.register(req, res, next);

			expect(userService.registerUser).toHaveBeenCalledWith(expect.not.objectContaining({ _id: expect.anything() }));
			expect(res.status).toHaveBeenCalledWith(201);
		});

		// CASE: authenticated GitHub-only stub — the login is added to the session's own account
		it('attaches email and hashed password to the session stub instead of inserting a second account', async () => {
			const stub = { _id: fakeUserId, github: { login: 'ghuser', id: 42, githubToken: 'gh-token' } };
			vi.mocked(userService.isGithubOnlyStub).mockReturnValueOnce(true);
			vi.mocked(userService.attachCredentialsToGithubStub).mockResolvedValue({ matchedCount: 1, modifiedCount: 1 } as any);

			const { req, res, next } = mockReqResNext({
				body: { email: 'New@Example.com', password: 'securePassword' },
				user: stub
			});

			await userController.register(req, res, next);

			expect(userService.attachCredentialsToGithubStub).toHaveBeenCalledWith(fakeUserId, 'new@example.com', 'hashed_password_mock');
			expect(userService.registerUser).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(201);
			expect(next).not.toHaveBeenCalled();
		});

		// Regression guard: the target is always the session user, never an _id/userId from the request body
		it('ignores a client-supplied userId and attaches only to the session stub', async () => {
			const stub = { _id: fakeUserId, github: { login: 'ghuser', id: 42, githubToken: 'gh-token' } };
			const victimId = new ObjectId().toHexString();
			vi.mocked(userService.isGithubOnlyStub).mockReturnValueOnce(true);
			vi.mocked(userService.attachCredentialsToGithubStub).mockResolvedValue({ matchedCount: 1, modifiedCount: 1 } as any);

			const { req, res, next } = mockReqResNext({
				body: { email: 'new@example.com', password: 'securePassword', userId: victimId, _id: victimId },
				user: stub
			});

			await userController.register(req, res, next);

			expect(userService.attachCredentialsToGithubStub).toHaveBeenCalledWith(fakeUserId, expect.any(String), expect.any(String));
			expect(userService.attachCredentialsToGithubStub).not.toHaveBeenCalledWith(victimId, expect.anything(), expect.anything());
		});

		// CASE: unauthenticated — register only ever inserts
		it('inserts a new account for an anonymous request, even when the email matches a GitHub stub', async () => {
			vi.mocked(userService.registerUser).mockResolvedValue({ insertedId: new ObjectId() });

			const { req, res, next } = mockReqResNext({
				body: { email: 'new@example.com', password: 'securePassword' },
				user: null
			});

			await userController.register(req, res, next);

			expect(userService.attachCredentialsToGithubStub).not.toHaveBeenCalled();
			expect(userService.registerUser).toHaveBeenCalledTimes(1);
			expect(res.status).toHaveBeenCalledWith(201);
		});

		// CASE: authenticated but not a stub (already has a login) — a normal new account is created
		it('inserts a new account when the session user already has a login', async () => {
			vi.mocked(userService.isGithubOnlyStub).mockReturnValueOnce(false);
			vi.mocked(userService.registerUser).mockResolvedValue({ insertedId: new ObjectId() });

			const { req, res, next } = mockReqResNext({
				body: { email: 'new@example.com', password: 'securePassword' },
				user: { ...fakeUser }
			});

			await userController.register(req, res, next);

			expect(userService.attachCredentialsToGithubStub).not.toHaveBeenCalled();
			expect(userService.registerUser).toHaveBeenCalledTimes(1);
		});

		it('should throw 409 AppError when email is already registered', async () => {
			// Service rejects with 'User already exists' — catch block re-throws as AppError.conflict
			vi.mocked(userService.registerUser).mockRejectedValue(new Error('User already exists'));

			const { req, res, next } = mockReqResNext({
				body: { email: 'taken@example.com', password: 'pw' }
			});

			// The catch block re-throws without calling next, so the async function rejects
			const error = await userController.register(req, res, next).catch((e: any) => e);
			expect(error).toBeInstanceOf(AppError);
			expect(error.statusCode).toBe(409);
			expect(error.message).toBe('User already exists');
		});

		it('should call next with 400 AppError when email is missing', async () => {
			const { req, res, next } = mockReqResNext({
				body: { password: 'pw' }
			});

			await userController.register(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			const error = next.mock.calls[0][0];
			expect(error).toBeInstanceOf(AppError);
			expect(error.statusCode).toBe(400);
			expect(error.message).toBe('Email and password are required.');
		});

		it('should call next with 400 AppError when password is missing', async () => {
			const { req, res, next } = mockReqResNext({
				body: { email: 'test@example.com' }
			});

			await userController.register(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			const error = next.mock.calls[0][0];
			expect(error).toBeInstanceOf(AppError);
			expect(error.statusCode).toBe(400);
		});

		it('should call next with 400 AppError for invalid email format', async () => {
			const { req, res, next } = mockReqResNext({
				body: { email: 'not-an-email', password: 'pw' }
			});

			await userController.register(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			const error = next.mock.calls[0][0];
			expect(error).toBeInstanceOf(AppError);
			expect(error.statusCode).toBe(400);
			expect(error.message).toBe('Invalid email format.');
		});
	});

	// ========== deleteUser ==========

	describe('deleteUser', () => {
		it('should delete the authenticated user, clear session, and respond 200', async () => {
			vi.mocked(userService.deleteUser).mockResolvedValue({ deletedCount: 1 });

			const { req, res, next } = mockReqResNext({
				user: { ...fakeUser }
			});

			await userController.deleteUser(req, res, next);

			expect(userService.deleteUser).toHaveBeenCalledWith(fakeUser._id);
			expect(req.logout).toHaveBeenCalled();
			expect(res.clearCookie).toHaveBeenCalledWith('connect.sid', { path: '/' });
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({ message: 'User deleted successfully' });
			expect(next).not.toHaveBeenCalled();
		});

		it('should call next with 401 AppError when user is not authenticated', async () => {
			const { req, res, next } = mockReqResNext({ user: null });

			await userController.deleteUser(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			const error = next.mock.calls[0][0];
			expect(error).toBeInstanceOf(AppError);
			expect(error.statusCode).toBe(401);
		});
	});

	// ========== initiateMergeGithub ==========

	describe('initiateMergeGithub', () => {
		it('should return a merge token when the session user owns the target account', async () => {
			const { req, res, next } = mockReqResNext({
				user: { ...fakeUser },
				body: { userId: fakeUserId }
			});

			userController.initiateMergeGithub(req, res, next);

			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ mergeToken: 'test-uuid-merge-token' }));
			expect(next).not.toHaveBeenCalled();
		});

		it('should call next with 401 when user is not authenticated', async () => {
			const { req, res, next } = mockReqResNext({
				user: null
			});

			userController.initiateMergeGithub(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			const error = next.mock.calls[0][0];
			expect(error).toBeInstanceOf(AppError);
			expect(error.statusCode).toBe(401);
		});

		// The per-user replacement and expiry rules live in the service (user.service.spec.ts)
		it('issues the intent for the session user through the service', async () => {
			const { req, res, next } = mockReqResNext({
				user: { ...fakeUser },
				body: { userId: fakeUserId }
			});

			userController.initiateMergeGithub(req, res, next);

			expect(userService.createMergeIntent).toHaveBeenCalledWith(fakeUserId);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(next).not.toHaveBeenCalled();
		});

		it('should call next with 403 when the session user does not own the target account', async () => {
			const differentUserId = new ObjectId().toHexString();

			const { req, res, next } = mockReqResNext({
				user: { ...fakeUser },
				body: { userId: differentUserId }
			});

			userController.initiateMergeGithub(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			const error = next.mock.calls[0][0];
			expect(error).toBeInstanceOf(AppError);
			expect(error.statusCode).toBe(403);
		});
	});

	// ========== mergeGithub ==========

	describe('mergeGithub', () => {
		/** GitHub-only account G — the session user after OAuth callback */
		const githubOnlyUser = {
			_id: new ObjectId().toHexString(),
			email: undefined,
			password: undefined,
			github: { login: 'ghuser', id: 42, githubToken: 'gh-token' }
		};

		it('should merge the session-verified GitHub identity into the Seed account (S) and respond 200 — simulates S→initiate→GitHub callback (G)→merge', async () => {
			// Session user is the GitHub-only account G (from OAuth callback)
			const mergedUser = { ...fakeUser, github: { login: 'ghuser', id: 42 } };
			vi.mocked(userService.mergeGithub).mockResolvedValue(mergedUser);

			// Token was created during initiateMergeGithub by Seed account S —
			// intent.userId = S (fakeUserId), NOT G (githubOnlyUser._id).
			// This is the correct flow: the session user (G) is DIFFERENT from the
			// merge target (S). The token is the ownership proof.
			const token = 'test-uuid-merge-token';
			vi.mocked(userService.consumeMergeIntent).mockReturnValueOnce(fakeUserId);

			const { req, res, next } = mockReqResNext({
				body: { mergeToken: token },
				user: githubOnlyUser
			});

			await userController.mergeGithub(req, res, next);

			// Merge target is intent.userId (S), not session user (G)
			expect(userService.consumeMergeIntent).toHaveBeenCalledWith(token);
			expect(userService.mergeGithub).toHaveBeenCalledWith(fakeUserId, 'ghuser', 42);
			expect(req.session.regenerate).toHaveBeenCalled();
			expect(req.logIn).toHaveBeenCalledWith(mergedUser, expect.any(Function));
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({ message: 'GitHub account merged' });
			expect(next).not.toHaveBeenCalled();
		});

		it('should reject second use of the same token (single-use enforcement)', async () => {
			const token = 'test-uuid-merge-token';
			vi.mocked(userService.consumeMergeIntent).mockReturnValueOnce(fakeUserId).mockReturnValueOnce(null);

			const { req, res, next } = mockReqResNext({
				body: { mergeToken: token },
				user: githubOnlyUser
			});

			// First use succeeds — token is consumed
			vi.mocked(userService.mergeGithub).mockResolvedValue({ ...fakeUser });
			await userController.mergeGithub(req, res, next);
			expect(res.status).toHaveBeenCalledWith(200);

			// Token is deleted — second use should fail
			const { req: req2, res: res2, next: next2 } = mockReqResNext({
				body: { mergeToken: token },
				user: githubOnlyUser
			});
			await userController.mergeGithub(req2, res2, next2);

			expect(next2).toHaveBeenCalledTimes(1);
			const error = next2.mock.calls[0][0];
			expect(error).toBeInstanceOf(AppError);
			expect(error.statusCode).toBe(403);
			expect(error.message).toBe('Invalid or expired merge token. Please re-initiate.');
		});

		it('should call next with 400 when the merge token is missing', async () => {
			const { req, res, next } = mockReqResNext({
				body: {},
				user: githubOnlyUser
			});

			await userController.mergeGithub(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			const error = next.mock.calls[0][0];
			expect(error).toBeInstanceOf(AppError);
			expect(error.statusCode).toBe(400);
		});

		// Unknown and expired tokens look the same to the caller, so the store state cannot be probed
		it('should call next with 403 when the merge token does not exist or has expired', async () => {
			vi.mocked(userService.consumeMergeIntent).mockReturnValueOnce(null);

			const { req, res, next } = mockReqResNext({
				body: { mergeToken: 'nonexistent-or-expired-token' },
				user: githubOnlyUser
			});

			await userController.mergeGithub(req, res, next);

			expect(userService.mergeGithub).not.toHaveBeenCalled();
			expect(next).toHaveBeenCalledTimes(1);
			const error = next.mock.calls[0][0];
			expect(error).toBeInstanceOf(AppError);
			expect(error.statusCode).toBe(403);
			expect(error.message).toBe('Invalid or expired merge token. Please re-initiate.');
		});

		it('should call next with 403 when the session user has no verified GitHub identity', async () => {
			const token = 'test-uuid-merge-token';
			vi.mocked(userService.consumeMergeIntent).mockReturnValueOnce(fakeUserId);

			const { req, res, next } = mockReqResNext({
				body: { mergeToken: token },
				// Authenticated user without any github payload — nothing verified to merge
				user: { ...fakeUser, github: undefined }
			});

			await userController.mergeGithub(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			const error = next.mock.calls[0][0];
			expect(error).toBeInstanceOf(AppError);
			expect(error.statusCode).toBe(403);
		});

		it('should call next with 403 when user is not authenticated', async () => {
			const { req, res, next } = mockReqResNext({
				body: { mergeToken: 'some-token' },
				user: null
			});

			await userController.mergeGithub(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			const error = next.mock.calls[0][0];
			expect(error).toBeInstanceOf(AppError);
			expect(error.statusCode).toBe(403);
		});
	});

	// ========== GitHub OAuth state (login CSRF) ==========

	describe('issueGithubState', () => {
		it('stores a fresh state in the session and returns it to the caller', async () => {
			const { req, res, next } = mockReqResNext();

			userController.issueGithubState(req, res, next);

			expect(req.session.githubOAuthState).toBe('test-uuid-merge-token');
			expect(res.json).toHaveBeenCalledWith({ state: 'test-uuid-merge-token' });
			expect(next).not.toHaveBeenCalled();
		});
	});

	describe('githubCallback', () => {
		const fetchMock = vi.fn();

		beforeEach(() => {
			vi.stubGlobal('fetch', fetchMock);
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		/** Mimics the GitHub token endpoint's form-encoded plain-text response. */
		function tokenResponse(body: string) {
			return { ok: true, text: async () => body };
		}

		it('rejects a callback without a state parameter and never contacts GitHub (login CSRF regression)', async () => {
			const { req, res, next } = mockReqResNext({ query: { code: 'abc' } });
			req.session.githubOAuthState = 'expected-state';

			await userController.githubCallback(req, res, next);

			expect(next.mock.calls[0][0].statusCode).toBe(403);
			expect(fetchMock).not.toHaveBeenCalled();
			expect(userService.findOrRegisterGithub).not.toHaveBeenCalled();
		});

		it('rejects a mismatched state and consumes the stored state (single use)', async () => {
			const { req, res, next } = mockReqResNext({ query: { code: 'abc', state: 'attacker-state' } });
			req.session.githubOAuthState = 'expected-state';

			await userController.githubCallback(req, res, next);

			expect(next.mock.calls[0][0].statusCode).toBe(403);
			expect(fetchMock).not.toHaveBeenCalled();
			expect(req.session.githubOAuthState).toBeUndefined();
		});

		it('rejects a callback when no state was ever issued in this session', async () => {
			const { req, res, next } = mockReqResNext({ query: { code: 'abc', state: 'any-state' } });

			await userController.githubCallback(req, res, next);

			expect(next.mock.calls[0][0].statusCode).toBe(403);
			expect(fetchMock).not.toHaveBeenCalled();
		});

		it('rejects a missing or non-string code before calling GitHub', async () => {
			const { req, res, next } = mockReqResNext({ query: { state: 'expected-state' } });
			req.session.githubOAuthState = 'expected-state';

			await userController.githubCallback(req, res, next);

			expect(next.mock.calls[0][0].statusCode).toBe(400);
			expect(fetchMock).not.toHaveBeenCalled();
		});

		it('does not echo GitHub error details to the client', async () => {
			const { req, res, next } = mockReqResNext({ query: { code: 'bad', state: 'expected-state' } });
			req.session.githubOAuthState = 'expected-state';
			fetchMock.mockResolvedValueOnce(tokenResponse('error=bad_verification_code&error_description=The+code+passed+is+incorrect'));

			await userController.githubCallback(req, res, next);

			const error = next.mock.calls[0][0];
			expect(error.statusCode).toBe(502);
			expect(error.message).toBe('Failed to get access token');
			expect(error.message).not.toContain('bad_verification_code');
		});

		it('completes the login when the state matches, and consumes the state', async () => {
			const { req, res, next } = mockReqResNext({ query: { code: 'good', state: 'expected-state' } });
			req.session.githubOAuthState = 'expected-state';
			fetchMock
				.mockResolvedValueOnce(tokenResponse('access_token=gho_tok&token_type=bearer'))
				.mockResolvedValueOnce({ ok: true, json: async () => ({ login: 'ghuser', id: 42 }) });
			vi.mocked(userService.findOrRegisterGithub).mockResolvedValue({ _id: fakeUserId, github: { login: 'ghuser', id: 42 } } as any);

			await userController.githubCallback(req, res, next);

			expect(next).not.toHaveBeenCalled();
			expect(userService.findOrRegisterGithub).toHaveBeenCalledWith(expect.objectContaining({ login: 'ghuser', id: 42, githubToken: 'gho_tok' }));
			expect(res.status).toHaveBeenCalledWith(200);
			expect(req.session.githubOAuthState).toBeUndefined();
		});

		// Contract with the frontend: the state from GET /user/github/state, sent back unchanged in the callback, must log in
		it('accepts the state returned by GET /user/github/state when the same session sends it back', async () => {
			const issue = mockReqResNext();
			userController.issueGithubState(issue.req, issue.res, issue.next);
			const { state } = (issue.res.json as ReturnType<typeof vi.fn>).mock.calls[0][0] as { state: string };

			const { req, res, next } = mockReqResNext({ query: { code: 'good', state } });
			req.session.githubOAuthState = state;
			fetchMock
				.mockResolvedValueOnce(tokenResponse('access_token=gho_tok&token_type=bearer'))
				.mockResolvedValueOnce({ ok: true, json: async () => ({ login: 'ghuser', id: 42 }) });
			vi.mocked(userService.findOrRegisterGithub).mockResolvedValue({ _id: fakeUserId, github: { login: 'ghuser', id: 42 } } as any);

			await userController.githubCallback(req, res, next);

			expect(next).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(200);
		});
	});

	// ========== getUser ==========
	// Note: the controller does not export a getUserById function.
	// getUser returns req.user for the currently authenticated session.

	describe('getUser', () => {
		it('should return 200 with sanitized user data when authenticated', async () => {
			const { req, res, next } = mockReqResNext({
				user: { ...fakeUser }
			});

			userController.getUser(req, res, next);

			expect(res.status).toHaveBeenCalledWith(200);
			// Response should be sanitized — no password or githubToken
			expect(res.json).toHaveBeenCalledWith(
				expect.not.objectContaining({ password: expect.anything() })
			);
		});

		it('should throw 401 AppError when not authenticated', () => {
			const { req, res, next } = mockReqResNext({ user: null });

			// getUser is sync now — throws directly
			expect(() => userController.getUser(req, res, next)).toThrow(AppError);
		});
	});

	// ========== updateUser ==========

	describe('updateUser', () => {
		it('should verify current password and hash+persist the new one', async () => {
			// compare resolves true by default — current password matches
			vi.mocked(userService.updateUser).mockResolvedValue({ ...fakeUser });

			const { req, res, next } = mockReqResNext({
				params: { userID: fakeUserId },
				body: { currentPassword: 'current_pw', newPassword: 'brand_new_password' },
				user: { ...fakeUser }
			});

			await userController.updateUser(req, res, next);

			// Current password must be checked against the stored hash before anything changes
			expect(bcrypt.compare).toHaveBeenCalledWith('current_pw', fakeUser.password);
			expect(bcrypt.hash).toHaveBeenCalledWith('brand_new_password', 10);
			// Only the changed field is written — the stale session snapshot must not be $set back (lost-update regression)
			expect(userService.updateUser).toHaveBeenCalledWith(fakeUserId, { password: 'hashed_password_mock' });
			expect(res.status).toHaveBeenCalledWith(200);
			// Response is sanitized — no password or githubToken
			expect(res.json).toHaveBeenCalledWith(
				expect.not.objectContaining({ password: expect.anything() })
			);
			expect(next).not.toHaveBeenCalled();
		});

		it('should not hash or persist the new password when the current password is wrong', async () => {
			vi.mocked(bcrypt.compare).mockResolvedValue(false);
			vi.mocked(userService.updateUser).mockResolvedValue({ ...fakeUser });

			const { req, res, next } = mockReqResNext({
				params: { userID: fakeUserId },
				body: { currentPassword: 'wrong_current', newPassword: 'brand_new_password' },
				user: { ...fakeUser }
			});

			await userController.updateUser(req, res, next);

			expect(bcrypt.compare).toHaveBeenCalledWith('wrong_current', fakeUser.password);
			// Rejected before hashing or persisting — stored password stays unchanged
			expect(bcrypt.hash).not.toHaveBeenCalled();
			expect(userService.updateUser).not.toHaveBeenCalled();
			expect(res.status).not.toHaveBeenCalled();
			expect(next).toHaveBeenCalledTimes(1);
			const error = next.mock.calls[0][0];
			expect(error).toBeInstanceOf(AppError);
			expect(error.statusCode).toBe(401);
		});

		it('should call next with 403 AppError when userID does not match logged-in user', async () => {
			const otherUserId = new ObjectId().toHexString();

			const { req, res, next } = mockReqResNext({
				params: { userID: otherUserId },
				body: { currentPassword: 'current_pw', newPassword: 'brand_new_password' },
				user: { ...fakeUser }
			});

			await userController.updateUser(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			const error = next.mock.calls[0][0];
			expect(error).toBeInstanceOf(AppError);
			expect(error.statusCode).toBe(403);
		});

		it('should call next with 403 AppError when user is not authenticated', async () => {
			const { req, res, next } = mockReqResNext({
				params: { userID: fakeUserId },
				body: { currentPassword: 'current_pw', newPassword: 'brand_new_password' },
				user: null
			});

			await userController.updateUser(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			const error = next.mock.calls[0][0];
			expect(error).toBeInstanceOf(AppError);
			expect(error.statusCode).toBe(403);
		});
	});
});
