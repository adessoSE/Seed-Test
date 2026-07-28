import express from 'express';
import rateLimit from 'express-rate-limit';
import * as userController from '../controllers/user.controller.js';
import { isAuthenticated } from '../middleware/authenticate.js';

const router = express.Router();

// Rate-limit brute-force-sensitive auth endpoints only (not GET /user/ etc.)
const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 20, // max 20 attempts per window
	standardHeaders: true,
	legacyHeaders: false,
	message: { error: 'Too many requests. Please try again later.' },
	// Express 5 can yield undefined req.ip on destroyed connections
	validate: { ip: false }
});

// Authentication middleware imported from ../middleware/authenticate.ts

// --- Authentication Routes ---

/**
 * @route   POST /api/user/login
 * @desc    Logs in a user with email/password
 * @access  Public
 */
router.post('/login', authLimiter, userController.login);

/**
 * @route   POST /api/user/register
 * @desc    Registers a new user
 * @access  Public
 */
router.post('/register', authLimiter, userController.register);

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
router.post('/resetpassword', authLimiter, userController.forgotPassword);

/**
 * @route   PATCH /api/user/reset
 * @desc    Resets the password using a UUID
 * @access  Public
 */
router.patch('/reset', authLimiter, userController.resetPassword);

// --- GitHub OAuth Routes ---

/**
 * @route   GET /api/user/callback
 * @desc    GitHub OAuth callback URL
 * @access  Public
 */
router.get('/callback', userController.githubCallback);

/**
 * @route   POST /api/user/mergeGithub
 * @desc    Merges a GitHub account with the logged-in user
 * @access  Private
 */
router.post('/mergeGithub', isAuthenticated, userController.mergeGithub);

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
router.delete('/', isAuthenticated, userController.deleteUser);

/**
 * @route   POST /api/user/update/:userID
 * @desc    Update the logged-in user's data (Note: PUT or PATCH might be better REST verbs)
 * @access  Private
 */
router.post('/update/:userID', isAuthenticated, userController.updateUser);

// Note: /githubLogin and /githubRegister from the old router seem redundant 
// if the main flow is via the OAuth callback. They are omitted here.
// If they served a different purpose (e.g., manual linking), they can be added back.

export default router;