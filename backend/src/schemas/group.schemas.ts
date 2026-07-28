import { z } from 'zod';

/** POST /api/group/:repo_id — create a new group */
export const createGroupSchema = z.object({
	name: z.string().min(1, 'Group name is required'),
	member_stories: z.array(z.string()).optional().default([]),
	isSequential: z.boolean().optional().default(false),
	xrayTestSet: z.boolean().optional()
});
