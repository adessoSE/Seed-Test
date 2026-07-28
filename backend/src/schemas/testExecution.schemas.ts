import { z } from 'zod';

/** POST /api/execute/TempGroup — group with member stories for temp execution */
export const runTempGroupSchema = z.object({
	repositoryId: z.string().min(1, 'Repository ID is required'),
	repository: z.string().optional(),
	group: z.object({
		name: z.string().optional(),
		// member_stories are full Story objects from the frontend — validated as objects,
		// not stripped, because the test runner consumes them wholesale
		member_stories: z.array(z.record(z.string(), z.unknown())),
		isSequential: z.boolean().optional().default(false)
	})
});

/** POST /api/execute/Feature and /api/execute/Scenario — minimal body */
export const runTestSchema = z.object({
	repositoryId: z.string().min(1, 'Repository ID is required')
});
