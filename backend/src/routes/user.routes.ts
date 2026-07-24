import express, { Request, Response, NextFunction } from 'express';
import * as userController from '../controllers/user.controller';

const router = express.Router();

// CORS, body parsing, and authentication are handled globally in server.ts.
// This local isAuthenticated guard is used for routes that need auth within this public router.
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
	if (req.isAuthenticated()) 
		return next();
	
	res.status(401).json({ error: 'Unauthorized: Please log in.' });
};

// --- Authentication Routes ---

/**
 * @route   POST /api/user/login
 * @desc    Logs in a user with email/password
 * @access  Public
 */
router.post('/login', userController.login);

/**
 * @route   POST /api/user/register
 * @desc    Registers a new user
 * @access  Public
 */
router.post('/register', userController.register);

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
router.post('/resetpassword', userController.forgotPassword);

/**
 * @route   PATCH /api/user/reset
 * @desc    Resets the password using a UUID
 * @access  Public
 */
router.patch('/reset', userController.resetPassword);

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