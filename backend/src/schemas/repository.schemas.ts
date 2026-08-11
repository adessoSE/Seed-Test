import { z } from 'zod';

/** POST /api/repository/ */
export const createRepositorySchema = z.object({
	name: z.string().min(1, 'Repository name is required')
});

const aiProviderConfigSchema = z.object({
	provider: z.literal('custom'),
	name: z.enum(['local', 'cloud']),
	modelName: z.string().min(1),
	baseURL: z.string().min(1, 'Base URL is required'),
	// nullable: frontend may send null (apiKey stored as null in DB when not set)
	apiKey: z.string().nullable().optional()
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
		// nullable: frontend may send null (e.g. when emulator was stored as null in DB)
		emulator: z.string().nullable().optional(),
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
