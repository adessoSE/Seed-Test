import { randomBytes } from 'node:crypto';
import type { APIRequestContext } from '@playwright/test';
import { test, expect } from '../fixtures';
import { createStory, getStories, getStory } from '../helpers/api';
import { addScenario, getScenarios } from '../helpers/stories';
import { API_URL } from '../helpers/config';
import { AppPage } from '../pages/app';
import { StoriesPage } from '../pages/stories';

/**
 * Unique name made of a label and digits only.
 * WHY: the stories bar and the scenario header render names with the titlecase pipe, which lowercases
 * letters after the first one. Digits survive it, so the assertions can compare the exact name.
 * @param label Readable prefix, capitalised.
 */
function uniqueName(label: string): string {
	return `${label} ${randomBytes(4).readUInt32BE(0) % 1_000_000_000}`;
}

/**
 * Returns the numeric id of the only scenario of a story, failing the test when there is not exactly one.
 * @param api Request context carrying the session cookie.
 * @param storyId Story id.
 * @returns The `scenario_id` of the single scenario.
 */
async function onlyScenarioId(api: APIRequestContext, storyId: string): Promise<number> {
	const scenarios = await getScenarios(api, storyId);
	if (scenarios.length !== 1)
		throw new Error(`expected one scenario in story ${storyId}, found ${scenarios.length}`);
	return scenarios[0].scenario_id;
}

/**
 * Deletes a scenario through the API (arrange step, not the UI path under test).
 * @param api Request context carrying the session cookie.
 * @param storyId Story id.
 * @param scenarioId Numeric `scenario_id`.
 */
async function deleteScenarioViaApi(api: APIRequestContext, storyId: string, scenarioId: number): Promise<void> {
	const response = await api.delete(`${API_URL}/story/scenario/${storyId}/${scenarioId}`);
	if (!response.ok())
		throw new Error(`deleteScenario failed: HTTP ${response.status()} ${await response.text()}`);
}

