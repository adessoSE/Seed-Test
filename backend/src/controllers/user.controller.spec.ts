// src/controllers/user.controller.spec.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
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
	mergeGithub: vi.fn()
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

vi.mock('node:crypto', () => ({
	randomUUID: vi.fn().mockReturnValue('test-uuid-1234-5678')
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
				expect.objectContaining({ uuid: 'test-uuid-1234-5678', email: fakeUser.email })
			);
			expect(nodeMail.sendResetLink).toHaveBeenCalledWith(fakeUser.email, 'test-uuid-1234-5678');
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({ message: 'Reset link sent' });
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

		it('should call next with a 404 AppError when the user is not found', async () => {
			vi.mocked(userService.getResetRequestByEmail).mockResolvedValue(null);
			vi.mocked(userService.getUserByEmail).mockResolvedValue(null);

			const { req, res, next } = mockReqResNext({
				body: { email: 'nobody@example.com' }
			});

			await userController.forgotPassword(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			const error = next.mock.calls[0][0];
			expect(error).toBeInstanceOf(AppError);
			expect(error.statusCode).toBe(404);
		});
	});

	// ========== resetPassword ==========

	describe('resetPassword', () => {
		it('should reset the password with a valid UUID', async () => {
			const resetRequest = { uuid: 'valid-uuid', email: fakeUser.email };
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
				email: 'deleted@example.com'
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

	// ========== mergeGithub (mergeAccounts) ==========

	describe('mergeGithub', () => {
		it('should merge the session-verified GitHub identity into the Seed account and respond 200', async () => {
			const mergedUser = { ...fakeUser, github: { login: 'ghuser', id: 42, githubToken: 'tok' } };
			vi.mocked(userService.mergeGithub).mockResolvedValue(mergedUser);

			const { req, res, next } = mockReqResNext({
				// Stale/mismatched client-supplied login/id must be IGNORED — the verified
				// identity always comes from the session user's github payload.
				body: { userId: fakeUserId, login: 'clientLogin', id: 999 },
				user: { ...fakeUser }
			});

			await userController.mergeGithub(req, res, next);

			expect(userService.mergeGithub).toHaveBeenCalledWith(fakeUserId, 'ghuser', 42);
			expect(req.session.regenerate).toHaveBeenCalled();
			expect(req.logIn).toHaveBeenCalledWith(mergedUser, expect.any(Function));
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({ message: 'GitHub account merged' });
			expect(next).not.toHaveBeenCalled();
		});

		it('should call next with 403 AppError when the session user has no verified GitHub identity', async () => {
			const { req, res, next } = mockReqResNext({
				body: { userId: fakeUserId, login: 'ghuser', id: 99 },
				// Authenticated Seed user without any github payload — nothing verified to merge
				user: { ...fakeUser, github: undefined }
			});

			await userController.mergeGithub(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			const error = next.mock.calls[0][0];
			expect(error).toBeInstanceOf(AppError);
			expect(error.statusCode).toBe(403);
		});

		it('should call next with 403 AppError when user is not authenticated', async () => {
			const { req, res, next } = mockReqResNext({
				body: { userId: fakeUserId, login: 'ghuser', id: 99 },
				user: null
			});

			await userController.mergeGithub(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			const error = next.mock.calls[0][0];
			expect(error).toBeInstanceOf(AppError);
			expect(error.statusCode).toBe(403);
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
			// Sensitive fields (email, github) preserved from the session user
			expect(userService.updateUser).toHaveBeenCalledWith(
				fakeUserId,
				expect.objectContaining({
					_id: fakeUser._id,
					email: fakeUser.email,
					github: fakeUser.github,
					password: 'hashed_password_mock'
				})
			);
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
