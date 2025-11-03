import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import passport from 'passport';
import * as userController from '../controllers/user.controller';

const router = express.Router();

// --- Middleware (CORS, BodyParser, etc.) ---
router
    .use(cors({
        origin: [process.env.FRONTEND_URL || 'http://localhost:4200'],
        credentials: true
    }))
    .use(bodyParser.json({ limit: '100kb' }))
    .use(bodyParser.urlencoded({
        limit: '100kb',
        extended: true
    }))
    .use((req, res, next) => {
		res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:4200');
		res.header('Access-Control-Allow-Credentials', 'true');
		res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Credentials, Authorization, X-Redirect');
		next();
	})
    .use((_, __, next) => {
        console.log('Time of user router request:', Date.now());
        next();
    });

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
router.post('/mergeGithub', userController.mergeGithub);

// --- User Management Routes ---

/**
 * @route   GET /api/user/
 * @desc    Get the logged-in user's data
 * @access  Private
 */
router.get('/', userController.getUser);

/**
 * @route   DELETE /api/user/
 * @desc    Delete the logged-in user's account
 * @access  Private
 */
router.delete('/', userController.deleteUser);

/**
 * @route   POST /api/user/update/:userID
 * @desc    Update the logged-in user's data (Note: PUT or PATCH might be better REST verbs)
 * @access  Private
 */
router.post('/update/:userID', userController.updateUser);

// Note: /githubLogin and /githubRegister from the old router seem redundant 
// if the main flow is via the OAuth callback. They are omitted here.
// If they served a different purpose (e.g., manual linking), they can be added back.

export default router;