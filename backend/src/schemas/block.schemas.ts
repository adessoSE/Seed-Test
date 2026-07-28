import { z } from 'zod';

/** POST /api/block/ — repositoryId required for authorization middleware */
export const saveBlockSchema = z.object({
	repositoryId: z.string().min(1, 'Repository ID is required'),
	stepDefinitions: z.object({
		given: z.array(z.any()),
		when: z.array(z.any()),
		then: z.array(z.any())
	}).passthrough()
}).passthrough();

/** PUT /api/block/:blockId */
export const updateBlockSchema = z.object({
	stepDefinitions: z.object({
		given: z.array(z.any()),
		when: z.array(z.any()),
		then: z.array(z.any())
	}).passthrough()
}).passthrough();
