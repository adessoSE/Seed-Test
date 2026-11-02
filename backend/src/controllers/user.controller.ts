import { type Request, type Response, type NextFunction } from 'express';
import passport from 'passport';
import bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'node:crypto';
import { type User } from '@seed-test/shared/models/User.js';
import * as userService from '../services/user.service.js';
import * as nodeMail from '../nodemailer.js';
import { logger } from '../logging.js';
import { AppError } from '../helpers/AppError.js';
import { sanitizeUser } from '../helpers/userSanitize.js';
import { stateMatches } from '../helpers/stateMatches.js';
import { validatedConfig, requireGithub } from '../config.js';

const saltRounds = 10;

// Same body for registered and unknown emails — the endpoint must not reveal which emails have accounts
const GENERIC_RESET_MESSAGE = 'If an account exists for this email, a reset link has been sent';

// --- Password Reset ---

/**
 * Initiates a password reset request for a user.
 * Always answers 200 with the same body, whether or not the email is registered. A reset link is
 * created and mailed only for registered emails, and the mail is not awaited so that SMTP latency
 * cannot reveal account existence either.
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

			nodeMail.sendResetLink(user.email, id)
				.catch((mailError: unknown) => logger.error(`Failed to send password reset link: ${String(mailError)}`));
		}

		res.status(200).json({ message: GENERIC_RESET_MESSAGE });
	} catch (error) {
		next(error);
	}
}

/**
 * Resets a user's password using a valid UUID.
 * Tokens past their lifetime (see userService.isResetRequestExpired) are rejected and removed, so a leaked link has a limited lifetime.
 */
