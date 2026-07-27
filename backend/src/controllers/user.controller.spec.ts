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
	mergeGithub: vi.fn(),
}));

vi.mock('../nodemailer', () => ({
	sendResetLink: vi.fn().mockResolvedValue(undefined),
}));

// No-op logger to suppress output during tests
vi.mock('../logging', () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	},
}));

vi.mock('passport', () => ({
	default: {
		authenticate: vi.fn(),
	},
}));

vi.mock('bcrypt', () => ({
	default: {
		hash: vi.fn().mockResolvedValue('hashed_password_mock'),
	},
}));

vi.mock('node:crypto', () => ({
	randomUUID: vi.fn().mockReturnValue('test-uuid-1234-5678'),
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
		clearCookie: vi.fn().mockReturnThis(),
	};
	const next = vi.fn();
	const req = {
		params: overrides.params ?? {},
		body: { ...(overrides.body ?? {}) },
		query: overrides.query ?? {},
		user: overrides.user !== undefined ? overrides.user : null,
		session: { cookie: { maxAge: null } },
		logIn: vi.fn((_user: any, cb: (err: any) => void) => cb(null)),
		logout: vi.fn((cb: (err: any) => void) => cb(null)),
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
		jira: undefined,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ========== forgotPassword ==========

	describe('forgotPassword', () => {
		it('should send a reset link when the user exists', async () => {
			vi.mocked(userService.getResetRequestByEmail).mockResolvedValue(null);
			vi.mocked(userService.getUserByEmail).mockResolvedValue({ ...fakeUser } as any);
			vi.mocked(userService.createResetRequest).mockResolvedValue({ insertedId: new ObjectId() });

			const { req, res, next } = mockReqResNext({
				body: { email: 'Test@Example.com' },
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
				email: 'test@example.com',
			});
			vi.mocked(userService.deleteRequest).mockResolvedValue({ deletedCount: 1 });
			vi.mocked(userService.getUserByEmail).mockResolvedValue({ ...fakeUser } as any);
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
				body: { email: 'nobody@example.com' },
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
			vi.mocked(userService.getUserByEmail).mockResolvedValue({ ...fakeUser } as any);
			vi.mocked(userService.updateUser).mockResolvedValue({ modifiedCount: 1 });
			vi.mocked(userService.deleteRequest).mockResolvedValue({ deletedCount: 1 });

			const { req, res, next } = mockReqResNext({
				body: { uuid: 'valid-uuid', password: 'newSecurePassword' },
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
				body: { uuid: 'expired-uuid', password: 'newPassword' },
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
			});
			vi.mocked(userService.getUserByEmail).mockResolvedValue(null);

			const { req, res, next } = mockReqResNext({
				body: { uuid: 'valid-uuid', password: 'newPassword' },
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

		it('should authenticate and return the user on successful login', () => {
			const loginUser = { ...fakeUser };
			stubPassport(null, loginUser, null);

			const { req, res, next } = mockReqResNext({
				body: { email: 'Test@Example.com', password: 'password123' },
			});

			userController.login(req, res, next);

			expect(req.body.email).toBe('test@example.com');
			expect(req.logIn).toHaveBeenCalled();
			expect(res.json).toHaveBeenCalledWith(loginUser);
			expect(next).not.toHaveBeenCalled();
		});

		it('should return 401 when passport reports no user (invalid credentials)', () => {
			stubPassport(null, false, { message: 'Invalid credentials' });

			const { req, res, next } = mockReqResNext({
				body: { email: 'test@example.com', password: 'wrong' },
			});

			userController.login(req, res, next);

			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.json).toHaveBeenCalledWith({
				status: 'error',
				message: 'Invalid credentials',
			});
		});

		it('should call next when passport encounters an internal error', () => {
			const passportError = new Error('Strategy failure');
			stubPassport(passportError, null, null);

			const { req, res, next } = mockReqResNext({
				body: { email: 'test@example.com', password: 'x' },
			});

			userController.login(req, res, next);

			expect(next).toHaveBeenCalledWith(passportError);
		});

		it('should extend session cookie when stayLoggedIn is true', () => {
			stubPassport(null, { ...fakeUser }, null);

			const { req, res, next } = mockReqResNext({
				body: { email: 'test@example.com', password: 'p', stayLoggedIn: true },
			});

			userController.login(req, res, next);

			// 10 days in milliseconds
			expect(req.session.cookie.maxAge).toBe(864000000);
		});

		it('should rehash the password for legacy users (transitioned === false)', async () => {
			const legacyUser = { ...fakeUser, transitioned: false };
			stubPassport(null, legacyUser, null);
			vi.mocked(userService.updateUser).mockResolvedValue({ modifiedCount: 1 });

			const { req, res, next } = mockReqResNext({
				body: { email: 'test@example.com', password: 'legacyPw' },
			});

			userController.login(req, res, next);

			// The logIn callback is async — wait for hash + updateUser promises to settle
			await flushPromises();

			expect(bcrypt.hash).toHaveBeenCalledWith('legacyPw', 10);
			expect(userService.updateUser).toHaveBeenCalled();
			// After transition, user data should still be sent back
			expect(res.json).toHaveBeenCalledWith(legacyUser);
		});

		it('should call next when req.logIn fails', () => {
			stubPassport(null, { ...fakeUser }, null);
			const loginError = new Error('Session save failed');

			const { req, res, next } = mockReqResNext({
				body: { email: 'test@example.com', password: 'p' },
			});
			// Override logIn to simulate a session-save error
			req.logIn = vi.fn((_user: any, cb: (err: any) => void) => cb(loginError));

			userController.login(req, res, next);

			expect(next).toHaveBeenCalledWith(loginError);
		});
	});

	// ========== register ==========

	describe('register', () => {
		it('should register a new user and return 201 with insertedId', async () => {
			const insertedId = new ObjectId();
			vi.mocked(userService.registerUser).mockResolvedValue({ insertedId });

			const { req, res, next } = mockReqResNext({
				body: { email: 'New@Example.com', password: 'securePassword' },
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
				body: { email: 'taken@example.com', password: 'pw' },
			});

			// The catch block re-throws without calling next, so the async function rejects
			const error = await userController.register(req, res, next).catch((e: any) => e);
			expect(error).toBeInstanceOf(AppError);
			expect(error.statusCode).toBe(409);
			expect(error.message).toBe('User already exists');
		});

		it('should call next with 400 AppError when email is missing', async () => {
			const { req, res, next } = mockReqResNext({
				body: { password: 'pw' },
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
				body: { email: 'test@example.com' },
			});

			await userController.register(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			const error = next.mock.calls[0][0];
			expect(error).toBeInstanceOf(AppError);
			expect(error.statusCode).toBe(400);
		});

		it('should call next with 400 AppError for invalid email format', async () => {
			const { req, res, next } = mockReqResNext({
				body: { email: 'not-an-email', password: 'pw' },
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
				user: { ...fakeUser },
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
		it('should merge accounts and respond 200 when the user owns the account', async () => {
			const mergedUser = { ...fakeUser, github: { login: 'newgh', id: 99, githubToken: 'tok' } };
			vi.mocked(userService.mergeGithub).mockResolvedValue(mergedUser as any);

			const { req, res, next } = mockReqResNext({
				body: { userId: fakeUserId, login: 'newgh', id: 99 },
				user: { ...fakeUser },
			});

			await userController.mergeGithub(req, res, next);

			expect(userService.mergeGithub).toHaveBeenCalledWith(fakeUserId, 'newgh', 99);
			expect(req.logIn).toHaveBeenCalledWith(mergedUser, expect.any(Function));
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({ status: 'success' });
			expect(next).not.toHaveBeenCalled();
		});

		it('should call next with 403 AppError when userId does not match logged-in user', async () => {
			const otherUserId = new ObjectId().toHexString();

			const { req, res, next } = mockReqResNext({
				body: { userId: otherUserId, login: 'ghuser', id: 99 },
				user: { ...fakeUser },
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
				user: null,
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
		it('should return 200 with user data when authenticated', async () => {
			const { req, res, next } = mockReqResNext({
				user: { ...fakeUser },
			});

			await userController.getUser(req, res, next);

			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(req.user);
		});

		it('should throw 401 AppError when not authenticated', async () => {
			const { req, res, next } = mockReqResNext({ user: null });

			// getUser throws outside try/catch — the async function rejects
			const error = await userController.getUser(req, res, next).catch((e: any) => e);
			expect(error).toBeInstanceOf(AppError);
			expect(error.statusCode).toBe(401);
		});
	});

	// ========== updateUser ==========

	describe('updateUser', () => {
		it('should update user data and return the updated user', async () => {
			const updatedResult = { ...fakeUser };
			vi.mocked(userService.updateUser).mockResolvedValue(updatedResult);

			const { req, res, next } = mockReqResNext({
				params: { userID: fakeUserId },
				body: { email: 'ignored@new.com', password: 'existing_hashed_pw' },
				user: { ...fakeUser },
			});

			await userController.updateUser(req, res, next);

			// Email, github, jira must be preserved from the authenticated user
			expect(userService.updateUser).toHaveBeenCalledWith(
				fakeUserId,
				expect.objectContaining({
					_id: fakeUser._id,
					email: fakeUser.email,
					github: fakeUser.github,
				})
			);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(updatedResult);
			expect(next).not.toHaveBeenCalled();
		});

		it('should hash the password when it differs from the current one', async () => {
			vi.mocked(userService.updateUser).mockResolvedValue({ ...fakeUser });

			const { req, res, next } = mockReqResNext({
				params: { userID: fakeUserId },
				body: { email: 'x@x.com', password: 'brand_new_password' },
				user: { ...fakeUser },
			});

			await userController.updateUser(req, res, next);

			expect(bcrypt.hash).toHaveBeenCalledWith('brand_new_password', 10);
			expect(userService.updateUser).toHaveBeenCalledWith(
				fakeUserId,
				expect.objectContaining({ password: 'hashed_password_mock', transitioned: true })
			);
		});

		it('should keep the old password when the submitted password matches', async () => {
			vi.mocked(userService.updateUser).mockResolvedValue({ ...fakeUser });

			const { req, res, next } = mockReqResNext({
				params: { userID: fakeUserId },
				// Same password as fakeUser.password — no rehash needed
				body: { email: 'x@x.com', password: 'existing_hashed_pw' },
				user: { ...fakeUser },
			});

			await userController.updateUser(req, res, next);

			expect(bcrypt.hash).not.toHaveBeenCalled();
			expect(userService.updateUser).toHaveBeenCalledWith(
				fakeUserId,
				expect.objectContaining({ password: 'existing_hashed_pw' })
			);
		});

		it('should call next with 403 AppError when userID does not match logged-in user', async () => {
			const otherUserId = new ObjectId().toHexString();

			const { req, res, next } = mockReqResNext({
				params: { userID: otherUserId },
				body: { email: 'x@x.com' },
				user: { ...fakeUser },
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
				body: { email: 'x@x.com' },
				user: null,
			});

			await userController.updateUser(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			const error = next.mock.calls[0][0];
			expect(error).toBeInstanceOf(AppError);
			expect(error.statusCode).toBe(403);
		});
	});
});
