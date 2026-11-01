import { randomBytes } from 'node:crypto';
import type { APIRequestContext, Locator, Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import { createStory, getStory } from '../helpers/api';
import { addScenario, deleteStory, getScenarios, type ScenarioDto } from '../helpers/stories';
import { API_URL } from '../helpers/config';
import { StepEditor } from '../pages/step-editor';
import { StoriesBar } from '../pages/stories-bar';
import { StoriesPage } from '../pages/stories';

/** Step as stored in a scenario's stepDefinitions. Only the fields the suite reads are typed. */
interface StepDto {
	id: number;
	pre: string;
	mid: string;
	values: string[];
	type: string;
	stepType: string;
	[key: string]: unknown;
}

/** Scenario with its stepDefinitions and multiple-scenarios table (header row first, then one row per example). */
interface ScenarioFull extends ScenarioDto {
	stepDefinitions: { given: StepDto[]; when: StepDto[]; then: StepDto[] };
	multipleScenarios?: ({ values: string[] } | null)[];
	[key: string]: unknown;
}

/** Unique suffix so titles never clash with leftovers from other runs or parallel workers. */
function unique(label: string): string {
	return `${label} ${randomBytes(3).toString('hex')}`;
}

/**
 * Reads one scenario with its steps through the story endpoint.
 * @param api Request context with the session cookie.
 * @param storyId Story id.
 * @param scenarioId Numeric scenario id.
 * @returns The stored scenario.
 */
async function fetchScenario(api: APIRequestContext, storyId: string, scenarioId: number): Promise<ScenarioFull> {
	const story = await getStory(api, storyId) as unknown as { scenarios: ScenarioFull[] };
	const scenario = story.scenarios.find(s => s.scenario_id === scenarioId);
	if (!scenario)
		throw new Error(`scenario ${scenarioId} missing from story ${storyId}`);
	return scenario;
}

/**
 * Replaces the step definitions of a scenario through the same PUT route the editor uses.
 * WHY: the editor saves the whole scenario object, so the stored object is read first and only the steps change.
 * WHY the path uses scenario_id: PUT /story/:story_id/:_id parses the last segment as the numeric scenario id.
 * @param api Request context with the session cookie.
 * @param storyId Story id.
 * @param scenarioId Numeric scenario id.
 * @param steps Steps per group; missing groups are emptied.
 */
async function seedSteps(api: APIRequestContext, storyId: string, scenarioId: number, steps: Partial<ScenarioFull['stepDefinitions']>): Promise<void> {
	const scenario = await fetchScenario(api, storyId, scenarioId);
	scenario.stepDefinitions = { given: steps.given ?? [], when: steps.when ?? [], then: steps.then ?? [] };
	const response = await api.put(`${API_URL}/story/${storyId}/${scenario.scenario_id}`, { data: scenario });
	expect(response.status()).toBe(200);
}

/**
 * Builds a step as the step-type dropdown would add it, with one value.
 * @param stepType Group the step belongs to (given, when, then).
 * @param type Step type name.
 * @param pre Text before the value.
 * @param value Stored value.
 * @param id Step id inside the group.
 */
function makeStep(stepType: string, type: string, pre: string, value: string, id: number): StepDto {
	return { id, pre, mid: '', values: [value], type, stepType };
}

/**
 * Locates the first value input of a step in the editor.
 * @param page Page with a scenario open.
 * @param group Group index.
 * @param step Step index inside the group.
 */
function valueInput(page: Page, group: number, step: number): Locator {
	return page.locator(`[id="scenario_${group}_input_pre_${step}"]`).locator('visible=true').first();
}

/**
 * Drags a step row by its drag handle onto another row's position.
 * WHY: Angular CDK starts a drag only after pointer moves; Locator.dragTo jumps straight to the target and the
 * drop is not registered. The pointer moves in steps and ends at the target row's centre, so the dragged row takes its index.
 * @param page Page with a scenario open.
 * @param source Drag handle of the row to move.
 * @param target Drag handle of the row whose position is taken.
 */
async function dragHandleOnto(page: Page, source: Locator, target: Locator): Promise<void> {
	const from = await source.boundingBox();
	const to = await target.boundingBox();
	if (!from || !to)
		throw new Error('drag handles are not laid out');
	await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
	await page.mouse.down();
	await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 20 });
	await page.mouse.up();
}

