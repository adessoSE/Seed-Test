import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import bcrypt from 'bcrypt';
import { v1 as uuidv1 } from 'uuid';
import { User } from '@shared/models/User';
import * as userService from '../services/user.service';
import * as nodeMail from '../nodemailer';
import { Session, SessionData } from 'express-session';

const saltRounds = 10;

// Define a type combining Request with Session properties
type RequestWithSession = Request & { session: Session & Partial<SessionData> };

// --- Password Reset ---

/**
 * Initiates a password reset request for a user.
 */
export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const email = req.body.email.toLowerCase();
        
        // Delete any existing request
        const checkRequest = await userService.getResetRequestByEmail(email);
        if (checkRequest) {
            await userService.deleteRequest(email);
        }

        const user = await userService.getUserByEmail(email);
        if (user) {
            const id = uuidv1();
            await userService.createResetRequest({
                createdAt: new Date(),
                uuid: id,
                email: user.email
            });
            
            await nodeMail.sendResetLink(user.email, id);
            res.status(200).json({ message: 'Reset link sent' });
        } else {
            res.status(404).json({ error: 'No user found with that email address' });
        }
    } catch (error) {
        next(error);
    }
}

/**
 * Resets a user's password using a valid UUID.
 */
export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { uuid, password } = req.body;
        const thisRequest = await userService.getResetRequest(uuid);

        if (thisRequest) {
            const user = await userService.getUserByEmail(thisRequest.email);
            if (!user) {
                 res.status(404).json({ error: 'User not found' });
                 return;
            }

            user.password = await bcrypt.hash(password, saltRounds);
            user.transitioned = true; // Mark as new hash
            
            await userService.updateUser(user._id, user);
            await userService.deleteRequest(user.email);
            
            res.status(204).send(); // 204 No Content
        } else {
            res.status(401).json({ error: 'Invalid or expired reset token' });
        }
    } catch (error) {
        next(error);
    }
}

// --- Authentication ---

/**
 * Handles local user login.
 */
export function login(req: Request, res: Response, next: NextFunction): void {
    if (req.body.stayLoggedIn) {
        (req as RequestWithSession).session.cookie.maxAge = 864000000; // 10 days
    }
    req.body.email = req.body.email.toLowerCase();

    passport.authenticate('normal-local', {}, (error: any, user: User, info: any) => {
        if (error) return next(error);
        if (!user) {
            return res.status(401).json({ status: 'error', message: info.message });
        }
        
        req.logIn(user, async (err) => {
            if (err) return next(err);
            
            // Handle password hash transition if needed
            if (user.transitioned === false) {
                try {
                    const hashedPass = await bcrypt.hash(req.body.password, saltRounds);
                    user.password = hashedPass;
                    user.transitioned = true;
                    await userService.updateUser(user._id, user);
                } catch (hashError) {
                    return next(hashError);
                }
            }
            res.json(user);
        });
    })(req, res, next);
}

/**
 * Handles user registration.
 */
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        req.body.email = req.body.email.toLowerCase();
        req.body.password = await bcrypt.hash(req.body.password, saltRounds);
        req.body.transitioned = true;
        
        // The service checks for existing user
        const result = await userService.registerUser(req.body);
        res.status(201).json({ insertedId: result.insertedId });
    } catch (error: any) {
        if (error.message === 'User already exists') {
            res.status(409).json({ status: 'error', message: error.message }); // 409 Conflict
        } else {
            next(error);
        }
    }
}

/**
 * Handles user logout.
 */
export function logout(req: Request, res: Response, next: NextFunction): void {
    req.logout((err) => {
        if (err) { return next(err); }
        res.clearCookie('connect.sid', { path: '/' });
        res.status(200).json({ status: 'success' });
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

	if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
		console.error('GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET not set.');
        res.status(501).send('Server configuration error.');
		return;
	}

	params.append('client_id', process.env.GITHUB_CLIENT_ID);
	params.append('client_secret', process.env.GITHUB_CLIENT_SECRET);
	params.append('code', req.query.code as string);

    try {
        const tokenResponse = await fetch(TOKEN_URL, { method: 'POST', body: params });
        const tokenText = await tokenResponse.text();
        const tokenData = new URLSearchParams(tokenText);
        
        const accessToken = tokenData.get('access_token');
        if (!accessToken) {
             throw new Error(tokenData.get('error') || 'Failed to get access token');
        }

        // Now get user data from GitHub
        const userResponse = await fetch('https://api.github.com/user', {
            headers: { Authorization: `token ${accessToken}` }
        });
        if (!userResponse.ok) throw new Error('Failed to get user data from GitHub');
        
        const githubProfile = await userResponse.json();
        githubProfile.githubToken = accessToken;

        // Find or register this user in our DB
        const user = await userService.findOrRegisterGithub(githubProfile);
        
        // Log the user in
        req.logIn(user, (err) => {
            if (err) return next(err);
            // Redirect or send user data
            // For a REST API, often you redirect to the frontend with a token
            // Here, we'll just send the user data
             res.status(200).json(user); // Or redirect
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
        const { userId, login, id } = req.body;
        const user = req.user as User;

        // Ensure the logged-in user is the one making the request
        if (!user || user._id.toString() !== userId) {
            res.status(403).json({ error: 'Forbidden: You can only merge your own account' });
            return;
        }

        const mergedUser = await userService.mergeGithub(userId, login, id);
        
        // Re-login the user to update the session
        req.logIn(mergedUser, (err) => {
            if (err) return next(err);
            res.status(200).json({ status: 'success' });
        });
    } catch (error) {
        next(error);
    }
}

// --- User Management ---

/**
 * Gets the currently logged-in user's data.
 */
export async function getUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (req.user) {
        res.status(200).json(req.user);
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
}

/**
 * Deletes the currently logged-in user's account.
 */
export async function deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const user = req.user as User;
        if (!user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }
        
        await userService.deleteUser(user._id);
        
        req.logout((err) => {
            if (err) console.error("Error during logout after user deletion:", err);
            res.clearCookie('connect.sid', { path: '/' });
            res.status(200).json({ message: 'User deleted successfully' });
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Updates user data (e.g., password change from profile).
 * Note: This is a simple replace. Add logic for specific fields if needed.
 */
export async function updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
     try {
         const { userID } = req.params;
         const user = req.user as User;
         
         if (!user || user._id.toString() !== userID) {
             res.status(403).json({ error: 'Forbidden: You can only update your own account' });
             return;
         }
         
         const updatedUserData: User = req.body;
         
         // Ensure sensitive data isn't overwritten incorrectly
         // e.g., if password is being changed, it must be re-hashed
         if (updatedUserData.password && updatedUserData.password !== user.password) {
             updatedUserData.password = await bcrypt.hash(updatedUserData.password, saltRounds);
             updatedUserData.transitioned = true;
         } else {
             // Keep the old password if not provided
             updatedUserData.password = user.password;
         }
         
         // Preserve other critical data
         updatedUserData._id = user._id;
         updatedUserData.email = user.email; // Don't allow email change here
         updatedUserData.github = user.github;
         updatedUserData.jira = user.jira;

         const updatedUser = await userService.updateUser(userID, updatedUserData);
         res.status(200).json(updatedUser);
    } catch (error) {
        next(error);
    }
}