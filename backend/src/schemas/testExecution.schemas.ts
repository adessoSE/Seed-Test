import { z } from 'zod';

/** POST /api/execute/TempGroup — the only execution route with a complex body */
export const runTempGroupSchema = z.object({
	repositoryId: z.string().min(1, 'Repository ID is required'),
	repository: z.string().optional(),
	group: z.object({
		member_stories: z.array(z.any()),
		isSequential: z.boolean().optional().default(false)
	}).passthrough()
}).passthrough();

/** POST /api/execute/Feature and /api/execute/Scenario — minimal body */
export const runTestSchema = z.object({
	repositoryId: z.string().min(1, 'Repository ID is required')
}).passthrough();
