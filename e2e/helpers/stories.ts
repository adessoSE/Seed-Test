import type { APIRequestContext } from '@playwright/test';
import { API_URL } from './config';
import { expectStatus, getStory, type StoryDto } from './api';

/** Scenario as stored inside a story. `scenario_id` is the id the editor header and deep links use. */
export interface ScenarioDto {
	scenario_id: number;
	name: string;
	[key: string]: unknown;
}

/**
 * Lists the scenarios of a story in server order.
 * @param api Request context carrying the session cookie.
 * @param storyId Story id.
 * @returns Scenarios of the story; empty when the story has none.
 */
export async function getScenarios(api: APIRequestContext, storyId: string): Promise<ScenarioDto[]> {
	const story: StoryDto & { scenarios?: ScenarioDto[] } = await getStory(api, storyId);
	return story.scenarios ?? [];
}

/**
 * Adds a scenario to a story through the API and returns the stored scenario.
 * @param api Request context carrying the session cookie.
 * @param storyId Story id.
 * @param name Scenario name.
 * @returns The scenario as stored (with its numeric `scenario_id`).
 */
export async function addScenario(api: APIRequestContext, storyId: string, name: string): Promise<ScenarioDto> {
	const response = await api.post(`${API_URL}/story/${storyId}`, { data: { name } });
	await expectStatus(response, 201, 'addScenario');
	const created = (await getScenarios(api, storyId)).find(scenario => scenario.name === name);
	if (!created)
		throw new Error(`addScenario: "${name}" is missing from story ${storyId} after creation`);
	return created;
}

/**
 * Deletes a story of a project. Irreversible on the server.
 * Treats 404 as success so teardown stays idempotent after a test already deleted it.
 * @param api Request context carrying the session cookie.
 * @param repoId Project id the story belongs to.
 * @param storyId Story id.
 */
export async function deleteStory(api: APIRequestContext, repoId: string, storyId: string): Promise<void> {
	const response = await api.delete(`${API_URL}/story/${repoId}/${storyId}`);
	if (response.status() !== 404)
		await expectStatus(response, 200, 'deleteStory');
}
