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

/** POST /api/user/githubLogin */
export const githubLoginSchema = z.object({
	login: z.string().min(1, 'GitHub login is required'),
	id: z.coerce.number().int('GitHub ID must be an integer')
});

/** POST /api/user/githubRegister */
export const githubRegisterSchema = z.object({
	login: z.string().min(1, 'GitHub login is required'),
	id: z.coerce.number().int('GitHub ID must be an integer'),
	avatar_url: z.string().optional(),
	email: z.string().email().optional(),
	name: z.string().optional(),
	githubToken: z.string().optional()
});

