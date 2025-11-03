import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import passport from 'passport'; // Import passport
import initializePassport from '../passport-config'; // Import your initialization
import * as userService from '../services/user.service'; // Import user service for passport init
import * as sanityController from '../controllers/sanity.controller';

const router = express.Router();

// --- Initialize Passport specifically for this route's strategy ---
// This assumes your initialize function can be called safely multiple times
// or you manage passport instance appropriately.
// It requires the functions from userService.
initializePassport(
    passport,
    userService.getUserByEmail,
    userService.getUserById,
    userService.getUserByGithub // Add if github strategy is also used elsewhere non-session
);


// --- Basic Middleware (CORS, BodyParser, Headers, Logging) ---
router
    .use(cors({
        origin: [process.env.FRONTEND_URL || 'http://localhost:4200'],
        credentials: true // Important if cookies/tokens are involved
    }))
    .use(bodyParser.json({ limit: '100kb' }))
    .use(bodyParser.urlencoded({
        limit: '100kb',
        extended: true
    }))
    .use((req, res, next) => { // Standard Headers
		res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:4200'); // Adjust origin as needed
		res.header('Access-Control-Allow-Credentials', 'true');
		res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Credentials, Authorization, X-Redirect'); // Add Authorization
		next();
	})
    .use((_, __, next) => { // Simple request logging
        console.log('Time of sanity test request:', Date.now());
        next();
    });

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
            if (err) { return next(err); }
            if (!user) {
                // Authentication failed
                return res.status(401).json({ error: info?.message || 'Authentication failed' });
            }
            // Manually attach user to request if needed by the controller
            req.user = user;
            next(); // Proceed to the controller
        })(req, res, next);
    },
    // If authentication passes, proceed to the controller
    sanityController.runSanityTest
);

export default router;