import { Request, Response, NextFunction } from 'express';
import { Session, SessionData } from 'express-session';
import * as userService from '../services/user.service.js';
import { User } from '@shared/models/User.js';
import { logger } from '../logging.js';
import { AppError } from '../helpers/AppError.js';

// Define a type combining Request with Session properties for cleaner casting
type RequestWithSession = Request & { session: Session & Partial<SessionData> };

/**
 * Handles submitting a new StepType request as a GitHub issue.
 * Expects issue data in the request body.
 */
export async function submitIssue(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const { body } = req;
		const token = process.env.TESTACCOUNT_TOKEN;
		if (!token) {
			logger.error('TESTACCOUNT_TOKEN environment variable is not set.');
			throw new AppError('Server configuration error: GitHub token missing.', 500);
		}

		const response = await fetch('https://api.github.com/repos/adessoAG/Seed-Test/issues', {
			method: 'post',
			body: JSON.stringify(body),
			headers: {
				'Authorization': `token ${token}`,
				'Content-Type': 'application/json',
				'User-Agent': 'Seed-Test-Backend'
			}
		});

		if (!response.ok) {
			// Forward GitHub's error status and potentially message
			const errorData = await response.json().catch(() => ({ message: 'Failed to submit issue to GitHub' }));
			res.status(response.status).json(errorData);
		} else {
			const responseData = await response.json();
			res.status(200).json(responseData);
		}
	} catch (error) {
		next(error); // Pass error to the central handler
	}
}

/**
 * Handles disconnecting a user's GitHub account linkage.
 * Assumes user is authenticated via global middleware.
 */
export async function disconnectGithub(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const user = req.user as User; // Cast req.user to your User type
		if (!user?._id)
			throw AppError.unauthorized('User not authenticated');

		// Call the user service to handle the actual database update
		await userService.disconnectGithub(user._id);

		// Optionally clear the github part from the session user object if needed
		const reqWithSession = req as RequestWithSession; // Cast to access session
		if (reqWithSession.session && (req.user as User).github) {
			Reflect.deleteProperty(req.user as User, 'github');
			// Use callback for session saving as it might be async
			reqWithSession.session.save(err => {
				if (err) {
					logger.error(`Session save error: ${err}`);
					// Decide how to handle session save errors, maybe still send success?
					// For now, pass to error handler for consistency
					return next(err);
				}
				res.status(200).json({ message: 'GitHub account disconnected successfully.' });
			});
		} else 
		// If no session or no github property, just send success
			res.status(200).json({ message: 'GitHub account disconnected successfully.' });
        

	} catch (error) {
		next(error);
	}
}