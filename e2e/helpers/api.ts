import type { APIRequestContext } from '@playwright/test';
import { API_URL } from './config';

/** Minimal story shape returned by the API; only the fields the suite reads are typed. */
export interface StoryDto {
	_id: string;
	title: string;
	[key: string]: unknown;
}

/** Minimal block shape returned by GET /block/getBlocks/:repoId. */
export interface BlockDto {
	_id: string;
	name?: string;
	[key: string]: unknown;
}

/** Project (repository) created through the API. */
export interface ProjectRef {
	id: string;
	name: string;
}

/**
 * Throws with the response body when a request did not return the expected status.
 * WHY: Failing inside the helper names the exact route; a later `undefined` access would not.
 * @param response Response to check.
 * @param expected Expected HTTP status.
 * @param what Human-readable action for the error message.
 */
export async function expectStatus(response: { status(): number; text(): Promise<string> }, expected: number, what: string): Promise<void> {
	if (response.status() !== expected)
		throw new Error(`${what} failed: HTTP ${response.status()} ${await response.text()}`);
}

/**
 * Creates a db project (repository) for the logged-in test user.
 * @param api Request context carrying the session cookie.
 * @param name Project name; must be unique per test run to avoid clashes.
 * @returns The new project id and name.
 */
export async function createProject(api: APIRequestContext, name: string): Promise<ProjectRef> {
	const response = await api.post(`${API_URL}/repository/`, { data: { name } });
	await expectStatus(response, 201, 'createProject');
	const body = (await response.json()) as { insertedId: string };
	return { id: body.insertedId, name };
}

/**
 * Deletes a project. Treats 404 as success so teardown stays idempotent after a test already deleted it.
 * Irreversible: removes the project and its contents on the server.
 * @param api Request context carrying the session cookie.
 * @param id Repository id.
 */
export async function deleteProject(api: APIRequestContext, id: string): Promise<void> {
	const response = await api.delete(`${API_URL}/repository/${id}`);
	if (response.status() !== 404)
		await expectStatus(response, 200, 'deleteProject');
}

/**
 * Creates a story in a project.
 * @param api Request context carrying the session cookie.
 * @param repoId Project id the story belongs to.
 * @param title Story title (required by the backend).
 * @param description Optional story description.
 * @returns The new story id.
 */
export async function createStory(api: APIRequestContext, repoId: string, title: string, description = ''): Promise<string> {
	// The backend reads the repository id from `_id` in the body, not from `repoId`
	const response = await api.post(`${API_URL}/story/`, { data: { title, description, _id: repoId } });
	await expectStatus(response, 201, 'createStory');
	return ((await response.json()) as { _id: string })._id;
}

/**
 * Lists the stories of a db project.
 * @param api Request context carrying the session cookie.
 * @param repoId Project id.
 * @returns All stories of the project in server order.
 */
export async function getStories<T = StoryDto>(api: APIRequestContext, repoId: string): Promise<T[]> {
	const response = await api.get(`${API_URL}/story/`, { params: { source: 'db', id: repoId } });
	await expectStatus(response, 200, 'getStories');
	return (await response.json()) as T[];
}

/**
 * Fetches one story by id.
 * @param api Request context carrying the session cookie.
 * @param storyId Story id.
 * @returns The story as stored on the server.
 */
export async function getStory(api: APIRequestContext, storyId: string): Promise<StoryDto> {
	const response = await api.get(`${API_URL}/story/${storyId}`);
	await expectStatus(response, 200, 'getStory');
	return (await response.json()) as StoryDto;
}

/**
 * Lists the custom blocks of a project.
 * @param api Request context carrying the session cookie.
 * @param repoId Project id.
 * @returns All custom blocks of the project.
 */
export async function getBlocks<T = BlockDto>(api: APIRequestContext, repoId: string): Promise<T[]> {
	const response = await api.get(`${API_URL}/block/getBlocks/${repoId}`);
	await expectStatus(response, 200, 'getBlocks');
	return (await response.json()) as T[];
}
