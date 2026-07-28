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
	password: z.string().min(6, 'Password must be at least 6 characters'),
	userId: z.string().optional()
});

/** POST /api/user/resetpassword */
export const forgotPasswordSchema = z.object({
	email: z.string().email()
});

/** PATCH /api/user/reset */
export const resetPasswordSchema = z.object({
	uuid: z.string().uuid(),
	password: z.string().min(6, 'Password must be at least 6 characters')
});

/** POST /api/user/mergeGithub */
export const mergeGithubSchema = z.object({
	userId: z.string().min(1),
	login: z.string().min(1),
	id: z.coerce.number().int()
});

/** POST /api/user/update/:userID — only validates password field if present */
export const updateUserSchema = z.object({
	password: z.string().min(6, 'Password must be at least 6 characters').optional()
});
