import { z } from 'zod';

/** PUT /api/background/:storyID — validates critical fields, passes domain-specific ones through */
export const updateBackgroundSchema = z.object({
	stepDefinitions: z.object({
		when: z.array(z.any())
	}).passthrough()
}).passthrough();
