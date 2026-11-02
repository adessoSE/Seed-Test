import { describe, it, expect } from 'vitest';
import { scenarioSchema, updateStorySchema, updateScenarioListSchema } from '@seed-test/shared/schemas/story.schemas.js';
import { stepTypeSchema } from '@seed-test/shared/schemas/shared.schemas.js';

// Trimmed from a stored scenario (Mongo Extended JSON already unwrapped).
// Legacy data holds `comment: null` and `isExample: [null]`; the stored-scenario schemas must accept both.
const storedScenario = {
	scenario_id: 1,
	name: 'Firefox',
	comment: null,
	stepDefinitions: {
		given: [{ id: 1, pre: 'I am on the website:', mid: '', stepType: 'given', type: 'Website / URL', values: ['https://www.whatismybrowser.com/'], isExample: [null] }],
		when: [{ id: 2, pre: 'I click the button:', mid: '', stepType: 'when', type: 'Button', values: ['Consent'], isExample: [null], origin: 'created-by-user' }],
		then: []
	},
	lastTestPassed: true,
	stepWaitTime: 0,
	browser: 'firefox',
	width: 1920,
	height: 1080
};

// Trimmed from a stored story. body and assignee_avatar_url are null in legacy data.
const storedStory = {
	_id: '000000000000000000000001',
	story_id: 0,
	title: 'Example story',
	body: null,
	assignee_avatar_url: null,
	lastTestPassed: false,
	scenarios: [storedScenario]
};

describe('scenarioSchema with legacy stored data', () => {
	// Legacy scenarios store comment as null; the Scenario model requires a string, so the schema normalises it.
	it('accepts comment null and normalises it to an empty string', () => {
		const result = scenarioSchema.safeParse(storedScenario);
		expect(result.success).toBe(true);
		expect(result.data?.comment).toBe('');
	});

	// Legacy steps store isExample as [null]; a null example flag means "not an example".
	it('accepts isExample [null] and normalises it to [false]', () => {
		const result = scenarioSchema.safeParse(storedScenario);
		expect(result.success).toBe(true);
		expect(result.data?.stepDefinitions.given[0].isExample).toEqual([false]);
		expect(result.data?.stepDefinitions.when[0].isExample).toEqual([false]);
	});

	// Passthrough keeps DB-only fields; without it the PUT would silently delete them from the stored scenario.
	it('keeps DB-only fields such as lastTestPassed, stepWaitTime, browser, width and height', () => {
		const result = scenarioSchema.safeParse(storedScenario);
		expect(result.success).toBe(true);
		expect(result.data).toMatchObject({ lastTestPassed: true, stepWaitTime: 0, browser: 'firefox', width: 1920, height: 1080 });
	});

	// Only null is widened; any other wrong type must still be rejected.
	it('still rejects a comment that is neither a string nor null', () => {
		const result = scenarioSchema.safeParse({ ...storedScenario, comment: 42 });
		expect(result.success).toBe(false);
	});

	it('still rejects an isExample element that is neither a boolean nor null', () => {
		const scenario = {
			...storedScenario,
			stepDefinitions: { ...storedScenario.stepDefinitions, given: [{ ...storedScenario.stepDefinitions.given[0], isExample: ['yes'] }] }
		};
		const result = scenarioSchema.safeParse(scenario);
		expect(result.success).toBe(false);
	});
});