test.describe('scenario steps', () => {
	test('given, when and then steps keep values and order after save and reload', async ({ page, api, project }) => {
		const stories = new StoriesPage(page);
		const editor = new StepEditor(page);
		const storyTitle = unique('E2E Steps Story');
		const storyId = await createStory(api, project.id, storyTitle);
		const scenarioName = unique('Scenario Steps');
		const created = await addScenario(api, storyId, scenarioName);
		await page.goto('/');
		await new StoriesBar(page).openScenario(storyTitle, scenarioName);

		const given = 'https://example.com/äöü "Quote" <script>alert(1)</script>';
		const when = 'Senden "ok" ÄÖÜß <b>fett</b>';
		const then = "Ergebnis 'ä' & <i>kursiv</i>";
		await editor.addStep('given', 'Website / URL');
		await editor.fillValue('given', 0, given);
		await editor.addStep('when', 'Button');
		await editor.fillValue('when', 0, when);
		await editor.addStep('then', 'Text in Textbox');
		await editor.fillValue('then', 0, then);

		await editor.save();
		await expect.poll(async () => {
			const stored = await fetchScenario(api, storyId, created.scenario_id);
			return stored.stepDefinitions.given[0]?.values[0];
		}).toBe(given);

		const stored = await fetchScenario(api, storyId, created.scenario_id);
		expect(stored.stepDefinitions.given.map(s => s.values[0])).toEqual([given]);
		expect(stored.stepDefinitions.when.map(s => s.values[0])).toEqual([when]);
		expect(stored.stepDefinitions.then.map(s => s.values[0])).toEqual([then]);

		// WHY: a reload at '/' does not reopen the scenario, so the deep link is the reload used here
		await stories.gotoScenario(storyId, created.scenario_id);
		// The header renders the name through the titlecase pipe, so compare case-insensitively
		await expect(page.locator('#scenarioTitle').locator('visible=true').first()).toContainText(scenarioName, { ignoreCase: true });
		await expect(valueInput(page, 0, 0)).toHaveText(given);
		await expect(valueInput(page, 1, 0)).toHaveText(when);
		await expect(valueInput(page, 2, 0)).toHaveText(then);

		await deleteStory(api, project.id, storyId);
	});

	test('a deleted step and a dragged step are persisted in the new order', async ({ page, api, project }) => {
		const stories = new StoriesPage(page);
		const editor = new StepEditor(page);
		const storyTitle = unique('E2E Delete Story');
		const storyId = await createStory(api, project.id, storyTitle);
		const scenarioName = unique('Scenario Delete');
		const created = await addScenario(api, storyId, scenarioName);
		await seedSteps(api, storyId, created.scenario_id, {
			when: [
				makeStep('when', 'Button', 'I click the button:', 'step-A', 0),
				makeStep('when', 'Button', 'I click the button:', 'step-B', 1),
				makeStep('when', 'Button', 'I click the button:', 'step-C', 2),
			],
		});
		await page.goto('/');
		await new StoriesBar(page).openScenario(storyTitle, scenarioName);

		await page.locator('[id="scenario_1_checkbox_1"]').locator('visible=true').first().check({ force: true });
		await page.locator('[id="scenario_delete_step"]').locator('visible=true').first().click();
		await editor.save();
		await expect.poll(async () => (await fetchScenario(api, storyId, created.scenario_id)).stepDefinitions.when.map(s => s.values[0])).toEqual(['step-A', 'step-C']);

		const rowC = page.locator('[cdkDrag]').filter({ hasText: 'step-C' }).locator('.dragIconContainer').locator('visible=true').first();
		const rowA = page.locator('[cdkDrag]').filter({ hasText: 'step-A' }).locator('.dragIconContainer').locator('visible=true').first();
		await dragHandleOnto(page, rowC, rowA);
		await editor.save();
		await expect.poll(async () => (await fetchScenario(api, storyId, created.scenario_id)).stepDefinitions.when.map(s => s.values[0])).toEqual(['step-C', 'step-A']);

		// WHY: a reload at '/' does not reopen the scenario, so the deep link is the reload used here
		await stories.gotoScenario(storyId, created.scenario_id);
		await expect(valueInput(page, 1, 0)).toHaveText('step-C');
		await expect(valueInput(page, 1, 1)).toHaveText('step-A');

		await deleteStory(api, project.id, storyId);
	});

	test('a background set on the story stays when a scenario is saved', async ({ page, api, project }) => {
		const editor = new StepEditor(page);
		const storyTitle = unique('E2E Background Story');
		const storyId = await createStory(api, project.id, storyTitle);
		const scenarioName = unique('Scenario Background');
		const created = await addScenario(api, storyId, scenarioName);
		const backgroundName = unique('E2E Background');
		const background = {
			name: backgroundName,
			stepDefinitions: { when: [makeStep('when', 'Button', 'I click the button:', 'bg-step', 0)] },
			saved: true,
		};
		const put = await api.put(`${API_URL}/background/${storyId}`, { data: background });
		expect(put.status()).toBe(200);

		await page.goto('/');
		await new StoriesBar(page).openScenario(storyTitle, scenarioName);
		await page.locator('mat-expansion-panel-header').filter({ hasText: 'Background (Optional)' }).first().click();
		await expect(page.getByText(backgroundName).first()).toBeVisible();

		await editor.addStep('given', 'Website / URL');
		await editor.fillValue('given', 0, 'https://example.com');
		await editor.save();
		await expect.poll(async () => (await fetchScenario(api, storyId, created.scenario_id)).stepDefinitions.given.length).toBe(1);

		const story = await getStory(api, storyId) as { background?: { name: string; stepDefinitions: { when: StepDto[] } } };
		expect(story.background?.name).toBe(backgroundName);
		expect(story.background?.stepDefinitions.when.map(s => s.values[0])).toEqual(['bg-step']);
		// WHY: createStory seeds the default "New Scenario", so the scenario added here makes two
		expect((await getScenarios(api, storyId)).length).toBe(2);

		await deleteStory(api, project.id, storyId);
	});

	test('a multiple-scenarios table created in the editor is persisted with its first column', async ({ page, api, project }) => {
		const editor = new StepEditor(page);
		const storyTitle = unique('E2E Examples Story');
		const storyId = await createStory(api, project.id, storyTitle);
		const [defaultScenario] = await getScenarios(api, storyId);
		await page.goto('/');
		await new StoriesBar(page).openScenario(storyTitle, defaultScenario.name);

		await page.locator('[id="example_add_step0"]').locator('visible=true').first().click();
		await page.locator('#newTitle').locator('visible=true').first().pressSequentially('Alpha', { delay: 70 });
		await page.locator('#submitExample').locator('visible=true').first().click();
		await expect(page.locator('app-example-table').getByText('Alpha').first()).toBeVisible();

		await editor.save();
		await expect.poll(async () => (await fetchScenario(api, storyId, defaultScenario.scenario_id)).multipleScenarios?.[0]?.values).toEqual(['Alpha']);

		await deleteStory(api, project.id, storyId);
	});

	test('unsaved step edits trigger a warning when navigating to another story', async ({ page, api, project }) => {
		const editor = new StepEditor(page);
		const storyTitle = unique('E2E Unsaved Story');
		const storyId = await createStory(api, project.id, storyTitle);
		const otherTitle = unique('E2E Other Story');
		await createStory(api, project.id, otherTitle);
		const scenarioName = unique('Scenario Unsaved');
		const created = await addScenario(api, storyId, scenarioName);
		await page.goto('/');
		await new StoriesBar(page).openScenario(storyTitle, scenarioName);

		await editor.addStep('given', 'Website / URL');
		await editor.fillValue('given', 0, 'ungespeichert');
		await page.locator('#storyList').filter({ hasText: otherTitle }).first().click();

		await expect(page.locator('mat-dialog-container, ngb-modal-window').first()).toBeVisible();
		expect((await fetchScenario(api, storyId, created.scenario_id)).stepDefinitions.given).toHaveLength(0);
	});

	test('a stale story PUT from a second tab does not overwrite the first tab edit', async ({ api, project }) => {
		const storyId = await createStory(api, project.id, unique('E2E Two Tabs'));
		const snapshot = await getStory(api, storyId) as unknown as { title: string; body: string; scenarios: unknown[] };
		const tabA = await api.put(`${API_URL}/story/${storyId}`, { data: { ...snapshot, body: 'edited in tab A' } });
		expect(tabA.status()).toBe(200);

		const tabB = await api.put(`${API_URL}/story/${storyId}`, { data: { ...snapshot, body: 'stale from tab B' } });
		const stored = await getStory(api, storyId) as unknown as { body: string };
		if (tabB.ok())
			expect(stored.body).toBe('edited in tab A');
		else
			expect([409, 412]).toContain(tabB.status());

		await deleteStory(api, project.id, storyId);
	});
});
