import { type Request, type Response, type NextFunction } from 'express';
import * as userService from '../services/user.service.js';
import { type User } from '@seed-test/shared/models/User.js';
import { logger } from '../logging.js';
import { AppError } from '../helpers/AppError.js';

/**
 * Handles submitting a new StepType request as a GitHub issue.
 * Expects issue data in the request body.
 */
export async function submitIssue(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const { title, body: issueBody, assignees, labels, milestone } = req.body as Record<string, unknown>;
		if (!title || typeof title !== 'string')
			throw AppError.badRequest('Missing or invalid issue title');

		// Allowlist fields the frontend sends — prevents injection of unknown GitHub API fields
		const sanitizedPayload: Record<string, unknown> = { title: title.trim() };
		if (issueBody && typeof issueBody === 'string')
			sanitizedPayload.body = issueBody.trim();
		if (Array.isArray(assignees))
			sanitizedPayload.assignees = assignees.filter((a: unknown) => typeof a === 'string');
		if (Array.isArray(labels))
			sanitizedPayload.labels = labels.filter((l: unknown) => typeof l === 'string');
		if (typeof milestone === 'number')
			sanitizedPayload.milestone = milestone;

		const token = process.env.TESTACCOUNT_TOKEN;
		if (!token) {
			logger.error('TESTACCOUNT_TOKEN environment variable is not set.');
			throw new AppError('Server configuration error: GitHub token missing.', 500);
		}

		const response = await fetch('https://api.github.com/repos/adessoAG/Seed-Test/issues', {
			method: 'post',
			body: JSON.stringify(sanitizedPayload),
			headers: {
				'Authorization': `token ${token}`,
				'Content-Type': 'application/json',
				'User-Agent': 'Seed-Test-Backend'
			}
		});

		if (!response.ok) {
			// Forward GitHub's error status and potentially message
			const errorData = await (response.json() as Promise<Record<string, unknown>>).catch(() => ({ message: 'Failed to submit issue to GitHub' }));
			res.status(response.status).json(errorData);
		} else {
			const responseData = await response.json() as Record<string, unknown>;
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
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (!user?._id)
			throw AppError.unauthorized('User not authenticated');

		// Call the user service to handle the actual database update
		await userService.disconnectGithub(user._id);

		// Clear the github property from the session user object if present
		// Session github property exists — remove it, save session, then respond
		// Runtime guard — req.user.github may be absent from session
		if ((req.user as User).github) {
			Reflect.deleteProperty(req.user as User, 'github');
			// Use callback for session saving as it might be async
			req.session.save(err => {
				if (err) {
					logger.error(`Session save error: ${err}`);
					// Decide how to handle session save errors, maybe still send success?
					// For now, pass to error handler for consistency
					return next(err);
				}
				res.status(200).json({ message: 'GitHub account disconnected successfully.' });
			});
		} else
			// No session github property — no session save needed, respond immediately
			res.status(200).json({ message: 'GitHub account disconnected successfully.' });
        

	} catch (error) {
		next(error);
	}
}