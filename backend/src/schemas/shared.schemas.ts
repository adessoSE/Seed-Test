import { z } from 'zod';

/**
 * Zod schema for StepType — matches @shared/models/StepType interface.
 * Reused across background, block, story, and test execution schemas.
 */
export const stepTypeSchema = z.object({
	_blockReferenceId: z.string().optional(),
	_id: z.string().optional(),
	id: z.number(),
	pre: z.string(),
	mid: z.string(),
	post: z.string().optional(),
	selection: z.array(z.string()).optional(),
	selectionValue: z.number().optional(),
	stepType: z.string(),
	type: z.string(),
	values: z.array(z.string()),
	isExample: z.array(z.boolean()).optional(),
	outdated: z.boolean().optional(),
	checked: z.boolean().optional(),
	deactivated: z.boolean().optional(),
	blockStepExpanded: z.boolean().optional(),
	origin: z.string().optional()
});

/** Zod schema for StepDefinition — given/when/then arrays of StepType */
export const stepDefinitionSchema = z.object({
	given: z.array(stepTypeSchema),
	when: z.array(stepTypeSchema),
	then: z.array(stepTypeSchema),
	example: z.array(stepTypeSchema).optional()
});

/** Zod schema for StepDefinitionBackground — only 'when' steps */
export const stepDefinitionBackgroundSchema = z.object({
	when: z.array(stepTypeSchema)
});

/** Zod schema for MultipleScenario */
export const multipleScenarioSchema = z.object({
	values: z.array(z.string()),
	checked: z.boolean().optional(),
	deactivated: z.boolean().optional()
});
