import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import passport from 'passport';
import initializePassport from '../passport-config'; // Assuming path is correct
import * as userService from '../services/user.service'; // Needed for passport init
import * as scriptController from '../controllers/script.controller';
import { Session, SessionData } from 'express-session'; // Import Session types

const router = express.Router();

// Initialize Passport for this router's specific needs (session-based)
initializePassport(
    passport,
    userService.getUserByEmail,
    userService.getUserById,
    userService.getUserByGithub
);

// Define a type combining Request with Session properties
type RequestWithSession = Request & { session: Session & Partial<SessionData> };

// --- Basic Middleware (CORS, BodyParser, Headers, Logging) ---
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
    .use((req, res, next) => { // Standard Headers
		res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:4200');
		res.header('Access-Control-Allow-Credentials', 'true');
		res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Credentials, Authorization, X-Redirect');
		next();
	})
    .use((_, __, next) => { // Simple request logging
        console.log('Time of script execution request:', Date.now());
        next();
    });

// --- Custom Authentication Middleware for Script Routes ---
// This middleware handles the specific passport login flow for these routes.
const authenticateAndProceed = (controllerFunction: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        // 1. Set session duration if requested
        if (req.body.stayLoggedIn) {
            (req as RequestWithSession).session.cookie.maxAge = 86400000; // 10 days
        }
        if (req.body.email) {
            req.body.email = req.body.email.toLowerCase();
        }

        // 2. Authenticate using passport.authenticate with a custom callback
        passport.authenticate('normal-local', (error: any, user: any, info: any) => {
            if (error) {
                return next(error); // Pass errors to central handler
            }
            if (!user) {
                // Send specific authentication failure message
                return res.status(401).json({ status: 'error', message: info?.message || 'Authentication failed' });
            }

            // 3. Manually log the user in (establishes session)
            req.logIn(user, async (loginErr) => {
                if (loginErr) {
                    return next(loginErr);
                }
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