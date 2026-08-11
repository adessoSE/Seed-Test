import { z } from 'zod';

/** POST /api/story/ — create a new story */
export const createStorySchema = z.object({
	title: z.string().min(1, 'Story title is required'),
	description: z.string().optional(),
	_id: z.string().min(1, 'Repository ID is required')
});

/** POST /api/story/:story_id — create a new scenario */
export const createScenarioSchema = z.object({
	name: z.string().min(1).optional()
});

/** POST /api/story/oneDriver/:storyID */
export const setOneDriverSchema = z.object({
	oneDriver: z.boolean()
});

/** PUT /api/story/list/:repo_id — reorder stories */
export const updateStoryOrderSchema = z.object({
	storyIds: z.array(z.string().min(1))
});

/** POST /api/story/specialCommands/resolve */
export const resolveCommandSchema = z.object({
	command: z.string().min(1, 'Command is required')
});