describe('updateStorySchema with legacy stored data', () => {
	// PUT /api/story/:_id updates only the editor fields, so the stored story must come back with clean values.
	it('accepts the stored story with body null and normalises it to an empty string', () => {
		const result = updateStorySchema.safeParse(storedStory);
		expect(result.success).toBe(true);
		expect(result.data?.body).toBe('');
	});

	// Server-owned fields are written by sync, test runs and the one-driver toggle; a client PUT must not set them.
	it('strips server-owned fields that the client sends', () => {
		const result = updateStorySchema.safeParse({
			...storedStory,
			lastTestPassed: false,
			oneDriver: true,
			issue_number: 99,
			story_id: 42,
			storySource: 'jira',
			assignee_avatar_url: 'https://example.invalid/a.png'
		});
		expect(result.success).toBe(true);
		expect(result.data).not.toHaveProperty('lastTestPassed');
		expect(result.data).not.toHaveProperty('oneDriver');
		expect(result.data).not.toHaveProperty('issue_number');
		expect(result.data).not.toHaveProperty('story_id');
		expect(result.data).not.toHaveProperty('storySource');
		expect(result.data).not.toHaveProperty('assignee_avatar_url');
	});

	it('still rejects a story without scenarios', () => {
		const { scenarios: _scenarios, ...withoutScenarios } = storedStory;
		const result = updateStorySchema.safeParse(withoutScenarios);
		expect(result.success).toBe(false);
	});

	it('keeps aiSuggestion and background that the editor sends', () => {
		const result = updateStorySchema.safeParse({
			...storedStory,
			background: { name: 'Bg', stepDefinitions: { when: [{ id: 1, origin: 'created-by-user' }] }, saved: true },
			aiSuggestion: { scenarios: [] }
		});
		expect(result.success).toBe(true);
		expect(result.data?.background).toEqual({ name: 'Bg', stepDefinitions: { when: [{ id: 1, origin: 'created-by-user' }] }, saved: true });
		expect(result.data?.aiSuggestion).toEqual({ scenarios: [] });
	});

	it('normalises the comment and isExample nulls of the stored scenarios', () => {
		const result = updateStorySchema.safeParse(storedStory);
		expect(result.success).toBe(true);
		expect(result.data?.scenarios[0].comment).toBe('');
		expect(result.data?.scenarios[0].stepDefinitions.given[0].isExample).toEqual([false]);
	});

	it('still rejects a story without a title', () => {
		const { title: _title, ...withoutTitle } = storedStory;
		const result = updateStorySchema.safeParse(withoutTitle);
		expect(result.success).toBe(false);
	});

	// A PUT that omits body must not gain an empty body, otherwise the stored value would be overwritten.
	it('keeps an absent body absent', () => {
		const { body: _body, ...withoutBody } = storedStory;
		const result = updateStorySchema.safeParse(withoutBody);
		expect(result.success).toBe(true);
		expect('body' in (result.data ?? {})).toBe(false);
	});

	it('still rejects a body that is neither a string nor null', () => {
		const result = updateStorySchema.safeParse({ ...storedStory, body: 42 });
		expect(result.success).toBe(false);
	});

	// The client echoes the version it loaded; the service uses it as the optimistic-lock check.
	it('keeps the version the client sent', () => {
		const result = updateStorySchema.safeParse({ ...storedStory, version: 3 });
		expect(result.success).toBe(true);
		expect(result.data?.version).toBe(3);
	});

	it('accepts a PUT without a version', () => {
		const result = updateStorySchema.safeParse(storedStory);
		expect(result.success).toBe(true);
		expect(result.data).not.toHaveProperty('version');
	});

	it('rejects a negative, fractional or non-numeric version', () => {
		expect(updateStorySchema.safeParse({ ...storedStory, version: -1 }).success).toBe(false);
		expect(updateStorySchema.safeParse({ ...storedStory, version: 1.5 }).success).toBe(false);
		expect(updateStorySchema.safeParse({ ...storedStory, version: '2' }).success).toBe(false);
	});
});

// Legacy stored steps are only lenient in the stored-scenario schemas; block routes keep stepTypeSchema strict.
describe('stepTypeSchema', () => {
	it('still rejects isExample [null]', () => {
		const step = { id: 1, pre: 'I am on the website:', mid: '', stepType: 'given', type: 'Website / URL', values: [], isExample: [null] };
		const result = stepTypeSchema.safeParse(step);
		expect(result.success).toBe(false);
	});
});

describe('updateScenarioListSchema with legacy stored data', () => {
	// PATCH /api/story/:story_id receives the complete scenario array, so every element needs the same normalisation.
	it('accepts a list of stored scenarios with null comments and normalises each comment', () => {
		const second = { ...storedScenario, scenario_id: 2, name: 'Chrome', comment: null };
		const result = updateScenarioListSchema.safeParse([storedScenario, second]);
		expect(result.success).toBe(true);
		expect(result.data?.map(s => s.comment)).toEqual(['', '']);
	});
});
