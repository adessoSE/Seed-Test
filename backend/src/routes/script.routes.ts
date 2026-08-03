import express, { type Request, type Response, type NextFunction } from 'express';
import passport from 'passport';
import initializePassport from '../passport-config.js';
import * as userService from '../services/user.service.js';
import * as scriptController from '../controllers/script.controller.js';
import { type Session, type SessionData } from 'express-session';
import { validate } from '../middleware/validate.js';
import { scriptGroupSchema, scriptFeatureSchema } from '../schemas/script.schemas.js';
import { AppError } from '../helpers/AppError.js';

const router = express.Router();

// CORS, body parsing, and authentication are handled globally in server.ts.

// Initialize Passport for this router's specific needs (session-based)
initializePassport(
	passport,
	userService.getUserByEmail,
	userService.getUserById,
	userService.getUserByGithub
);

// Define a type combining Request with Session properties
type RequestWithSession = Request & { session: Session & Partial<SessionData> };

// --- Custom Authentication Middleware for Script Routes ---
// This middleware handles the specific passport login flow for these routes.
const authenticateAndProceed = (controllerFunction: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
	return (req: Request, res: Response, next: NextFunction) => {
		if (req.body.email)
			req.body.email = req.body.email.toLowerCase();

		// Authenticate using passport.authenticate with a custom callback
		passport.authenticate('normal-local', (error: any, user: any, info: any) => {
			if (error)
				return next(error); // Pass errors to central handler

			if (!user)
				return next(AppError.unauthorized(info?.message || 'Authentication failed'));

			// Session fixation prevention — regenerate before establishing new identity
			(req as RequestWithSession).session.regenerate((regenerateErr) => {
				if (regenerateErr) return next(regenerateErr);

				// Set extended session lifetime after regeneration so the new session inherits it
				if (req.body.stayLoggedIn)
					(req as RequestWithSession).session.cookie.maxAge = 86400000; // 10 days

				req.logIn(user, (loginErr) => {
					if (loginErr)
						return next(loginErr);

					// Authentication successful — void the async call to satisfy no-misused-promises
					void controllerFunction(req, res, next)
						.catch((controllerError) => next(controllerError));
				});
			});
		})(req, res, next); // Don't forget to invoke the middleware function returned by passport.authenticate
	};
};


// --- Route Definitions ---

/**
 * @route   POST /api/script/Group
 * @desc    Authenticates and runs tests for a specific group
 * @access  Private (Requires valid credentials in body)
 */
router.post('/Group', validate(scriptGroupSchema), authenticateAndProceed(scriptController.runGroupViaScript));

/**
 * @route   POST /api/script/Feature/:issueID
 * @desc    Authenticates and runs tests for a specific feature
 * @access  Private (Requires valid credentials in body)
 */
router.post('/Feature/:issueID', validate(scriptFeatureSchema), authenticateAndProceed(scriptController.runFeatureViaScript));

export default router;