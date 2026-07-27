import dotenv from 'dotenv';
dotenv.config(); // Load environment variables first

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { sanitize, hasDangerousKeys } from './helpers/sanitize.js';
import passport from 'passport';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import http from 'node:http';
import { execSync } from 'node:child_process';
import { chromium, firefox, webkit, BrowserType } from '@playwright/test';
import { logger } from './logging.js';

import * as dbConnector from './database/DbConnector.js';

// Import Passport configuration
import initializePassport from './passport-config.js'; 

// Import services needed for Passport initialization
import * as userService from './services/user.service.js';

// Import new TypeScript routers
import backgroundRouter from './routes/background.routes.js';
import blockRouter from './routes/block.routes.js';
import fileRouter from './routes/file.routes.js';
import githubRouter from './routes/github.routes.js';
import groupRouter from './routes/group.routes.js';
import jiraRouter from './routes/jira.routes.js';
import loggingRouter from './routes/logging.routes.js';
import playwrightRouter from './routes/playwright.routes.js';
import reportRouter from './routes/report.routes.js';
import repositoryRouter from './routes/repository.routes.js';
import sanityRouter from './routes/sanity.routes.js';
import scriptRouter from './routes/script.routes.js';
import storyRouter from './routes/story.routes.js';
import testExecutionRouter from './routes/testExecution.routes.js';
import userRouter from './routes/user.routes.js';
import workgroupRouter from './routes/workgroup.routes.js';

import * as stepTypeService from './services/step-type.service.js';
import * as aiService from './services/ai.service.js';

// Import logging middleware
import { httpLog } from './logging.js';

// Initialize Passport
initializePassport(
	passport,
	userService.getUserByEmail,
	userService.getUserById,
	userService.getUserByGithub
);

const app: Application = express();

// --- Security Middleware ---
// Helmet sets HTTP security headers (CSP, HSTS, X-Frame-Options, etc.)
app.use(helmet());

// --- Session Configuration ---
const databaseUri = process.env.DATABASE_URI;
if (!databaseUri)
	logger.warn('DATABASE_URI not set. Using Docker default. Set DATABASE_URI in .env for production!');

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret && process.env.NODE_ENV === 'production')
	throw new Error('SESSION_SECRET must be set in production. Aborting.');

const sessionConfig: session.SessionOptions = {
	store: MongoStore.create({
		mongoUrl: databaseUri || 'mongodb://SeedAdmin:SeedTest@seedmongodb:27017',
		dbName: 'Seed',
		collectionName: 'Sessions'
	}),
	secret: sessionSecret || 'dev-only-secret-not-for-production',
	resave: false,
	saveUninitialized: false,
	proxy: true,
	cookie: {
		secure: process.env.NODE_ENV === 'production',
		httpOnly: true,
		// 'lax' prevents CSRF while allowing normal navigation; 'none' only for explicit cross-origin setups
		sameSite: process.env.COOKIE_SAMESITE === 'none' ? 'none' : 'lax',
		maxAge: 24 * 60 * 60 * 1000 // 1 day
	}
};

// Trust first proxy if running behind one (e.g., Nginx, Heroku)
if (process.env.NODE_ENV === 'production') 
	app.set('trust proxy', 1); 


// --- Core Middleware ---
app.use(cors({
	origin: [
		process.env.FRONTEND_URL || 'http://localhost:4200'
	],
	credentials: true
}));
app.use(express.json({ limit: '500kb' }));
app.use(express.urlencoded({ limit: '500kb', extended: true }));
// Sanitize request data against MongoDB operator injection ($gt, $ne, etc.)
// Express 5 makes req.query a read-only getter, so we sanitize body/params in place
// and reject requests with dangerous operators in query strings.
app.use((req: Request, res: Response, next: NextFunction) => {
	if (req.body) sanitize(req.body);
	if (req.params) sanitize(req.params);
	if (hasDangerousKeys(req.query)) {
		res.status(400).json({ error: 'Invalid query parameters' });
		return;
	}
	next();
});
app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());
app.use(httpLog);

// --- Central Authentication Middleware ---
/**
 * Middleware to check if the user is authenticated.
 * If not authenticated, it sends a 401 Unauthorized response.
 */
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
	if (req.isAuthenticated()) 
		return next();
    
	logger.warn(`Authentication check failed for: ${req.method} ${req.originalUrl}`);
	res.status(401).json({ error: 'Unauthorized: Please log in.' });
};

// --- Rate Limiting ---
// Protects auth endpoints against brute-force attacks
const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 20, // max 20 attempts per window
	standardHeaders: true,
	legacyHeaders: false,
	message: { error: 'Too many requests. Please try again later.' }
});

// --- API Routes ---

// Public routes
app.get('/api/health', (_, res) => res.status(200).send('OK'));
app.get('/api/ai/available', async (_, res) => {
	const available = await aiService.isAiParserAvailable();
	res.json({ available });
});
app.get('/api', (_, res) => res.sendFile('htmlresponse/apistandartresponse.html', { root: import.meta.dirname }));
app.use('/api/log', loggingRouter);
// Rate-limit auth endpoints (login, register, password reset)
app.use('/api/user', authLimiter, userRouter);
app.use('/api/playwright', playwrightRouter);