test.describe('stories', () => {
	test('the create-story button stays disabled for an empty or blank title and the story is saved', async ({ page, api, project }) => {
		const stories = new StoriesPage(page);
		const title = uniqueName('Story');
		await new AppPage(page).gotoHome();
		await stories.openCreateStoryModal();

		const submit = page.locator('#submitCreateNewStory').locator('visible=true');
		await expect(submit).toBeDisabled();
		await stories.typeInto(page.locator('#storytitle').locator('visible=true'), '   ');
		await expect(submit).toBeDisabled();

		await stories.replaceInput(page.locator('#storytitle').locator('visible=true'), title);
		await expect(submit).toBeEnabled();
		await submit.click();

		await expect(page.locator('#storyList').filter({ hasText: title }).first()).toBeVisible();
		expect((await getStories(api, project.id)).map(story => story.title)).toContain(title);
	});

	test('renaming a story keeps quotes, umlauts and markup as plain text', async ({ page, api, project, runtimeErrors }) => {
		const stories = new StoriesPage(page);
		const storyId = await createStory(api, project.id, uniqueName('Story'));
		const newTitle = 'Grüße "Zitat" äöüß & <i>x</i>';

		await stories.gotoStory(storyId);
		await stories.openRenameStoryModal();
		await stories.replaceInput(page.locator('#newStoryTitle').locator('visible=true'), newTitle);
		await page.locator('#submitRenameStory').locator('visible=true').click();

		const header = page.locator('span.storyTitle').first();
		await expect(header).toContainText(newTitle);
		// WHY: markup must render as text; an <i> element here means the title was injected as HTML
		await expect(header.locator('i')).toHaveCount(0);
		expect((await getStory(api, storyId)).title).toBe(newTitle);
		expect(runtimeErrors).toEqual([]);
	});

	test('deleting a story is cancelled by Cancel and removed by Delete', async ({ page, api, project }) => {
		const stories = new StoriesPage(page);
		const title = uniqueName('Story');
		const storyId = await createStory(api, project.id, title);

		await stories.gotoStory(storyId);
		await stories.openDeleteStoryDialog();
		await stories.confirmDialog('Cancel');
		await expect(page.locator('mat-dialog-container')).toHaveCount(0);
		expect((await api.get(`${API_URL}/story/${storyId}`)).status()).toBe(200);
		await expect(page.locator('span.storyTitle').first()).toContainText(title);

		await stories.openDeleteStoryDialog();
		await stories.confirmDialog('Delete');
		await expect.poll(async () => (await api.get(`${API_URL}/story/${storyId}`)).status()).toBe(404);
		await expect(page.locator('#storyList').filter({ hasText: title })).toHaveCount(0);
	});

	test('a scenario added from the stories bar to a story without scenarios becomes the selected scenario', async ({ page, api, project }) => {
		const stories = new StoriesPage(page);
		const title = uniqueName('Story');
		const storyId = await createStory(api, project.id, title);
		// WHY: a new story always starts with a "New Scenario"; #add_first_scenario only shows once none is left
		await deleteScenarioViaApi(api, storyId, await onlyScenarioId(api, storyId));
		const name = uniqueName('Scenario');

		await stories.gotoStory(storyId);
		await stories.addFirstScenarioFromBar(title, name);

		await expect(page.locator('#scenarioTitle')).toHaveText(`# ${name}`);
		expect((await getScenarios(api, storyId)).map(s => s.name)).toEqual([name]);
	});

	test('a scenario added from the editor header becomes the selected scenario, not the first one', async ({ page, api, project }) => {
		const stories = new StoriesPage(page);
		const storyId = await createStory(api, project.id, uniqueName('Story'));
		const firstName = uniqueName('Scenario');
		const first = await addScenario(api, storyId, firstName);
		const secondName = uniqueName('Scenario');

		await stories.gotoScenario(storyId, first.scenario_id);
		await expect(page.locator('#scenarioTitle')).toHaveText(`# ${firstName}`);

		await stories.addScenarioFromEditor(secondName);
		// Regression: the editor kept showing the first scenario after a new one was added
		await expect(page.locator('#scenarioTitle')).toHaveText(`# ${secondName}`);
	});

	test('a scenario added from the stories bar with #add_scenario becomes the selected scenario', async ({ page, api, project }) => {
		const stories = new StoriesPage(page);
		const title = uniqueName('Story');
		const storyId = await createStory(api, project.id, title);
		await addScenario(api, storyId, uniqueName('Scenario'));
		const secondName = uniqueName('Scenario');
		const namesBefore = (await getScenarios(api, storyId)).map(s => s.name);

		await stories.gotoStory(storyId);
		await stories.addScenarioFromBar(title, secondName);

		await expect(page.locator('#scenarioTitle')).toHaveText(`# ${secondName}`);
		expect((await getScenarios(api, storyId)).map(s => s.name)).toEqual([...namesBefore, secondName]);
	});

	test('a step added to the new scenario is saved on that scenario only', async ({ page, api, project }) => {
		const stories = new StoriesPage(page);
		const storyId = await createStory(api, project.id, uniqueName('Story'));
		const firstName = uniqueName('Scenario');
		const first = await addScenario(api, storyId, firstName);
		const newName = uniqueName('Scenario');
		const url = 'https://example.com/e2e-step';

		await stories.gotoScenario(storyId, first.scenario_id);
		await stories.addScenarioFromEditor(newName);
		await expect(page.locator('#scenarioTitle')).toHaveText(`# ${newName}`);
		const created = (await getScenarios(api, storyId)).find(s => s.name === newName)!;

		await stories.addWebsiteStep(url);
		await stories.saveScenario();

		// WHY: the deep link is a full page load, so it doubles as the reload after the save
		await stories.gotoScenario(storyId, created.scenario_id);
		await expect(page.locator('#scenarioTitle')).toHaveText(`# ${newName}`);
		await expect(page.locator('[contenteditable=true][id^=scenario_0_input_pre_]').locator('visible=true').first()).toHaveText(url);

		const scenarios = await getScenarios(api, storyId);
		const savedNew = scenarios.find(s => s.name === newName) as unknown as { stepDefinitions: { given: { values: string[] }[] } };
		const savedFirst = scenarios.find(s => s.name === firstName) as unknown as { stepDefinitions: { given: { values: string[] }[] } };
		expect(savedNew.stepDefinitions.given.flatMap(step => step.values)).toContain(url);
		expect(savedFirst.stepDefinitions.given.flatMap(step => step.values)).not.toContain(url);
	});

	test('a deep link to a scenario opens that scenario after a reload', async ({ page, api, project }) => {
		const stories = new StoriesPage(page);
		const storyId = await createStory(api, project.id, uniqueName('Story'));
		await addScenario(api, storyId, uniqueName('Scenario'));
		const targetName = uniqueName('Scenario');
		const target = await addScenario(api, storyId, targetName);

		await stories.gotoScenario(storyId, target.scenario_id);
		await page.reload();
		await expect(page.locator('#scenarioTitle')).toHaveText(`# ${targetName}`);
	});

	test('deleting the selected scenario leaves another scenario open in the editor', async ({ page, api, project }) => {
		const stories = new StoriesPage(page);
		const storyId = await createStory(api, project.id, uniqueName('Story'));
		const remainingName = uniqueName('Scenario');
		await addScenario(api, storyId, remainingName);
		const doomedName = uniqueName('Scenario');
		const doomed = await addScenario(api, storyId, doomedName);
		// Includes the story's default "New Scenario", which must survive the deletion as well
		const namesBefore = (await getScenarios(api, storyId)).map(s => s.name);

		await stories.gotoScenario(storyId, doomed.scenario_id);
		await expect(page.locator('#scenarioTitle')).toHaveText(`# ${doomedName}`);
		await stories.deleteSelectedScenario();

		await expect(page.locator('#scenarioTitle')).toHaveText(`# ${remainingName}`);
		const remaining = await getScenarios(api, storyId);
		expect(remaining.map(s => s.name)).toEqual(namesBefore.filter(name => name !== doomedName));
	});
});
