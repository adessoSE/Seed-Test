import type { APIRequestContext, Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import { getStory, type StoryDto } from '../helpers/api';
import { insertLegacyStories, legacyStory } from '../helpers/legacy-db';
import { API_URL } from '../helpers/config';
import { StoriesBar } from '../pages/stories-bar';

/** Titles of the legacy stories every test inserts; "Erste Story" and "Test Story Playwright MCP" carry the edge cases. */
const LEGACY_TITLES = ['Login implementieren', 'Erste Story', 'Test Story Playwright MCP', 'Story Beta'] as const;

/**
 * Story row in the stories bar. Matches by substring, so the titles above must not overlap in the fixture.
 * @param page Page showing the stories bar.
 * @param title Story title.
 */
function storyRow(page: Page, title: string) {
	return page.locator('a.storyListLink', { hasText: title });
}

/**
 * Opens a story from the stories bar and waits until its heading shows the title.
 * @param page Page showing the stories bar.
 * @param title Story title.
 */
async function openStory(page: Page, title: string): Promise<void> {
	await storyRow(page, title).click();
	await expect(page.locator('span.storyTitle', { hasText: title })).toBeVisible();
}

/**
 * Scenario row of the currently expanded story.
 * @param page Page showing the stories bar.
 * @param name Scenario name as stored (the bar shows it title-cased).
 */
function scenarioRow(page: Page, name: string) {
	return page.locator('a.scenarioListItem', { hasText: new RegExp(name, 'i') });
}

/**
 * Finds the story document of the project stored by the given id.
 * @param api Request context with the shared session.
 * @param storyId Story id.
 * @returns The stored story.
 */
async function storedStory(api: APIRequestContext, storyId: string): Promise<StoryDto & Record<string, unknown>> {
	return (await getStory(api, storyId)) as StoryDto & Record<string, unknown>;
}

test.describe('legacy data written by older Seed-Test versions', () => {
	test('legacy stories appear in the stories bar', async ({ page, project }) => {
		await insertLegacyStories(project.id, LEGACY_TITLES.map(title => legacyStory(title)));

		await page.goto('/');
		for (const title of LEGACY_TITLES)
			await expect(storyRow(page, title)).toBeVisible();
	});

	test('editing a legacy story saves and normalises null fields', async ({ page, api, project }) => {
		const [, , storyId] = await insertLegacyStories(project.id, LEGACY_TITLES.map(title => legacyStory(title)));
		const before = await storedStory(api, storyId);
		// Precondition: the fixture really holds the legacy nulls the normalisation must fix
		expect(before.body).toBeNull();
		expect((before.scenarios as { comment: unknown }[])[0].comment).toBeNull();

		await page.goto('/');
		await openStory(page, 'Test Story Playwright MCP');

		// Story save: PUT /story/:_id with the rename modal (body is sent as null, the schema turns it into '')
		const newTitle = `Legacy renamed ${Date.now()}`;
		await page.locator('button[matTooltip="Change Story Title"]').click();
		await page.locator('#newStoryTitle').clear();
		await page.locator('#newStoryTitle').pressSequentially(newTitle);
		const storySave = page.waitForResponse(r => r.request().method() === 'PUT' && r.url() === `${API_URL}/story/${storyId}`);
		await page.locator('#submitRenameStory').click();
		expect((await storySave).status()).toBeLessThan(300);

		// Scenario save: PUT /story/:story_id/:scenario, comment null becomes ''
		const scenarioName = `Legacy scenario ${Date.now()}`;
		await page.locator('button[matTooltip="Change Scenario Title"]').click();
		await page.locator('#newTitle').clear();
		await page.locator('#newTitle').pressSequentially(scenarioName);
		await page.locator('mat-dialog-container button[type="submit"]:visible').click();
		const scenarioSave = page.waitForResponse(r => r.request().method() === 'PUT' && new RegExp(`/story/${storyId}/[^/]+$`).test(r.url()));
		await page.locator('button[name="saveScenario"]#saveButton:visible').click();
		expect((await scenarioSave).status()).toBeLessThan(300);

		const after = await storedStory(api, storyId);
		expect(after.title).toBe(newTitle);
		expect(after.body).toBe('');
		expect((after.scenarios as { name: string; comment: unknown }[])[0]).toMatchObject({ name: scenarioName, comment: '' });
		// Fields the save does not touch keep their legacy values
		expect(after).toMatchObject({ issue_number: before.issue_number, assignee_avatar_url: null, storySource: 'db' });
		expect(after.background).toEqual(before.background);
	});

	test('a new scenario added to a legacy story is selected and saved', async ({ page, api, project }) => {
		const [storyId] = await insertLegacyStories(project.id, LEGACY_TITLES.map(title => legacyStory(title)));

		await page.goto('/');
		await openStory(page, 'Login implementieren');
		// #add_scenario lives inside the story's collapsed expansion panel, so the panel has to be opened first
		const stories = new StoriesBar(page);
		await stories.expandStory('Login implementieren');

		const scenarioName = `Added legacy ${Date.now()}`;
		await page.locator('#add_scenario:visible').click();
		await page.locator('#newTitle').pressSequentially(scenarioName);
		await page.locator('mat-dialog-container button[type="submit"]:visible').click();

		await expect(page.locator('#scenarioTitle:visible')).toContainText(scenarioName, { ignoreCase: true });
		await expect(scenarioRow(page, scenarioName)).toBeVisible();

		const stored = await storedStory(api, storyId);
		const names = (stored.scenarios as { name: string }[]).map(s => s.name);
		expect(names).toContain(scenarioName);
		expect(names).toContain('New Scenario');
	});

	test('running the legacy scenario with trailing spaces in a step value passes', async ({ page, api, project }) => {
		test.setTimeout(180_000);
		const [storyId] = await insertLegacyStories(project.id, [legacyStory('Erste Story')]);
		const before = await storedStory(api, storyId);
		const scenarioId = (before.scenarios as { scenario_id: number }[])[0].scenario_id;

		await page.goto('/');
		const stories = new StoriesBar(page);
		await stories.openScenario('Erste Story', 'New Scenario');

		// Marker survives only if the run updates the status without a page reload
		await page.evaluate(() => {
			(window as unknown as { __noReload: boolean }).__noReload = true;
		});
		// WHY: the legacy scenario already shows the "not passed" icon (lastTestPassed null), so the icon alone cannot
		// show that the run finished. Wait for the run response instead; the status emit runs after it.
		const runResponse = page.waitForResponse(
			r => r.request().method() === 'POST' && r.url() === `${API_URL}/execute/Scenario/${storyId}/${scenarioId}`,
			{ timeout: 170_000 },
		);
		await page.locator('#run_scenario:visible').click();
		expect((await runResponse).status()).toBeLessThan(300);

		const stored = await storedStory(api, storyId);
		const lastTestPassed = (stored.scenarios as { lastTestPassed?: unknown }[])[0].lastTestPassed;
		// WHY: a website-only step on example.com must pass; a false value is an app bug, not a test error
		expect(lastTestPassed).toBe(true);
		await expect(stories.scenarioIcon('Erste Story', 'New Scenario'))
			.toHaveClass(/(^|\s)passed(\s|$)/);
		expect(await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true);
	});
});
