import express, { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import initializePassport from '../passport-config.js';
import * as userService from '../services/user.service.js';
import * as scriptController from '../controllers/script.controller.js';
import { Session, SessionData } from 'express-session';

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
		// 1. Set session duration if requested
		if (req.body.stayLoggedIn) 
			(req as RequestWithSession).session.cookie.maxAge = 86400000; // 10 days
        
		if (req.body.email) 
			req.body.email = req.body.email.toLowerCase();
        

		// 2. Authenticate using passport.authenticate with a custom callback
		passport.authenticate('normal-local', (error: any, user: any, info: any) => {
			if (error) 
				return next(error); // Pass errors to central handler
            
			if (!user) 
			// Send specific authentication failure message
				return res.status(401).json({ status: 'error', message: info?.message || 'Authentication failed' });
            

			// 3. Manually log the user in (establishes session)
			req.logIn(user, async (loginErr) => {
				if (loginErr) 
					return next(loginErr);
                
				// 4. Authentication successful, proceed to the actual controller logic
				try {
					await controllerFunction(req, res, next);
				} catch(controllerError) {
					next(controllerError); // Catch errors from the controller too
				}
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
router.post('/Group', authenticateAndProceed(scriptController.runGroupViaScript));

/**
 * @route   POST /api/script/Feature/:issueID
 * @desc    Authenticates and runs tests for a specific feature
 * @access  Private (Requires valid credentials in body)
 */
router.post('/Feature/:issueID', authenticateAndProceed(scriptController.runFeatureViaScript));

export default router;