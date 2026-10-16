import { z } from 'zod';
import { stepTypeSchema, stepDefinitionSchema, multipleScenarioSchema } from './shared.schemas.js';

/**
 * Optional field that accepts null from legacy stored documents and replaces it with `fallback`.
 * Absent stays absent because `.optional()` short-circuits undefined, so a PUT that omits the field
 * does not gain it with an empty value.
 * @param schema Schema for the non-null value
 * @param fallback Value used when the stored field is null
 * @returns Optional schema whose output is never null
 */
function nullAs<T extends z.ZodType>(schema: T, fallback: z.output<T>) {
	return schema.nullable().transform(v => v ?? fallback).optional();
}

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
 * Step inside a stored scenario. Legacy stored steps may lack `id`, hold null `pre`/`mid`, or hold
 * null entries in `isExample`, so those fields are lenient here. stepTypeSchema stays strict because
 * the block routes rely on it.
 */
const storedStepSchema = stepTypeSchema.extend({
	id: z.number().optional(),
	pre: z.string().nullish(),
	mid: z.string().nullish(),
	isExample: z.array(z.boolean().nullable().transform(v => v ?? false)).optional()
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
	// Legacy scenarios store comment null; the Scenario model requires a string, so null becomes ''.
	comment: nullAs(z.string(), ''),
	stepDefinitions: storedStepDefinitionSchema,
	multipleScenarios: z.array(multipleScenarioSchema.passthrough().nullable()).optional()
}).passthrough();

/**
 * Story editor fields — body of PUT /api/story/:_id.
 * Only the fields the story editor edits are accepted. Server-owned fields (lastTestPassed, oneDriver,
 * issue_number, story_id, storySource, ...) are stripped because the service $sets exactly what it
 * receives, so a stale tab cannot overwrite them. title and scenarios are required; without them the
 * stored story would lose its title or scenarios.
 */
export const updateStorySchema = z.object({
	title: z.string(),
	// Legacy stored stories hold body null; the Story model requires a string.
	body: nullAs(z.string(), ''),
	scenarios: z.array(scenarioSchema),
	background: z.object({}).passthrough().optional(),
	aiSuggestion: z.object({}).passthrough().optional()
});

/** PATCH /api/story/:story_id — body is the complete scenarios array of the story */
export const updateScenarioListSchema = z.array(scenarioSchema);
