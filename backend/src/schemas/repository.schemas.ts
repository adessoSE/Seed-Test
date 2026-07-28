import { z } from 'zod';

/** POST /api/repository/ */
export const createRepositorySchema = z.object({
	name: z.string().min(1, 'Repository name is required')
});

const aiProviderConfigSchema = z.object({
	provider: z.literal('custom'),
	name: z.enum(['local', 'cloud']),
	modelName: z.string().min(1),
	baseURL: z.string().url(),
	apiKey: z.string().optional()
});

const aiConfigSchema = z.object({
	textPreparation: aiProviderConfigSchema,
	jsonConversion: aiProviderConfigSchema
});

/** PUT /api/repository/settings/:repo_id */
export const updateSettingsSchema = z.object({
	repoName: z.string().min(1).optional(),
	settings: z.object({
		stepWaitTime: z.number().int().nonnegative().optional(),
		reportComment: z.boolean().optional(),
		browser: z.string().optional(),
		testRunner: z.string().optional(),
		emulator: z.string().optional(),
		width: z.number().int().positive().optional(),
		height: z.number().int().positive().optional(),
		activated: z.boolean().optional()
	}).optional(),
	aiConfig: aiConfigSchema.optional()
});

/** PUT /api/repository/owner/:repo_id */
export const transferOwnerSchema = z.object({
	email: z.string().email()
});
