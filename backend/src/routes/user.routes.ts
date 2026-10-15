import express from 'express';
import rateLimit from 'express-rate-limit';
import * as userController from '../controllers/user.controller.js';
import { isAuthenticated } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema, mergeGithubSchema, updateUserSchema, initiateMergeGithubSchema } from '@seed-test/shared/schemas/user.schemas.js';

const router = express.Router();

/**
 * Builds a limiter with the same window and budget for every call. Each call creates its own store,
 * so limiters built here do not share a counter.
 */
function createAuthLimiter() {
	return rateLimit({
		windowMs: 15 * 60 * 1000, // 15 minutes
		max: 20, // max 20 attempts per window
		standardHeaders: true,
		legacyHeaders: false,
		message: { error: 'Too many requests. Please try again later.' },
		// Express 5 can yield undefined req.ip on destroyed connections
		validate: { ip: false }
	});
}

// WHY separate buckets: a flood of failed logins or resets must not lock out a signed-in user from
// changing a password or deleting the account, and the reverse must not happen either.

// Login, registration and password reset (unauthenticated, credential-guessing targets)
const authLimiter = createAuthLimiter();
// Password change and account deletion (signed-in, verify the current password or the account itself)
const passwordLimiter = createAuthLimiter();
// Merge initiate: returns a single-use merge token per call, so repeated calls are throttled separately
const mergeInitiateLimiter = createAuthLimiter();

// Authentication middleware imported from ../middleware/authenticate.ts

// --- Authentication Routes ---

/**
 * @route   POST /api/user/login
 * @desc    Logs in a user with email/password
 * @access  Public
 */
router.post('/login', authLimiter, validate(loginSchema), userController.login);

/**
 * @route   POST /api/user/register
 * @desc    Registers a new user
 * @access  Public
 */
router.post('/register', authLimiter, validate(registerSchema), userController.register);

/**
 * @route   GET /api/user/logout
 * @desc    Logs out the current user
 * @access  Private (requires session)
 */
router.get('/logout', userController.logout);

// --- Password Reset Routes ---

/**
 * @route   POST /api/user/resetpassword
 * @desc    Requests a password reset email
 * @access  Public
 */
router.post('/resetpassword', authLimiter, validate(forgotPasswordSchema), userController.forgotPassword);

/**
 * @route   PATCH /api/user/reset
 * @desc    Resets the password using a UUID
 * @access  Public
 */
router.patch('/reset', authLimiter, validate(resetPasswordSchema), userController.resetPassword);

// --- GitHub OAuth Routes ---

/**
 * @route   GET /api/user/github/state
 * @desc    Issues the OAuth state (CSRF nonce) stored in the session; the frontend passes it to GitHub
 * @access  Public
 */
router.get('/github/state', userController.issueGithubState);

/**
 * @route   GET /api/user/callback
 * @desc    GitHub OAuth callback URL (requires the state issued by /github/state)
 * @access  Public
 */
router.get('/callback', userController.githubCallback);

/**
 * @route   POST /api/user/mergeGithub/initiate
 * @desc    Initiate GitHub merge — proves ownership of target Seed account
 * @access  Private
 */
router.post('/mergeGithub/initiate', mergeInitiateLimiter, isAuthenticated, validate(initiateMergeGithubSchema), userController.initiateMergeGithub);

/**
 * @route   POST /api/user/mergeGithub
 * @desc    Complete GitHub merge — verifies merge-intent token and merges verified GitHub identity
 * @access  Private
 */
router.post('/mergeGithub', isAuthenticated, validate(mergeGithubSchema), userController.mergeGithub);

// --- User Management Routes ---

/**
 * @route   GET /api/user/
 * @desc    Get the logged-in user's data
 * @access  Private
 */
router.get('/', isAuthenticated, userController.getUser);

/**
 * @route   DELETE /api/user/
 * @desc    Delete the logged-in user's account
 * @access  Private
 */
router.delete('/', passwordLimiter, isAuthenticated, userController.deleteUser);

/**
 * @route   POST /api/user/update/:userID
 * @desc    Change the logged-in user's password (current password required). Uses the password limiter
 *          so the current-password check cannot be brute-forced.
 * @access  Private
 */
router.post('/update/:userID', passwordLimiter, isAuthenticated, validate(updateUserSchema), userController.updateUser);

export default router;