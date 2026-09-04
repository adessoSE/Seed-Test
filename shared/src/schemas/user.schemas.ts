import { z } from 'zod';

/** POST /api/user/login */
export const loginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(1),
	stayLoggedIn: z.boolean().optional()
});

/** POST /api/user/register — userId is sent by frontend for GitHub account merge flow */
export const registerSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8, 'Password must be at least 8 characters'),
	userId: z.string().optional()
});

/** POST /api/user/resetpassword */
export const forgotPasswordSchema = z.object({
	email: z.string().email()
});

/** PATCH /api/user/reset */
export const resetPasswordSchema = z.object({
	uuid: z.string().uuid(),
	password: z.string().min(8, 'Password must be at least 8 characters')
});

/** POST /api/user/mergeGithub */
export const mergeGithubSchema = z.object({
	userId: z.string().min(1),
	login: z.string().min(1),
	id: z.coerce.number().int()
});

/**
 * PUT /api/user/update/:userID — change-password-while-logged-in flow.
 * Requires the current password (verified against the stored hash) before a new
 * one is applied. Unknown keys (e.g. email) are rejected with a 400 by .strict().
 */
export const updateUserSchema = z
	.object({
		currentPassword: z.string().min(8, 'Current password must be at least 8 characters'),
		newPassword: z.string().min(8, 'Password must be at least 8 characters')
	})
	// Strict: reject unknown keys (e.g. email) instead of silently stripping them —
	// sensitive fields may only come from the session user, not the request body
	.strict();