// Protected routes (require authentication via isAuthenticated middleware)
app.get('/api/stepTypes', isAuthenticated, async (_, res, next) => {
	try {
		const result = await stepTypeService.showSteptypes();
		res.status(200).json(result);
	} catch (error) {
		next(error); // Pass error to central handler
	}
});
app.use('/api/repository', isAuthenticated, repositoryRouter);
app.use('/api/story', isAuthenticated, storyRouter);
app.use('/api/block', isAuthenticated, blockRouter);
app.use('/api/group', isAuthenticated, groupRouter);
app.use('/api/workgroup', isAuthenticated, workgroupRouter);
app.use('/api/files', isAuthenticated, fileRouter);
app.use('/api/jira', isAuthenticated, jiraRouter); // Contains linking which needs auth
app.use('/api/github', isAuthenticated, githubRouter); // Contains linking/disconnect which needs auth
app.use('/api/script', isAuthenticated, scriptRouter); // Script execution needs auth
app.use('/api/execute', isAuthenticated, testExecutionRouter); // Test execution needs auth
app.use('/api/report', isAuthenticated, reportRouter); // Report management needs auth
app.use('/api/background', isAuthenticated, backgroundRouter);
app.use('/api/sanity', isAuthenticated, sanityRouter);

// --- Central Error Handling Middleware ---
// This MUST be the last middleware added
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
	// Guard: don't attempt to send if response already started (e.g. post-response errors)
	if (res.headersSent) {
		logger.error(`Error after response sent (suppressed): ${err.message}`);
		return;
	}

	// AppError carries an explicit status code; everything else is an unexpected 500
	const statusCode = 'statusCode' in err && typeof (err as any).statusCode === 'number'
		? (err as any).statusCode
		: 500;

	// Only log stack traces for unexpected errors, not operational ones
	if (statusCode === 500)
		logger.error(`Unexpected error: ${err.stack}`);
	else
		logger.warn(`Operational error [${statusCode}]: ${err.message}`);

	res.status(statusCode).json({
		error: statusCode === 500 ? 'Internal Server Error' : err.message
	});
});

async function checkAndInstallEdge() {
	try {
		const edgeBrowser = await chromium.launch({ channel: 'msedge' });
		await edgeBrowser.close();
		logger.info('Microsoft Edge is available');
	} catch (error: any) {
		try {
			logger.warn(`${error.message} — Microsoft Edge is not launchable, trying to install...`);
			execSync('npx playwright install msedge --with-deps', { stdio: 'inherit' });
		} catch (edge_error: any) {
			logger.error(`Microsoft Edge not launchable nor installable (corporate policies?): ${edge_error.message}`);
		}
	}
}

async function checkAndInstallGeneralBrowsers() {
	const browsers: { engine: BrowserType; name: string }[] = [
		{ engine: firefox, name: 'Firefox' },
		{ engine: chromium, name: 'Chromium' },
		{ engine: webkit, name: 'WebKit' }
	];

	try {
		for (const browser of browsers) {
			const instance = await browser.engine.launch();
			await instance.close();
			logger.info(`${browser.name} is available`);
		}
	} catch (error: any) {
		if (error.message.includes('Executable doesn') || 
            error.message.includes('Browser version')) {
			logger.warn('Browser version incompatible or executable missing, reinstalling browsers...');
			execSync('npx playwright install chromium firefox webkit --with-deps', { stdio: 'inherit' });
		} else if (error.message.includes('browserType.launch')) {
			logger.warn('Installing missing Playwright browsers...');
			execSync('npx playwright install chromium firefox webkit --with-deps', { stdio: 'inherit' });
		} else 
			logger.error(`Unexpected error during browser check: ${error.message}`);
        
	}
}

// --- Server Startup ---
const port = process.env.PORT || 8080;
const server = http.createServer(app);

async function startServer() {
	try {
		logger.info('Checking general browser availability...');
		await Promise.all([
			checkAndInstallGeneralBrowsers(),
			checkAndInstallEdge()
		]);
		logger.info('Browser check complete.');
		logger.info('Connecting to database...');
        
		await dbConnector.establishConnection();
		logger.info('Database connection established successfully.');
        
		server.listen(port, () => {
			logger.info(`App now running on port: ${port}`);
		});
		server.setTimeout(600000); // 10 minutes timeout
	} catch (error) {
		logger.error('Failed to start server:', error);
		process.exit(1);
	}
}

// --- Process-Level Error Handlers ---
// Catch unhandled promise rejections (e.g. forgotten awaits, uncaught async errors)
process.on('unhandledRejection', (reason: unknown) => {
	logger.error('Unhandled Rejection:', reason);
	// Let the process continue — Express will handle per-request errors
});

// Catch truly unexpected synchronous errors — log and exit, as state may be corrupted
process.on('uncaughtException', (error: Error) => {
	logger.error(`Uncaught Exception — shutting down: ${error.stack}`);
	server.close(() => process.exit(1));
});

startServer();

// Export app for potential testing
export { app };