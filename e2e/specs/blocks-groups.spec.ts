import { randomBytes } from 'node:crypto';
import type { APIRequestContext, Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import { createStory, getStory, getBlocks, type BlockDto } from '../helpers/api';
import { API_URL } from '../helpers/config';
import { StoriesBar } from '../pages/stories-bar';
import { StepEditor } from '../pages/step-editor';

/** Group as returned by GET /api/group/:repo_id; only the fields the suite reads. */
interface GroupDto {
	_id: string;
	name: string;
	member_stories: string[];
	[key: string]: unknown;
}

/** Scenario as stored in a story; only the identity and step fields the suite reads or writes. */
interface ScenarioLike {
	scenario_id: number;
	stepDefinitions: { given: unknown[]; when: unknown[] };
	[key: string]: unknown;
}

/** Unique suffix so titles never clash with leftovers from other runs or parallel workers. */
function unique(label: string): string {
	return `${label} ${randomBytes(3).toString('hex')}`;
}

/**
 * Builds a single given step with a marker value, so the test can find the step inside stored JSON.
 * @param marker Text stored in the step values.
 */
function makeStep(marker: string) {
	return { id: 1, pre: 'Given', mid: 'the marker step', values: [marker], type: 'marker', stepType: 'given' };
}

/**
 * Creates a saved block through POST /api/block/ and returns its id.
 * WHY: a 201 check here keeps a failed arrange from surfacing later as an undefined block id.
 * @param api Request context with the session cookie.
 * @param repoId Project id.
 * @param repoName Project name stored on the block.
 * @param name Block name.
 * @param marker Marker text for the single given step.
 * @returns Id of the saved block.
 */
async function createBlock(api: APIRequestContext, repoId: string, repoName: string, name: string, marker: string): Promise<string> {
	const response = await api.post(`${API_URL}/block/`, {
		data: { repositoryId: repoId, name, repository: repoName, source: 'db', stepDefinitions: { given: [makeStep(marker)], when: [], then: [] } },
	});
	if (response.status() !== 201) throw new Error(`createBlock failed: HTTP ${response.status()} ${await response.text()}`);
	return ((await response.json()) as { insertedId: string }).insertedId;
}

/**
 * Adds a scenario to a story and fills its given section, through the same PUT route the editor uses.
 * WHY: the editor saves the whole scenario object, so the existing object is read first and only the steps change.
 * @param api Request context with the session cookie.
 * @param storyId Story to extend.
 * @param name Scenario name.
 * @param marker Marker text for the single given step.
 * @returns Scenario id.
 */
async function addScenarioWithStep(api: APIRequestContext, storyId: string, name: string, marker: string): Promise<number> {
	const created = await api.post(`${API_URL}/story/${storyId}`, { data: { name } });
	expect(created.status()).toBe(201);
	const story = await getStory(api, storyId);
	const scenario = (story.scenarios as ScenarioLike[]).at(-1)!;
	scenario.stepDefinitions.given = [makeStep(marker)];
	const updated = await api.put(`${API_URL}/story/${storyId}/${scenario.scenario_id}`, { data: scenario });
	if (updated.status() !== 200) throw new Error(`scenario PUT ${updated.status()}: ${await updated.text()}`);
	return scenario.scenario_id;
}

/**
 * Opens a scenario of a story in the scenario editor from the home page.
 * @param page Page to drive.
 * @param storyTitle Title of the story in the stories bar.
 * @param scenarioName Name of the scenario in the expanded story.
 */
async function openScenario(page: Page, storyTitle: string, scenarioName: string): Promise<void> {
	await page.goto('/');
	await new StoriesBar(page).openScenario(storyTitle, scenarioName);
	await expect(page.locator('input[id^="scenario_"][id*="_checkbox_"]:not([id$="_checkbox_all"])').first()).toBeVisible();
}

/**
 * Opens the saved-block manager (#add_block) of the open scenario and waits for the block list.
 * @param page Page with a scenario open in the editor.
 */
async function openBlockManager(page: Page): Promise<void> {
	await page.locator('#add_block').locator('visible=true').click();
	await expect(page.locator('mat-dialog-container mat-selection-list')).toBeVisible();
}

test.describe('saved blocks', () => {
	test('save button stays disabled without a name and a duplicate name is refused', async ({ page, api, project }) => {
		const storyTitle = unique('E2E Block Source');
		const storyId = await createStory(api, project.id, storyTitle);
		const scenarioName = unique('Scenario Save');
		await addScenarioWithStep(api, storyId, scenarioName, 'save-marker');
		await openScenario(page, storyTitle, scenarioName);

		await page.locator('input[id^="scenario_"][id*="_checkbox_"]:not([id$="_checkbox_all"])').first().click();
		await page.locator('button[matTooltip="Save Steps as Block"]').locator('visible=true').first().click();

		const dialog = page.locator('mat-dialog-container');
		const submit = dialog.getByRole('button', { name: 'Submit' });
		await expect(page.locator('#blockNameInput')).toBeVisible();
		await expect(submit).toBeDisabled();

		const blockName = unique('E2E Block');
		await page.locator('#blockNameInput').pressSequentially(blockName);
		await expect(submit).toBeEnabled();
		await submit.click();
		await expect(dialog).toBeHidden();

		const blocks = await getBlocks(api, project.id);
		const saved = blocks.find((b: BlockDto) => b.name === blockName);
		expect(saved, 'block persisted under the typed name').toBeDefined();

		// WHY: after a successful save the editor turns the selected steps into block references, so the second attempt starts from a freshly opened scenario
		await openScenario(page, storyTitle, scenarioName);
		await page.locator('input[id^="scenario_"][id*="_checkbox_"]:not([id$="_checkbox_all"])').first().click();
		await page.locator('button[matTooltip="Save Steps as Block"]').locator('visible=true').first().click();
		await page.locator('#blockNameInput').pressSequentially(blockName);
		await dialog.getByRole('button', { name: 'Submit' }).click();
		await expect(page.getByText('This name exists already')).toBeVisible();
		await expect(dialog).toBeVisible();

		const afterDuplicate = await getBlocks(api, project.id);
		expect(afterDuplicate.filter((b: BlockDto) => b.name === blockName)).toHaveLength(1);

		await api.delete(`${API_URL}/block/${saved!._id}`);
	});

	test('a saved block inserted into another scenario is stored with its steps', async ({ page, api, project }) => {
		// Regression: inserting a saved block must offer Save Scenario; an in-place `saved = false` does not re-render an OnPush header
		const marker = unique('insert-marker');
		const sourceTitle = unique('E2E Block Origin');
		const sourceId = await createStory(api, project.id, sourceTitle);
		await addScenarioWithStep(api, sourceId, 'Origin', marker);
		const targetTitle = unique('E2E Block Target');
		const targetId = await createStory(api, project.id, targetTitle);
		const targetScenario = unique('Scenario Target');
		const targetScenarioId: number = await addScenarioWithStep(api, targetId, targetScenario, 'target-marker');

		const blockName = unique('E2E Insert Block');
		const saved = await api.post(`${API_URL}/block/`, {
			data: {
				repositoryId: project.id,
				name: blockName,
				repository: project.name,
				source: 'db',
				stepDefinitions: { given: [makeStep(marker)], when: [], then: [] },
			},
		});
		expect(saved.status()).toBe(201);
		const blockId = ((await saved.json()) as { insertedId: string }).insertedId;

		await openScenario(page, targetTitle, targetScenario);
		await openBlockManager(page);
		await page.getByRole('option', { name: blockName }).click();
		await page.getByRole('button', { name: 'Add Block' }).click();
		await expect(page.locator('mat-dialog-container')).toBeHidden();

		// WHY: Add Block marks the scenario unsaved, so Save Scenario must be offered before the user saves the inserted block
		await expect(page.locator('button#saveButton[matTooltip="Save Scenario"]').locator('visible=true')).toBeVisible();
		// WHY: StepEditor.save waits for the PUT 2xx and the "Without changes" state, so a failed save fails with its HTTP status
		await new StepEditor(page).save();
		await expect(page.locator('#saveButton')).toBeDisabled();

		// WHY: a saved scenario stores a _blockReferenceId for the inserted block, not a copy of its steps; the block's own steps hold the marker
		const story = await getStory(api, targetId);
		const scenario = (story.scenarios as ScenarioLike[]).find(s => s.scenario_id === targetScenarioId)!;
		const whenReferences = (scenario.stepDefinitions.when as { _blockReferenceId?: string }[]).map(s => s._blockReferenceId);
		expect(whenReferences).toContain(blockId);
		expect(JSON.stringify(scenario.stepDefinitions.given)).toContain('target-marker');
		const storedBlock = (await getBlocks(api, project.id)).find(b => b._id === blockId);
		expect(JSON.stringify(storedBlock?.stepDefinitions)).toContain(marker);

		await api.delete(`${API_URL}/block/${blockId}`);
	});

	test('a block can be renamed in the block manager', async ({ page, api, project }) => {
		// Regression: a rename must keep the block in its project; an update that replaces the document without repositoryId moves it out
		const storyTitle = unique('E2E Block Rename');
		const storyId = await createStory(api, project.id, storyTitle);
		const scenarioName = unique('Scenario Rename');
		await addScenarioWithStep(api, storyId, scenarioName, 'rename-marker');
		const oldName = unique('E2E Old Name');
		const blockId = await createBlock(api, project.id, project.name, oldName, 'rename-marker');

		await openScenario(page, storyTitle, scenarioName);
		await openBlockManager(page);
		await page.getByRole('option', { name: oldName }).click();
		await page.getByTitle('Change Block Title').click();

		const newName = unique('E2E New Name');
		const input = page.locator('#blockTitleChange');
		await input.click();
		await page.keyboard.press('ControlOrMeta+A');
		await page.keyboard.press('Delete');
		await input.pressSequentially(newName);
		await page.locator('#saveBlockButton').click();
		await expect(page.getByText('successfully saved')).toBeVisible();

		const blocks = await getBlocks(api, project.id);
		expect(blocks.find(b => b._id === blockId)?.name).toBe(newName);

		await api.delete(`${API_URL}/block/${blockId}`);
	});

	test('a block deleted after confirmation is gone from the API', async ({ page, api, project }) => {
		const storyTitle = unique('E2E Block Delete');
		const storyId = await createStory(api, project.id, storyTitle);
		const scenarioName = unique('Scenario Delete');
		await addScenarioWithStep(api, storyId, scenarioName, 'delete-marker');
		const blockName = unique('E2E Delete Block');
		const blockId = await createBlock(api, project.id, project.name, blockName, 'delete-marker');

		await openScenario(page, storyTitle, scenarioName);
		await openBlockManager(page);
		await page.getByRole('option', { name: blockName }).click();
		await page.locator('#deleteBlock').click();
		// WHY: mat-dialog-container, not role=dialog: getByRole('dialog') does not match this confirm dialog, and the Add Block modal is also open underneath
		const confirm = page.locator('mat-dialog-container').filter({ hasText: 'Delete Block' }).locator('button', { hasText: /^\s*Delete\s*$/ });
		await expect(confirm).toBeVisible();
		await confirm.click();
		await expect(page.getByText('Block deleted')).toBeVisible();

		const blocks = await getBlocks(api, project.id);
		expect(blocks.some(b => b._id === blockId)).toBe(false);
	});
});

test.describe('groups', () => {
	/**
	 * Opens the Groups tab of the stories bar on the home page.
	 * @param page Page to drive.
	 */
	async function openGroupsTab(page: Page): Promise<void> {
		await page.goto('/');
		await page.getByRole('tab', { name: /groups/i }).click();
	}

	/**
	 * Lists the groups of the project through the API.
	 * @param api Request context with the session cookie.
	 * @param repoId Project id.
	 */
	async function getGroups(api: APIRequestContext, repoId: string): Promise<GroupDto[]> {
		const response = await api.get(`${API_URL}/group/${repoId}`);
		expect(response.status()).toBe(200);
		return (await response.json()) as GroupDto[];
	}

	test('a group with two stories is created; empty and duplicate names are refused', async ({ page, api, project }) => {
		const titleA = unique('E2E Group Story A');
		const titleB = unique('E2E Group Story B');
		const idA = await createStory(api, project.id, titleA);
		const idB = await createStory(api, project.id, titleB);

		await openGroupsTab(page);
		await page.locator('#createNewGroupDiv button').click();
		const submit = page.locator('#submitCreateNewGroup');
		await expect(submit).toBeDisabled();

		await page.locator('input[id="check_' + titleA + '"]').check();
		await page.locator('input[id="check_' + titleB + '"]').check();

		const groupName = unique('E2E Group');
		await page.locator('#grouptitle').pressSequentially(groupName);
		await expect(submit).toBeEnabled();
		await submit.click();

		await expect.poll(async () => (await getGroups(api, project.id)).map(g => g.name)).toContain(groupName);
		const created = (await getGroups(api, project.id)).find(g => g.name === groupName)!;
		expect([...created.member_stories].sort()).toEqual([idA, idB].sort());

		await openGroupsTab(page);
		await page.locator('#createNewGroupDiv button').click();
		await page.locator('#grouptitle').pressSequentially(groupName);
		await expect(page.getByText('already in use')).toBeVisible();
		await expect(page.locator('#submitCreateNewGroup')).toBeDisabled();
		await page.keyboard.press('Escape');

		await api.delete(`${API_URL}/group/${project.id}/${created._id}`);
	});

	test('a story removed from a group is removed in the API, and the group can be deleted', async ({ page, api, project }) => {
		const titleA = unique('E2E Edit Story A');
		const titleB = unique('E2E Edit Story B');
		const idA = await createStory(api, project.id, titleA);
		const idB = await createStory(api, project.id, titleB);
		const groupName = unique('E2E Edit Group');
		const created = await api.post(`${API_URL}/group/${project.id}`, {
			data: { name: groupName, member_stories: [idA, idB], sequence: false },
		});
		expect(created.status()).toBe(201);
		const groupId = (await getGroups(api, project.id)).find(g => g.name === groupName)!._id;

		await openGroupsTab(page);
		await page.locator('#groupEdit').locator('visible=true').first().click();
		// WHY: the update modal's story table has no checkbox ids (only the create modal sets id="check_<title>"), so the row is located by its title
		await page.locator('#storiesTable tr').filter({ hasText: titleB }).locator('input[type="checkbox"]').uncheck();
		await page.locator('#submitUpdateGroup').click();

		await expect.poll(async () => (await getGroups(api, project.id)).find(g => g._id === groupId)?.member_stories).toEqual([idA]);

		await openGroupsTab(page);
		await page.locator('#groupEdit').locator('visible=true').first().click();
		// WHY: the update-group Delete button deletes at once (update-group.component.ts deleteGroup) and closes the modal, so there is no confirm step
		await page.getByRole('button', { name: 'Delete', exact: true }).locator('visible=true').click();

		await expect.poll(async () => (await getGroups(api, project.id)).some(g => g._id === groupId)).toBe(false);
	});
});
