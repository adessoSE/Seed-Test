import { z } from 'zod';
import { stepTypeSchema, stepDefinitionSchema, multipleScenarioSchema } from './shared.schemas.js';

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

// Passthrough is required on every stored level: the controllers write these objects back unchanged
// (findOneAndReplace / $set), so a key the schema does not list would be deleted from the database.
/**
 * Step inside a stored scenario. Legacy stored steps may lack `id` or hold null `pre`/`mid`, so those
 * fields are lenient here. stepTypeSchema stays strict because the block routes rely on it.
 */
const storedStepSchema = stepTypeSchema.extend({
	id: z.number().optional(),
	pre: z.string().nullish(),
	mid: z.string().nullish()
}).passthrough();

/** Step definitions of a stored scenario — the shared shape with the lenient step schema for every list. */
const storedStepDefinitionSchema = stepDefinitionSchema.extend({
	given: z.array(storedStepSchema),
	when: z.array(storedStepSchema),
	then: z.array(storedStepSchema),
	example: z.array(storedStepSchema).optional()
}).passthrough();

/**
 * Scenario as stored in a story — body of PUT /api/story/:story_id/:_id and element of
 * PATCH /api/story/:story_id. Only the fields the controller needs for identity and steps are
 * required; DB-only fields (lastTestPassed, testKey, testRunSteps, ...) pass through.
 * multipleScenarios may contain nulls; the controller filters them out.
 */
export const scenarioSchema = z.object({
	scenario_id: z.number(),
	name: z.string(),
	comment: z.string().optional(),
	stepDefinitions: storedStepDefinitionSchema,
	multipleScenarios: z.array(multipleScenarioSchema.passthrough().nullable()).optional()
}).passthrough();

/**
 * Full story document — body of PUT /api/story/:_id.
 * The controller replaces the whole document, so title and scenarios are required; without them the
 * stored story would lose its title or scenarios. The frontend always sends the complete Story, which
 * carries a title.
 */
export const updateStorySchema = z.object({
	title: z.string(),
	scenarios: z.array(scenarioSchema)
}).passthrough();

/** PATCH /api/story/:story_id — body is the complete scenarios array of the story */
export const updateScenarioListSchema = z.array(scenarioSchema);