export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const body = req.body as Record<string, unknown>;
		const uuid = body.uuid as string;
		const password = body.password as string;
		const thisRequest = await userService.getResetRequest(uuid);

		if (!thisRequest)
			throw AppError.unauthorized('Invalid or expired reset token');

		// The TTL decision lives in the service so that it is tested in one place
		if (userService.isResetRequestExpired(thisRequest.createdAt)) {
			await userService.deleteRequest(thisRequest.email);
			throw AppError.unauthorized('Invalid or expired reset token');
		}

		const user = await userService.getUserByEmail(thisRequest.email);
		if (!user)
			throw AppError.notFound('User not found');

		const hashed = await bcrypt.hash(password, saltRounds);
		await userService.updateUser(user._id, { password: hashed, transitioned: true, hashVersion: 2 }); // Mark as new hash
		// Stolen sessions must not survive a reset. If this throws, the reset request is kept so the user can retry the link.
		await userService.deleteUserSessions(user._id!);
		await userService.deleteRequest(user.email);

		res.status(204).send(); // 204 No Content
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
	const authenticateMiddleware = passport.authenticate('normal-local', {}, (error: unknown, user: User | false, info: { message?: string; code?: string } | undefined) => {
		if (error) return next(error);
		if (!user)
			// CASE: legacy account — the code lets the frontend retry once with the plaintext password. It travels in
			// AppError data because the error middleware forwards only error and data. Other failures carry no code.
			return next(AppError.unauthorized(info?.message ?? 'Authentication failed', info?.code ? { data: { code: info.code } } : undefined));

		// Session fixation prevention — regenerate before establishing new identity
		req.session.regenerate((regenerateErr) => {
			if (regenerateErr) return next(regenerateErr);

			// Set extended session lifetime after regeneration so the new session inherits it
			if (reqBody.stayLoggedIn)
				req.session.cookie.maxAge = 864000000; // 10 days

			req.logIn(user, (loginErr) => {
				if (loginErr) return next(loginErr);

				// Handle password hash transition if needed
				void (async () => {
					// Same test as passport-config (hashVersion !== 2), so both sides agree on what counts as legacy
					if (user.hashVersion !== 2)
						try {
							// A 64-hex submission is a digest, never plaintext. bcrypt alone cannot tell whether a no-version hash came from
							// plaintext or digest, so a real plaintext of exactly 64 hex chars must use password reset (accepted trade-off).
							const looksLikeDigest = /^[0-9a-f]{64}$/i.test(reqBody.password as string);
							// CASE 1: plaintext legacy retry — passport verified bcrypt(plaintext), so store bcrypt(SHA-256 hex)
							// like register and reset do. bcrypt(plaintext) would make every later digest-based login fail.
							// CASE 2: the digest matched, so the stored hash already is bcrypt(digest) — only record the version
							if (reqBody.legacyPassword === true && !looksLikeDigest) {
								const digest = createHash('sha256').update(reqBody.password as string, 'utf8').digest('hex');
								const hashedPass = await bcrypt.hash(digest, saltRounds);
								// Partial update: only the changed keys, never the session snapshot (lost-update regression)
								await userService.updateUser(user._id, { password: hashedPass, transitioned: true, hashVersion: 2 });
							} else
								await userService.updateUser(user._id, { hashVersion: 2 });
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
 * CASE 1: An authenticated GitHub-only stub (the session user was created by GitHub login and has no
 * e-mail or password) gets the e-mail and password added to itself. The target is the session user,
 * so a userId or _id in the request body is never used, and no second account is created.
 * CASE 2: Everyone else creates a new account (see userService.registerUser).
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
		// The client sends a digest, so the stored hash is bcrypt(digest) — hashVersion 2
		body.hashVersion = 2;

		const sessionUser = req.user as User | undefined;
		// CASE 1: GitHub-only stub from the session — add the login to it
		if (req.isAuthenticated() && sessionUser?._id && userService.isGithubOnlyStub(sessionUser)) {
			await userService.attachCredentialsToGithubStub(sessionUser._id, body.email as string, body.password as string);
			res.status(201).json({ insertedId: sessionUser._id });
			return;
		}

		// CASE 2: Anonymous request, or a session user that already has a login — create a new account
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
 * Issues the OAuth `state` for a GitHub login. The frontend calls this before redirecting to GitHub
 * and passes the returned value back as `state`. githubCallback accepts only the value stored here.
 * The value lives in the session cookie, so the same browser must start and finish the login.
 */
export function issueGithubState(req: Request, res: Response): void {
	const state = randomUUID();
	// Overwrites a state still pending in this session. That is acceptable: only the most recent login
	// attempt from this browser may complete, and an abandoned attempt simply stops working.
	req.session.githubOAuthState = state;
	res.status(200).json({ state });
}

/**
 * Handles GitHub login/registration after OAuth redirect.
 * This logic is migrated from userManagement.ts helper.
 *
 * The `state` parameter must match the value issued to this session by issueGithubState. Without that
 * check, an attacker could make a victim's browser complete the attacker's GitHub login (login CSRF).
 * The stored state is consumed on every attempt, so it cannot be replayed.
 */
export async function githubCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
	const TOKEN_URL = 'https://github.com/login/oauth/access_token';
	const params = new URLSearchParams();

	// Require GitHub OAuth vars — throws 501 if not configured
	requireGithub(validatedConfig.value);

	try {
		const expectedState = req.session.githubOAuthState;
		delete req.session.githubOAuthState;
		const receivedState = req.query.state;
		if (!expectedState || typeof receivedState !== 'string' || !stateMatches(expectedState, receivedState))
			throw AppError.forbidden('Invalid OAuth state. Please restart the GitHub login.');

		// Without a code there is nothing to exchange — never send GitHub an undefined value
		const code = req.query.code;
		if (typeof code !== 'string' || code === '')
			throw AppError.badRequest('Missing OAuth code');

		params.append('client_id', validatedConfig.value!.GITHUB_CLIENT_ID!);
		params.append('client_secret', validatedConfig.value!.GITHUB_CLIENT_SECRET!);
		params.append('code', code);

		const tokenResponse = await fetch(TOKEN_URL, { method: 'POST', body: params });
		const tokenText = await tokenResponse.text();
		const tokenData = new URLSearchParams(tokenText);

		const accessToken = tokenData.get('access_token');
		if (!accessToken) {
			// GitHub's error text is logged for operators but never echoed to the browser
			logger.warn(`GitHub token exchange failed: ${tokenData.get('error') ?? 'no access_token returned'}`);
			throw AppError.badGateway('Failed to get access token');
		}

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
		req.session.regenerate((regenerateErr) => {
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
 * Initiates a GitHub account merge by proving ownership of the target Seed account.
 *
 * The caller must be logged into the Seed account (S) that they intend to merge
 * a GitHub identity into. The server verifies `req.user._id === userId` and stores
 * a short-lived, server-signed merge intent token. The frontend passes this token
 * as the `state` parameter during GitHub OAuth so it survives the redirect.
 *
 * The actual merge step (mergeGithub) verifies this token, proving the user was
 * sitting on the target Seed account when the OAuth flow began. This closes the
 * account-takeover hole where a client-controlled userId could target any account.
 *
 * Returns `{ mergeToken }` — a UUID to pass as OAuth `state`.
 */
export function initiateMergeGithub(req: Request, res: Response, next: NextFunction): void {
	try {
		const { userId } = req.body as { userId: string };
		const user = req.user as User | undefined;

		// Must be authenticated to prove ownership of the target account
		if (!user?._id)
			throw AppError.unauthorized('Not authenticated');

		// Ownership proof: the session user MUST be the target account
		if (user._id.toString() !== userId)
			throw AppError.forbidden('You can only initiate a merge for your own account');

		// The service keeps one live intent per account, so repeated calls replace the earlier token
		const mergeToken = userService.createMergeIntent(userId);

		res.status(200).json({ mergeToken });
	} catch (error) {
		next(error);
	}
}

/**
 * Merges a finished GitHub-only account with the Seed account identified by the
 * merge-intent token.
 *
 * Security model: the server-signed merge-intent token (issued by
 * initiateMergeGithub after proving `req.user._id === userId`) is itself the
 * ownership proof. It is single-use, time-limited, and server-stored — an
 * attacker who intercepts it can only use it once against the intended target.
 * No client-supplied userId is trusted.
 *
 * The session user at merge time is the verified GitHub-only account (G) that
 * was authenticated via the OAuth callback. Its `github` payload is merged into
 * the Seed account (S) whose ID is stored in `intent.userId`. The session is
 * regenerated and logged in as S after the merge.
 *
 * Identity source: ONLY the session user's verified `github` payload (from the
 * OAuth callback) is trusted — client-supplied login/id are ignored.
 * Self-merges, overwrites of a different GitHub identity and data loss are refused in userService.mergeGithub.
 */
export async function mergeGithub(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const body = req.body as Record<string, unknown>;
		const token = body.mergeToken as string | undefined;
		const user = req.user as User | undefined;

		// The current session must hold a verified GitHub identity to merge —
		// otherwise there is nothing proven by OAuth to attach to the Seed account.
		const github = user?.github;
		if (!github?.id || !github.login)
			throw AppError.forbidden('No verified GitHub identity in session to merge');

		// Require and verify the merge-intent token.
		// The token was generated by initiateMergeGithub after server-side ownership
		// was proven (req.user._id === userId). The token is single-use, short-lived,
		// and server-stored — it IS the ownership proof. No client-supplied userId
		// is trusted; the merge target comes exclusively from intent.userId.
		if (!token)
			throw AppError.badRequest('Missing merge token. Call /user/mergeGithub/initiate first.');

		// The service deletes the token on every call, so it cannot be replayed even after a failed merge
		const targetUserId = userService.consumeMergeIntent(token);
		if (!targetUserId)
			throw AppError.forbidden('Invalid or expired merge token. Please re-initiate.');

		const mergedUser = await userService.mergeGithub(targetUserId, github.login, github.id);

		// Session fixation prevention — regenerate before establishing new identity
		req.session.regenerate((regenerateErr) => {
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
 * Updates the authenticated user's password while logged in.
 * Requires a matching currentPassword before applying newPassword. Sensitive
 * fields (email, github, jira) are always taken from the session user.
 */
export async function updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const { userID } = req.params;
		const user = req.user as User | undefined;

		if (user?._id!.toString() !== userID)
			throw AppError.forbidden('Forbidden: You can only update your own profile');

		// currentPassword/newPassword arrive pre-validated by updateUserSchema via validate()
		const { currentPassword, newPassword } = req.body as {
			currentPassword: string;
			newPassword: string;
		};

		// GitHub-only accounts may have no stored hash — nothing to verify against
		if (!user.password)
			throw AppError.unauthorized('No password is set on this account');

		// Security: never apply the new password unless the current one is verified
		// against the stored hash — protects against blind password overwrites
		if (!(await bcrypt.compare(currentPassword, user.password)))
			throw AppError.unauthorized('Current password is incorrect');

		const hashed = await bcrypt.hash(newPassword, saltRounds);

		// Write only the changed field. The session user is a snapshot from the start of the request,
		// so writing it back would overwrite any concurrent change to other fields (lost update).
		await userService.updateUser(userID, { password: hashed, hashVersion: 2 });
		res.status(200).json(sanitizeUser({ ...user, password: hashed }));
	} catch (error) {
		next(error);
	}
}
