import { z } from 'zod';

/** POST /api/repository/ */
export const createRepositorySchema = z.object({
	name: z.string().min(1, 'Repository name is required')
});

const aiProviderConfigSchema = z.object({
	provider: z.literal('custom').optional().default('custom'),
	name: z.enum(['local', 'cloud']).optional().default('local'),
	modelName: z.string().optional().default(''),
	baseURL: z.string().optional().default(''),
	// nullable: frontend may send null (apiKey stored as null in DB when not set)
	apiKey: z.string().nullable().optional()
});

const aiConfigSchema = z.object({
	textPreparation: aiProviderConfigSchema.optional(),
	jsonConversion: aiProviderConfigSchema.optional()
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

// Older projects and exports store a flat aiConfig ({ provider, ollamaUrl, defaultTextModel, defaultJsonModel, apiKey });
// the AI job needs the nested providers and crashed with a TypeError on the flat shape.
const NESTED_AI_CONFIG_MESSAGE = 'aiConfig must contain textPreparation and jsonConversion; the legacy flat format is not supported';

/** POST /api/story/:story_id/generate-scenarios */
export const generateAiScenariosSchema = z.object({
	aiConfig: z.object({
		textPreparation: z.object(aiProviderConfigSchema.shape, { error: NESTED_AI_CONFIG_MESSAGE }),
		jsonConversion: z.object(aiProviderConfigSchema.shape, { error: NESTED_AI_CONFIG_MESSAGE })
	}, { error: 'AI configuration is missing.' })
});

/** PUT /api/repository/owner/:repo_id */
export const transferOwnerSchema = z.object({
	email: z.string().email()
});
