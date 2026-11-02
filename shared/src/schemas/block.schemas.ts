import { z } from 'zod';
import { stepDefinitionSchema, multipleScenarioSchema } from './shared.schemas.js';

/** POST /api/block/ — repositoryId required for authorization middleware */
export const saveBlockSchema = z.object({
	repositoryId: z.string().min(1, 'Repository ID is required'),
	name: z.string().optional(),
	owner: z.string().optional(),
	repository: z.string().optional(),
	source: z.string().optional(),
	isBackground: z.boolean().optional(),
	usedAsReference: z.boolean().optional(),
	stepDefinitions: stepDefinitionSchema,
	multipleScenarios: z.array(multipleScenarioSchema).optional()
});

/** PUT /api/block/:blockId */
export const updateBlockSchema = z.object({
	name: z.string().optional(),
	owner: z.string().optional(),
	repository: z.string().optional(),
	source: z.string().optional(),
	isBackground: z.boolean().optional(),
	usedAsReference: z.boolean().optional(),
	stepDefinitions: stepDefinitionSchema.passthrough(),
	multipleScenarios: z.array(multipleScenarioSchema.passthrough()).optional()
});
