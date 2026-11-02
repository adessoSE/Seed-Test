import type { APIRequestContext } from '@playwright/test';
import { API_URL } from './config';
import { getStory, type StoryDto } from './api';
import { addScenario, getScenarios, type ScenarioDto } from './stories';

/** One Given/When/Then step as stored in a scenario's stepDefinitions (shape of scenarioSchema). */
export interface RunStep {
	id: number;
	pre: string;
	mid: string;
	stepType: 'given' | 'when' | 'then';
	type: string;
	values: string[];
}

/** Scenario as stored inside a story, including the DB-only run status written after each run. */
export interface RunScenarioDto extends ScenarioDto {
	stepDefinitions: { given: RunStep[]; when: RunStep[]; then: RunStep[] };
	lastTestPassed?: boolean;
	[key: string]: unknown;
}

/** Given step that opens example.com; the one step the passing scenario needs. */
export const PASS_GIVEN_STEP: RunStep = {
	id: 0,
	pre: 'I am on the website:',
	mid: '',
	stepType: 'given',
	type: 'Website / URL',
	values: ['https://example.com'],
};

/** Then step that cannot match on example.com, so the scenario fails. */
export const FAIL_THEN_STEP: RunStep = {
	id: 1,
	pre: 'So I can see the text:',
	mid: '',
	stepType: 'then',
	type: 'Check Text on Page',
	values: ['text-that-is-not-on-example-com'],
};

/**
 * Replaces the steps of a scenario through the same PUT route the editor uses.
 * WHY: the route validates the whole scenario object, so the stored scenario is read first and only stepDefinitions change.
 * @param api Request context carrying the session cookie.
 * @param storyId Story the scenario belongs to.
 * @param scenario Scenario as returned by addScenario.
 * @param steps Steps to store in the given and then sections.
 */
export async function setScenarioSteps(api: APIRequestContext, storyId: string, scenario: RunScenarioDto, steps: { given: RunStep[]; then: RunStep[] }): Promise<void> {
	const body = { ...scenario, stepDefinitions: { given: steps.given, when: [], then: steps.then } }; // NOSONAR typescript:S7739 Gherkin step key, not a thenable
	const response = await api.put(`${API_URL}/story/${storyId}/${scenario.scenario_id}`, { data: body });
	if (response.status() !== 200)
		throw new Error(`setScenarioSteps failed: HTTP ${response.status()} ${await response.text()}`);
}

/**
 * Adds a scenario that passes on example.com (given: open the site only).
 * @param api Request context carrying the session cookie.
 * @param storyId Story to add the scenario to.
 * @param name Unique scenario name.
 * @returns The stored scenario.
 */
export async function addPassingScenario(api: APIRequestContext, storyId: string, name: string): Promise<RunScenarioDto> {
	const created = (await addScenario(api, storyId, name)) as RunScenarioDto;
	await setScenarioSteps(api, storyId, created, { given: [PASS_GIVEN_STEP], then: [] }); // NOSONAR typescript:S7739 Gherkin step key, not a thenable
	return created;
}

/**
 * Adds a scenario that fails on example.com (given: open the site, then: text that is not there).
 * @param api Request context carrying the session cookie.
 * @param storyId Story to add the scenario to.
 * @param name Unique scenario name.
 * @returns The stored scenario.
 */
export async function addFailingScenario(api: APIRequestContext, storyId: string, name: string): Promise<RunScenarioDto> {
	const created = (await addScenario(api, storyId, name)) as RunScenarioDto;
	await setScenarioSteps(api, storyId, created, { given: [PASS_GIVEN_STEP], then: [FAIL_THEN_STEP] }); // NOSONAR typescript:S7739 Gherkin step key, not a thenable
	return created;
}

/**
 * Reads the persisted run status of one scenario of a story.
 * @param api Request context carrying the session cookie.
 * @param storyId Story id.
 * @param name Scenario name.
 * @returns `lastTestPassed` as stored (undefined when the scenario never ran).
 */
export async function getScenarioStatus(api: APIRequestContext, storyId: string, name: string): Promise<boolean | undefined> {
	const scenario = (await getScenarios(api, storyId)).find(item => item.name === name) as RunScenarioDto | undefined;
	if (!scenario)
		throw new Error(`getScenarioStatus: scenario "${name}" not found in story ${storyId}`);
	return scenario.lastTestPassed;
}

/**
 * Reads the persisted run status of a story (written after a story run).
 * @param api Request context carrying the session cookie.
 * @param storyId Story id.
 * @returns `lastTestPassed` as stored (undefined when the story never ran).
 */
export async function getStoryStatus(api: APIRequestContext, storyId: string): Promise<boolean | undefined> {
	const story: StoryDto & { lastTestPassed?: boolean } = await getStory(api, storyId);
	return story.lastTestPassed;
}
