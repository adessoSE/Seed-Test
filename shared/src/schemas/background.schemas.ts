import { z } from 'zod';
import { stepDefinitionBackgroundSchema } from './shared.schemas.js';

/** PUT /api/background/:storyID — full Background validation */
export const updateBackgroundSchema = z.object({
	name: z.string().optional(),
	stepDefinitions: stepDefinitionBackgroundSchema,
	saved: z.boolean().optional()
});
