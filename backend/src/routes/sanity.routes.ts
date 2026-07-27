import express, { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import initializePassport from '../passport-config.js';
import * as userService from '../services/user.service.js';
import * as sanityController from '../controllers/sanity.controller.js';

const router = express.Router();

// CORS, body parsing, and authentication are handled globally in server.ts.

// Initialize Passport for this route's session-less strategy
initializePassport(
	passport,
	userService.getUserByEmail,
	userService.getUserById,
	userService.getUserByGithub
);

// --- Route Definition with Specific Authentication ---

/**
 * @route   POST /api/sanity/test/:repoID/:groupID
 * @desc    Run a sanity test for a specific group (requires authentication)
 * @access  Private (Machine-to-Machine via specific passport strategy)
 */
router.post(
	'/test/:repoID/:groupID',
	// Apply the 'normal-local' strategy *without* session support for this route
	(req: Request, res: Response, next: NextFunction) => {
		passport.authenticate('normal-local', { session: false }, (err: any, user: any, info: any) => {
			if (err)  return next(err); 
			if (!user) 
			// Authentication failed
				return res.status(401).json({ error: info?.message || 'Authentication failed' });
            
			// Manually attach user to request if needed by the controller
			req.user = user;
			next(); // Proceed to the controller
		})(req, res, next);
	},
	// If authentication passes, proceed to the controller
	sanityController.runSanityTest
);

export default router;