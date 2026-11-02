import express, { type Application, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { sanitize, hasDangerousKeys } from './helpers/sanitize.js';
import passport from 'passport';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { chromium, firefox, webkit, type BrowserType } from '@playwright/test';
import { logger, httpLog } from './logging.js';
import { isAuthenticated } from './middleware/authenticate.js';
import { errorHandler } from './middleware/errorHandler.js';
import { ensureFeaturesDirectory } from './helpers/featuresDirectory.js';

import * as dbConnector from './database/DbConnector.js';
import { validateConfig, validatedConfig } from './config.js';

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

// Initialize Passport
initializePassport(
	passport,
	userService.getUserByEmail,
	userService.getUserById
);

const app: Application = express();

// --- Security Middleware ---
// Helmet sets HTTP security headers (CSP, HSTS, X-Frame-Options, etc.)
app.use(helmet());

// --- Session Configuration ---
// Env vars validated at startup via validateConfig() in startServer().
// Module-level sessionConfig uses validated values (set during startup init).

/**
 * Returns the validated DATABASE_URI and fails closed when it is missing.
 * There is deliberately no built-in fallback connection string: a literal with credentials in source
 * would silently connect to a hard-coded database whenever the environment is misconfigured.
 * @throws Error when DATABASE_URI is not set (validateConfig() normally exits the process first).
 */
function requireDatabaseUri(): string {
	const uri = validatedConfig.value?.DATABASE_URI;
	if (!uri)
		throw new Error('DATABASE_URI is not set. Refusing to start without a database connection string.');
	return uri;
}

const isProduction = process.env.NODE_ENV === 'production';

const sessionConfig: session.SessionOptions = {
	store: MongoStore.create({
		mongoUrl: requireDatabaseUri(),
		dbName: 'Seed',
		collectionName: userService.SESSION_COLLECTION
	}),
	// validateConfig() requires SESSION_SECRET unless NODE_ENV is development or test. In that opt-in a random
	// per-process secret is used: sessions do not survive a restart, but there is no guessable literal.
	secret: validatedConfig.value?.SESSION_SECRET ?? randomBytes(32).toString('hex'),
	resave: false,
	saveUninitialized: false,
	proxy: true,
	cookie: {
		// COOKIE_SECURE=false is the opt-out for plain-HTTP setups (local docker compose); leave it unset behind HTTPS
		secure: validatedConfig.value?.COOKIE_SECURE ?? isProduction,
		httpOnly: true,
		// 'lax' prevents CSRF while allowing normal navigation; 'none' only for explicit cross-origin setups
		sameSite: process.env.COOKIE_SAMESITE === 'none' ? 'none' : 'lax',
		maxAge: 24 * 60 * 60 * 1000 // 1 day
	}
};

// Trust first proxy if running behind one (e.g., Nginx, Heroku). TRUST_PROXY=false for a directly exposed port:
// otherwise req.ip comes from the client-sent X-Forwarded-For and the per-IP rate limits can be bypassed.
if (validatedConfig.value?.TRUST_PROXY ?? isProduction)
	app.set('trust proxy', 1);


// --- Core Middleware ---
app.use((cors as unknown as (options: Record<string, unknown>) => express.RequestHandler)({
	origin: [
		process.env.FRONTEND_URL ?? 'http://localhost:4200'
	],
	credentials: true
}));
app.use(express.json({ limit: '500kb' }));
app.use(express.urlencoded({ limit: '500kb', extended: true }));
// Sanitize request data against MongoDB operator injection ($gt, $ne, etc.)
// Express 5 makes req.query a read-only getter, so we sanitize body/params in place
// and reject requests with dangerous operators in query strings.
app.use((req: Request, res: Response, next: NextFunction) => {
	sanitize(req.body);
	sanitize(req.params);
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

// Authentication middleware imported from ./middleware/authenticate.ts

// --- Rate Limiting ---

const globalLimiter = rateLimit({
	windowMs: 60 * 1000, // 1 minute
	max: 500, // 500 req/min/IP — generous for project setup (~70 page-loads at 7 calls each)
	standardHeaders: true,
	legacyHeaders: false,
	message: { error: 'Too many requests, please try again later.' },
	validate: { ip: false }
});

const logLimiter = rateLimit({
	windowMs: 60 * 1000, // 1 minute
	max: 60, // 60 log messages per minute per IP
	standardHeaders: true,
	legacyHeaders: false,
	message: { error: 'Too many log requests.' },
	validate: { ip: false }
});

// --- API Routes ---

// Apply global rate limit to all API routes (auth routes have additional stricter limiters)
app.use('/api', globalLimiter);

// Public routes
app.get('/api/health', (_, res) => res.status(200).send('OK'));
app.get('/api/ai/available', async (_, res) => {
	const available = await aiService.isAiParserAvailable();
	res.json({ available });
});
app.get('/api', (_, res) => res.sendFile('htmlresponse/apistandartresponse.html', { root: import.meta.dirname }));
app.use('/api/log', logLimiter, loggingRouter);
// Auth rate limiting is applied per-route in user.routes.ts (login, register, reset only)
app.use('/api/user', userRouter);
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
app.use(errorHandler);

type BrowserCheckResult = { name: string; status: 'ok' | 'failed' };

// Browsers are installed at image build time (backend/Dockerfile) or by the backend postinstall script.
// Startup only checks them: installing here blocked startup for over a minute and needed network access.
async function checkBrowser(name: string, launch: () => ReturnType<BrowserType['launch']>): Promise<BrowserCheckResult> {
	try {
		const instance = await launch();
		await instance.close();
		return { name, status: 'ok' };
	} catch {
		return { name, status: 'failed' };
	}
}

async function checkBrowsers(): Promise<BrowserCheckResult[]> {
	return Promise.all([
		checkBrowser('Firefox', () => firefox.launch()),
		checkBrowser('Chromium', () => chromium.launch()),
		checkBrowser('WebKit', () => webkit.launch()),
		checkBrowser('Microsoft Edge', () => chromium.launch({ channel: 'msedge' }))
	]);
}

/** Prints a grouped, color-coded summary of browser availability to the console. */
function logBrowserResults(results: BrowserCheckResult[]): void {
	const g = '\x1b[32m'; const r = '\x1b[31m';
	const d = '\x1b[2m';  const b = '\x1b[1m';  const x = '\x1b[0m';

	const icon = (s: string) => s === 'ok' ? `${g}✓${x}` : `${r}✗${x}`;
	const label = (s: string) => s === 'ok' ? `${g}available${x}` : `${r}unavailable${x}`;

	const line = `${d}${'─'.repeat(38)}${x}`;
	console.log(`\n  ${b}Playwright Browser Availability${x}`);
	console.log(`  ${line}`);
	for (const result of results)
		console.log(`  ${icon(result.status)}  ${result.name.padEnd(18)} ${label(result.status)}`);
	console.log(`  ${line}\n`);

	// Plain-text summary for log files
	const summary = results.map(br => `${br.name}: ${br.status}`).join(', ');
	logger.info(`Browser check complete — ${summary}`);
	// Edge is optional: it can be blocked by corporate policies, so a missing Edge is only a hint
	if (results.some(br => br.status === 'failed'))
		logger.warn('Missing Playwright browsers. Install them in backend/ with "npx playwright install --with-deps chromium firefox webkit msedge".');
}

// --- Server Startup ---
const port = process.env.PORT ?? '8080';
const server = http.createServer(app);

async function startServer() {
	try {
		// Validate env vars: aggregated exit on failure, cached for all dependent modules
		validateConfig();

		// Story and report code writes under features/ relative to cwd; a fresh checkout does not have it yet
		ensureFeaturesDirectory();

		logger.info('Connecting to database...');
        
		await dbConnector.establishConnection();
		// Log the database connection target to help distinguish local vs Atlas
		// The DATABASE_URI is masked to show hostname + db name only (credentials stripped)
		const dbUri = requireDatabaseUri();
		const dbHost = dbUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
		logger.info(`Database connection established successfully. (${dbHost})`);
        
		server.listen(port, () => {
			logger.info(`App now running on port: ${port}`);
		});
		server.setTimeout(600000); // 10 minutes timeout

		// Browser launches can take seconds (or hang until Playwright's timeout), so they run after listen()
		void checkBrowsers().then(logBrowserResults);

		// Pre-load AI parser in the background so the first /api/ai/available call is instant
		aiService.isAiParserAvailable().catch(() => {});
	} catch (error) {
		logger.error('Failed to start server:', error);
		process.exit(1);
	}
}

// --- Process-Level Error Handlers ---
/**
 * Closes the HTTP server and database connection, then exits with code 1.
 * Used after an unhandled error because process state may be corrupted; the container
 * runtime or process manager restarts the backend.
 */
function shutdownAfterFatalError(): void {
	server.close(() => {
		dbConnector.closeConnection()
			.catch(() => {})
			.finally(() => process.exit(1));
	});
	// Force exit if open keep-alive connections stall server.close()
	setTimeout(() => process.exit(1), 10_000).unref();
}

// Catch unhandled promise rejections (e.g. forgotten awaits, uncaught async errors) — log and exit
process.on('unhandledRejection', (reason: unknown) => {
	logger.error('Unhandled Rejection — shutting down:', reason);
	shutdownAfterFatalError();
});

// Catch truly unexpected synchronous errors — log and exit, as state may be corrupted
process.on('uncaughtException', (error: Error) => {
	logger.error(`Uncaught Exception — shutting down: ${error.stack}`);
	shutdownAfterFatalError();
});

// --- Graceful Shutdown ---
// On SIGTERM/SIGINT, close open connections before exiting to avoid data corruption
function gracefulShutdown(signal: string) {
	logger.info(`${signal} received — shutting down gracefully…`);
	server.close(() => {
		dbConnector.closeConnection()
			.then(() => {
				logger.info('Database connection closed. Exiting.');
				process.exit(0);
			})
			.catch((err) => {
				logger.error('Error during shutdown:', err);
				process.exit(1);
			});
	});
	// Force exit after 10 seconds if graceful shutdown stalls
	const forceTimer = setTimeout(() => {
		logger.error('Graceful shutdown timed out — forcing exit');
		process.exit(1);
	}, 10_000);
	forceTimer.unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

void startServer();

// Export app for potential testing
export { app };