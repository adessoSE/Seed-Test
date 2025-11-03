import dotenv from 'dotenv';
dotenv.config(); // Load environment variables first

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import passport from 'passport';
import flash from 'express-flash';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import http from 'http'; // Import http module

import * as dbConnector from './database/DbConnector';

// Import Passport configuration
import initializePassport from './passport-config'; 

// Import services needed for Passport initialization
import * as userService from './services/user.service';

// Import new TypeScript routers
import backgroundRouter from './routes/background.routes';
import blockRouter from './routes/block.routes';
import fileRouter from './routes/file.routes';
import githubRouter from './routes/github.routes';
import groupRouter from './routes/group.routes';
import jiraRouter from './routes/jira.routes';
import loggingRouter from './routes/logging.routes';
import playwrightRouter from './routes/playwright.routes';
import reportRouter from './routes/report.routes';
import repositoryRouter from './routes/repository.routes';
import sanityRouter from './routes/sanity.routes';
import scriptRouter from './routes/script.routes';
import storyRouter from './routes/story.routes';
import testExecutionRouter from './routes/testExecution.routes';
import userRouter from './routes/user.routes';
import workgroupRouter from './routes/workgroup.routes';

import * as stepTypeService from './services/step-type.service';

// Import logging middleware
import { httpLog } from './logging';

// Initialize Passport
initializePassport(
    passport,
    userService.getUserByEmail,
    userService.getUserById,
    userService.getUserByGithub
);

const app: Application = express();
app.disable('x-powered-by');

// --- Session Configuration ---
const sessionConfig: session.SessionOptions = {
    store: MongoStore.create({
        mongoUrl: process.env.DATABASE_URI || 'mongodb://SeedAdmin:SeedTest@seedmongodb:27017',
        dbName: 'Seed',
        collectionName: 'Sessions',
    }),
    secret: process.env.SESSION_SECRET || 'unsaveSecret',
    resave: false,
    saveUninitialized: false,
    proxy: true, // Important if behind a reverse proxy (like Nginx)
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production (HTTPS needed!)
        httpOnly: true, // Prevent client-side script access
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for cross-site, 'lax' for same-site
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
};

// Trust first proxy if running behind one (e.g., Nginx, Heroku)
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1); 
}

// --- Core Middleware ---
app.use(cors({
    origin: [
        process.env.FRONTEND_URL || 'http://localhost:4200'
    ],
    credentials: true
}));
app.use(bodyParser.json({ limit: '500kb' })); // Adjust limits as needed
app.use(bodyParser.urlencoded({ limit: '500kb', extended: true }));
app.use(flash());
app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());
app.use(httpLog); // Add request logging

// --- Central Authentication Middleware ---
/**
 * Middleware to check if the user is authenticated.
 * If not authenticated, it sends a 401 Unauthorized response.
 */
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
        return next();
    }
    console.log('Authentication check failed for:', req.method, req.originalUrl);
    res.status(401).json({ error: 'Unauthorized: Please log in.' });
};

// --- API Routes ---

// Public routes (authentication handled within specific controllers/passport strategies if needed)
app.get('/api/health', (_, res) => res.status(200).send('OK'));
app.get('/api', (_, res) => res.sendFile('htmlresponse/apistandartresponse.html', { root: __dirname }));
app.use('/api/log', loggingRouter); // Frontend logging
app.use('/api/user', userRouter); // Contains login, register, password reset, callback which are public
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
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error("Central Error Handler caught:", err.stack); 
    
    // You could add more specific error handling here based on error type if needed
    
    res.status(500).json({ 
        error: 'Internal Server Error', 
        // message: err.message // Optional: Send message in dev, hide in prod
    });
});

// --- Server Startup ---
const port = process.env.PORT || 8080;
const server = http.createServer(app);

async function startServer() {
    try {
        console.log('Connecting to database...');
        
        await dbConnector.establishConnection();
        console.log('\x1b[32mDatabase connection established successfully.\x1b[0m');
        
        server.listen(port, () => {
            console.log(`App now running on port: ${port}`);
        });
        server.setTimeout(600000); // 10 minutes timeout
    } catch (error) {
        console.error('\x1b[31mFailed to start server:\x1b[0m', error);
        process.exit(1);
    }
}

startServer();

// Export app for potential testing
export { app };