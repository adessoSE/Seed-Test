import { type Request, type Response, type NextFunction } from 'express';
import passport from 'passport';
import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { type User } from '@shared/models/User.js';
import * as userService from '../services/user.service.js';
import * as nodeMail from '../nodemailer.js';
import { type Session, type SessionData } from 'express-session';
import { logger } from '../logging.js';
import { AppError } from '../helpers/AppError.js';
import { sanitizeUser } from '../helpers/userSanitize.js';
import { validatedConfig, requireGithub } from '../config.js';

const saltRounds = 10;

// Define a type combining Request with Session properties
type RequestWithSession = Request & { session: Session & Partial<SessionData> };

// --- Password Reset ---

/**
 * Initiates a password reset request for a user.
 */
export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const email = (req.body as Record<string, string>).email.toLowerCase();
        
		// Delete any existing request
		const checkRequest = await userService.getResetRequestByEmail(email);
		if (checkRequest) 
			await userService.deleteRequest(email);
        

		const user = await userService.getUserByEmail(email);
		if (user) {
			const id = randomUUID();
			await userService.createResetRequest({
				createdAt: new Date(),
				uuid: id,
				email: user.email
			});
            
			await nodeMail.sendResetLink(user.email, id);
			res.status(200).json({ message: 'Reset link sent' });
		} else
			throw AppError.notFound('No user found with that email address');
        
	} catch (error) {
		next(error);
	}
}

/**
 * Resets a user's password using a valid UUID.
 */
export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const body = req.body as Record<string, unknown>;
		const uuid = body.uuid as string;
		const password = body.password as string;
		const thisRequest = await userService.getResetRequest(uuid);

		if (thisRequest) {
			const user = await userService.getUserByEmail(thisRequest.email);
			if (!user)
				throw AppError.notFound('User not found');

			user.password = await bcrypt.hash(password, saltRounds);
			user.transitioned = true; // Mark as new hash
            
			await userService.updateUser(user._id, user);
			await userService.deleteRequest(user.email);
            
			res.status(204).send(); // 204 No Content
		} else
			throw AppError.unauthorized('Invalid or expired reset token');
        
	} catch (error) {
		next(error);
	}
}

// --- Authentication ---

/**
 * Handles local user login.
 */
export function login(req: Request, res: Response, next: NextFunction): void {
	const reqBody = req.body as Record<string, unknown>;
	reqBody.email = (reqBody.email as string).toLowerCase();

	// Cast return of passport.authenticate to avoid unsafe call error
	const authenticateMiddleware = passport.authenticate('normal-local', {}, (error: unknown, user: User | false, info: { message?: string } | undefined) => {
		if (error) return next(error);
		if (!user)
			return next(AppError.unauthorized(info?.message ?? 'Authentication failed'));

		// Session fixation prevention — regenerate before establishing new identity
		(req as RequestWithSession).session.regenerate((regenerateErr) => {
			if (regenerateErr) return next(regenerateErr);

			// Set extended session lifetime after regeneration so the new session inherits it
			if (reqBody.stayLoggedIn)
				(req as RequestWithSession).session.cookie.maxAge = 864000000; // 10 days

			req.logIn(user, (loginErr) => {
				if (loginErr) return next(loginErr);

				// Handle password hash transition if needed
				void (async () => {
					if (user.transitioned === false)
						try {
							const hashedPass = await bcrypt.hash(reqBody.password as string, saltRounds);
							user.password = hashedPass;
							user.transitioned = true;
							await userService.updateUser(user._id, user);
						} catch (hashError) {
							return next(hashError);
						}
 
					res.json(sanitizeUser(user));
				})();


			});
		});
	}) as (req: Request, res: Response, next: NextFunction) => void;
	authenticateMiddleware(req, res, next);
}

/**
 * Handles user registration.
 */
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const body = req.body as Record<string, unknown>;
		if (!body.email || !body.password)
			throw AppError.badRequest('Email and password are required.');

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(body.email as string))
			throw AppError.badRequest('Invalid email format.');
		body.email = (body.email as string).toLowerCase();
		body.password = await bcrypt.hash(body.password as string, saltRounds);
		body.transitioned = true;
		// Remap userId (frontend field name) → _id (service field name) for GitHub account merge
		if (body.userId) {
			body._id = body.userId;
			delete body.userId;
		}

		const result = await userService.registerUser(req.body as Partial<User>);
		res.status(201).json({ insertedId: result.insertedId });
	} catch (error: unknown) {
		if (error instanceof Error && error.message === 'User already exists')
			throw AppError.conflict(error.message);

		next(error);
	}
}

/**
 * Handles user logout.
 */
export function logout(req: Request, res: Response, next: NextFunction): void {
	req.logout((err) => {
		if (err) return next(err); 
		res.clearCookie('connect.sid', { path: '/' });
		res.status(200).json({ message: 'Logged out' });
	});
}

// --- GitHub Authentication ---

/**
 * Handles GitHub login/registration after OAuth redirect.
 * This logic is migrated from userManagement.ts helper.
 */
