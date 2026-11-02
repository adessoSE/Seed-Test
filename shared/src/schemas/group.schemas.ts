import { z } from 'zod';

/** POST /api/group/:repo_id — create a new group */
export const createGroupSchema = z.object({
	name: z.string().min(1, 'Group name is required'),
	member_stories: z.array(z.string()).optional().default([]),
	sequence: z.boolean().optional().default(false),
	xrayTestSet: z.boolean().optional()
});

/**
 * One group as the frontend sends it (mirrors the shared Group model).
 * member_stories defaults to [] so the controllers never receive undefined members.
 */
const groupSchema = z.object({
	_id: z.string().optional(),
	name: z.string().min(1, 'Group name is required'),
	member_stories: z.array(z.string()).optional().default([]),
	isSequential: z.boolean().optional(),
	xrayTestSet: z.boolean().optional()
});

/** PUT /api/group/:repo_id/:group_id — replace one existing group */
export const updateGroupSchema = groupSchema;

/** PUT /api/group/:repo_id — replace the whole group array (e.g. reorder). Must be an array, never null. */
export const updateGroupsArraySchema = z.array(groupSchema);
