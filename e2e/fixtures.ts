import { test as base, request, type APIRequestContext, type Page } from '@playwright/test';
import { BACKEND_INFO, STORAGE_STATE_PATH } from './helpers/config';
import { recordAppConsoleError } from './helpers/console';
import { createProject, deleteProject, type ProjectRef } from './helpers/api';
import { randomBytes } from 'node:crypto';

/**
 * Writes localStorage entries only when they are missing, so a value the app wrote during a test survives reloads.
 * Runs in the page before any app script (addInitScript). Each test gets a fresh browser context, so the keys start empty.
 * @param entries Key/value pairs to seed.
 */
function seedLocalStorage(entries: Record<string, string>): void {
	for (const [key, value] of Object.entries(entries))
		if (window.localStorage.getItem(key) === null)
			window.localStorage.setItem(key, value);
}

/** Fixture set provided to every spec. */
export interface E2EFixtures {
	/** Request context with the session cookie of the shared test user. Use for arrange and assert calls. */
	api: APIRequestContext;
	/** Page with backendInfo seeded and collecting runtime errors from the app and backend origins (see `runtimeErrors`). */
	page: Page;
	/** Messages of uncaught page errors and console errors from the app and backend origins, in arrival order. */
	runtimeErrors: string[];
	/** A db project created through the API, selected as the current project in the UI, deleted after the test. */
	project: ProjectRef;
}

/**
 * Extended test with the shared fixtures. Import `test` and `expect` from here, not from @playwright/test.
 */
export const test = base.extend<E2EFixtures>({
	api: async ({}, use) => {
		const api = await request.newContext({ storageState: STORAGE_STATE_PATH });
		await use(api);
		await api.dispose();
	},

	runtimeErrors: async ({}, use) => {
		await use([]);
	},

	page: async ({ page, runtimeErrors }, use) => {
		await page.addInitScript(seedLocalStorage, BACKEND_INFO);
		page.on('pageerror', error => runtimeErrors.push(`pageerror: ${error.message}`));
		page.on('console', message => recordAppConsoleError(message, runtimeErrors));
		await use(page);
	},

	project: async ({ api, page }, use) => {
		// Unique per run so a leftover project from a failed run never clashes with a new one
		const name = `E2E ${new Date().toISOString()} ${randomBytes(3).toString('hex')}`;
		const project = await createProject(api, name);
		// WHY: the frontend reads the current project from these three keys (see ProjectService.selectRepository)
		await page.addInitScript(seedLocalStorage, { repository: project.name, source: 'db', id: project.id });
		await use(project);
		await deleteProject(api, project.id);
	},
});

export { expect } from '@playwright/test';