export async function githubCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
	const TOKEN_URL = 'https://github.com/login/oauth/access_token';
	const params = new URLSearchParams();

	// Require GitHub OAuth vars — throws 501 if not configured
	requireGithub(validatedConfig.value);

	params.append('client_id', validatedConfig.value!.GITHUB_CLIENT_ID!);
	params.append('client_secret', validatedConfig.value!.GITHUB_CLIENT_SECRET!);
	params.append('code', req.query.code as string);

	try {
		const tokenResponse = await fetch(TOKEN_URL, { method: 'POST', body: params });
		const tokenText = await tokenResponse.text();
		const tokenData = new URLSearchParams(tokenText);
        
		const accessToken = tokenData.get('access_token');
		if (!accessToken)
			throw AppError.badGateway(tokenData.get('error') ?? 'Failed to get access token');
        
		// Now get user data from GitHub
		const userResponse = await fetch('https://api.github.com/user', {
			headers: { Authorization: `token ${accessToken}` }
		});
		if (!userResponse.ok) throw AppError.badGateway('Failed to get user data from GitHub');
        
		const githubProfile = await userResponse.json() as { login: string; id: number; githubToken?: string; [key: string]: unknown };
		githubProfile.githubToken = accessToken;

		// Find or register this user in our DB
		const user = await userService.findOrRegisterGithub(githubProfile as { login: string; id: number; githubToken: string });
        
		if (!user)
			throw new AppError('Failed to register or find GitHub user', 500);

		// Session fixation prevention — regenerate before establishing new identity
		(req as RequestWithSession).session.regenerate((regenerateErr) => {
			if (regenerateErr) return next(regenerateErr);
			req.logIn(user, (loginErr) => {
				if (loginErr) return next(loginErr);
				res.status(200).json({
					...sanitizeUser(user),
					login: user.github?.login,
					id: user.github?.id
				});
			});
		});

	} catch (error) {
		next(error);
	}
}

/**
 * Handles GitHub user login via passport github-local strategy.
 */
export function githubLogin(req: Request, res: Response, next: NextFunction): void {
	const authenticateMiddleware = passport.authenticate('github-local', {}, (error: unknown, user: User | false, info: { message?: string } | undefined) => {
		if (error) return next(error);
		if (!user)
			return next(AppError.unauthorized(info?.message ?? 'GitHub authentication failed'));

		(req as RequestWithSession).session.regenerate((regenerateErr) => {
			if (regenerateErr) return next(regenerateErr);

			req.logIn(user, (loginErr) => {
				if (loginErr) return next(loginErr);
				res.status(200).json({
					...sanitizeUser(user),
					login: user.github?.login,
					id: user.github?.id
				});
			});
		});
	}) as (req: Request, res: Response, next: NextFunction) => void;
	authenticateMiddleware(req, res, next);
}

/**
 * Handles GitHub user registration.
 */
export async function githubRegister(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const body = req.body as { login: string; id: number; avatar_url?: string; email?: string; name?: string; githubToken?: string };
		const profile = {
			...body,
			githubToken: body.githubToken ?? ''
		};
		const user = await userService.findOrRegisterGithub(profile);
		if (!user)
			throw AppError.badRequest('Could not register GitHub user');

		(req as RequestWithSession).session.regenerate((regenerateErr) => {
			if (regenerateErr) return next(regenerateErr);

			req.logIn(user, (loginErr) => {
				if (loginErr) return next(loginErr);
				res.status(200).json({
					...sanitizeUser(user),
					login: user.github?.login,
					id: user.github?.id
				});
			});
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Merges a GitHub-only account with a Seed-Test account.
 */
export async function mergeGithub(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const body = req.body as Record<string, unknown>;
		const userId = body.userId as string;
		const login = body.login as string;
		const id = body.id as number;
		const user = req.user as User | undefined;

		// Ensure the logged-in user is the one making the request
		if (user?._id!.toString() !== userId)
			throw AppError.forbidden('Forbidden: You can only merge your own account');

		const mergedUser = await userService.mergeGithub(userId, login, id);
        
		// Session fixation prevention — regenerate before establishing new identity
		(req as RequestWithSession).session.regenerate((regenerateErr) => {
			if (regenerateErr) return next(regenerateErr);
			req.logIn(mergedUser, (loginErr) => {
				if (loginErr) return next(loginErr);
				res.status(200).json({ message: 'GitHub account merged' });
			});
		});
	} catch (error) {
		next(error);
	}
}

// --- User Management ---

/**
 * Gets the currently logged-in user's data.
 */
export function getUser(req: Request, res: Response, _next: NextFunction): void {
	if (req.user)
		res.status(200).json(sanitizeUser(req.user as User));
	else
		throw AppError.unauthorized('Not authenticated');
}

/**
 * Deletes the currently logged-in user's account.
 */
export async function deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const user = req.user as User | undefined;
		if (!user)
			throw AppError.unauthorized('Not authenticated');
        
		await userService.deleteUser(user._id!);
        
		req.logout((err) => {
			if (err) logger.error(`Error during logout after user deletion: ${err}`);
			res.clearCookie('connect.sid', { path: '/' });
			res.status(200).json({ message: 'User deleted successfully' });
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Updates user data (e.g., password change from profile).
 * Only the password field is mutable via this endpoint — sensitive fields
 * (email, github, jira) are always taken from the authenticated session user.
 */
export async function updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const { userID } = req.params;
		const user = req.user as User | undefined;
         
		if (user?._id!.toString() !== userID)
			throw AppError.forbidden('Forbidden: You can only update your own profile');
        
		const updateData = req.body as Partial<User>;

		// Only re-hash when the submitted password actually differs from the stored one
		if (updateData.password && updateData.password !== user!.password) 
			updateData.password = await bcrypt.hash(updateData.password, saltRounds);
		else
			// Keep the existing password when unchanged or absent
			updateData.password = user!.password;
        
		// Merge update into authenticated user — sensitive fields from session take precedence
		const updatedUser: User = { ...user!, password: updateData.password };
		await userService.updateUser(userID, updatedUser);
		res.status(200).json(sanitizeUser(updatedUser));
	} catch (error) {
		next(error);
	}
}