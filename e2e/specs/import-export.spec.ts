import type { BlockRecord, ImportedStory } from '../helpers/import-export';
import { getBlocks, getStories } from '../helpers/api';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { test, expect } from '../fixtures';
import { deleteProject } from '../helpers/api';
import { API_URL } from '../helpers/config';
import { AppPage } from '../pages/app';
import { StoriesBar } from '../pages/stories-bar';
import {
	FIXTURE_TITLES,
	FIXTURE_ZIP,
	findRepoId,
	importNewProjectViaUi,
	listGroups,
	openNewProjectImportModal,
	unpackZipText,
	uploadArchive,
} from '../helpers/import-export';

/**
 * Project ids created by a running test (UI imports and API uploads), deleted in afterEach.
 * WHY: module state is safe because the suite runs with one worker; the ids are only known after the import.
 */
const createdIds: string[] = [];

/**
 * Builds a project name that is unique per run and readable in the list.
 * @param label Short label that identifies the test.
 * @returns Name with a timestamp and random suffix.
 */
function uniqueName(label: string): string {
	return `E2E import ${label} ${new Date().toISOString()} ${randomBytes(3).toString('hex')}`;
}

/**
 * Registers a project id for teardown and returns it, so the caller can chain it.
 * @param id Project id to delete after the test.
 * @returns The same id.
 */
function track(id: string): string {
	createdIds.push(id);
	return id;
}

test.afterEach(async ({ api }) => {
	// Irreversible on the server, but only for projects this spec imported. deleteProject treats 404 as success.
	for (const id of createdIds.splice(0))
		await deleteProject(api, id);
});

test('importing the fixture zip as a new project shows a success toast and lists the project', async ({ page, api }) => {
	const name = uniqueName('new');
	await new AppPage(page).gotoAccount();
	await importNewProjectViaUi(page, FIXTURE_ZIP, name);

	await expect(page.locator('.snackbar-success')).toContainText('imported successfully');
	await expect(page.locator('#DBRepositoriesList a.repoLink', { hasText: name })).toBeVisible();

	const repoId = await findRepoId(api, name);
	expect(repoId, 'imported project is stored in GET /repository/').toBeDefined();
	track(repoId!);
});

test('an imported project shows its 11 stories in fixture order, persists a step edit, and has its groups and blocks', async ({ page, api }) => {
	const name = uniqueName('open');
	await new AppPage(page).gotoAccount();
	await importNewProjectViaUi(page, FIXTURE_ZIP, name);
	const repoId = track((await findRepoId(api, name))!);

	// Selecting the project from the list is the real path into the stories view
	await page.locator('#DBRepositoriesList a.repoLink', { hasText: name }).click();
	await expect.poll(() => page.evaluate(() => window.localStorage.getItem('repository'))).toBe(name);
	await new AppPage(page).gotoHome();

	// Stories bar: the group entries share the storyListLink class, so exclude them
	const storyLinks = page.locator('a.storyListLink:not(.groupLinkList)');
	await expect(storyLinks).toHaveCount(FIXTURE_TITLES.length);
	for (const [index, title] of FIXTURE_TITLES.entries())
		await expect(storyLinks.nth(index)).toContainText(title);

	// Scenario names come from the API: the stories bar only lists scenarios of an expanded story
	const stories = await getStories<ImportedStory>(api, repoId);
	const storiesBar = new StoriesBar(page);
	const firstScenarioName = (title: string): string => stories.find(story => story.title === title)!.scenarios[0].name;

	// Open the first two stories and check that their scenarios and steps render
	for (const title of FIXTURE_TITLES.slice(0, 2)) {
		await storiesBar.openScenario(title, firstScenarioName(title));
		await expect(page.locator('[contenteditable="true"]').first()).toBeVisible();
	}

	// Edit a step value of the first story (its fixture data carries legacy nulls) and save the scenario
	const lemma = stories.find(story => story.title === 'Lemma')!;
	const token = `edit${randomBytes(3).toString('hex')}`;
	const scenarioId = lemma.scenarios[0].scenario_id;
	await storiesBar.openScenario('Lemma', firstScenarioName('Lemma'));
	const stepValue = page.locator('[id="scenario_0_input_pre_0"]').locator('visible=true').first();
	await stepValue.click();
	await page.keyboard.press('End');
	// WHY: 70 ms per key like the other specs. With no delay the highlighter re-renders the contenteditable on every
	// input and the caret jumps, so the typed characters land in the wrong place and the PUT carries a scrambled value.
	await stepValue.pressSequentially(` ${token}`, { delay: 70 });

	const [putRequest, saved] = await Promise.all([
		page.waitForRequest(r => r.method() === 'PUT' && r.url().endsWith(`/story/${lemma._id}/${scenarioId}`)),
		page.waitForResponse(r => r.url().endsWith(`/story/${lemma._id}/${scenarioId}`) && r.request().method() === 'PUT'),
		page.locator('button#saveButton[matTooltip="Save Scenario"]').locator('visible=true').first().click(),
	]);
	expect(saved.status()).toBeGreaterThanOrEqual(200);
	expect(saved.status()).toBeLessThan(300);
	// The edit must already be in the request the UI sends, not only in the DOM
	expect(putRequest.postData() ?? '', 'PUT body carries the typed token').toContain(token);

	// Persisted, not only shown: the saved step value must come back from the API
	const reloaded = (await getStories<ImportedStory>(api, repoId)).find(story => story.title === 'Lemma')!;
	expect(JSON.stringify(reloaded.scenarios)).toContain(token);

	// Groups: LemmaTest holds exactly the three stories Lemma, GitHub and AutomationTesting
	const groups = await listGroups(api, repoId);
	expect(groups.map(group => group.name).sort()).toEqual(['Lemma1', 'Lemma2', 'Lemma3', 'LemmaTest']);
	const lemmaTest = groups.find(group => group.name === 'LemmaTest')!;
	const membersByTitle = (await getStories<ImportedStory>(api, repoId))
		.filter(story => lemmaTest.member_stories.includes(story._id))
		.map(story => story.title)
		.sort();
	expect(membersByTitle).toEqual(['AutomationTesting', 'GitHub', 'Lemma']);

	// Blocks: the fixture has two custom blocks
	const blocks = await getBlocks<BlockRecord>(api, repoId);
	expect(blocks.map(block => block.name).sort()).toEqual(['Amadaro', 'ben']);
});

test('exporting a project downloads a zip without secrets, and importing that export gives the same 11 stories', async ({ page, api }) => {
	const name = uniqueName('export');
	await new AppPage(page).gotoAccount();
	await importNewProjectViaUi(page, FIXTURE_ZIP, name);
	track((await findRepoId(api, name))!);

	// Export is for the project chosen in the "Download Project" dropdown
	await page.locator('.dropDownProject mat-select').click();
	await page.getByRole('option', { name, exact: true }).click();
	const [download] = await Promise.all([
		page.waitForEvent('download'),
		page.getByRole('button', { name: 'Export', exact: true }).click(),
	]);
	// WHY: Chromium replaces Windows-invalid filename characters (here the colons of the ISO timestamp) with "_"
	expect(download.suggestedFilename()).toBe(`${name.replace(/[<>:"/\\|?*]/g, '_')}-export.zip`);

	const zipBuffer = readFileSync((await download.path())!);
	const files = unpackZipText(zipBuffer);
	const paths = [...files.keys()];
	expect(paths.some(p => p.startsWith('stories/'))).toBe(true);
	expect(paths.some(p => p.startsWith('groups/'))).toBe(true);
	expect(paths.some(p => p.startsWith('blocks/'))).toBe(true);
	expect(paths).toContain('repository.json');
	for (const [file, text] of files)
		expect(text, `${file} must not contain an apiKey`).not.toContain('apiKey');

	// Importing the export as a second new project restores the same 11 titles
	const copyName = uniqueName('export-copy');
	const copy = await uploadArchive(api, 'POST', `?projectName=${encodeURIComponent(copyName)}`, zipBuffer, `${name}-export.zip`);
	expect(copy.status, copy.body).toBe(200);
	const copyId = track((await findRepoId(api, copyName))!);
	const titles = (await getStories<ImportedStory>(api, copyId)).map(story => story.title);
	expect(titles).toEqual(FIXTURE_TITLES);
});

test('importing the fixture into an existing project doubles the stories with unique titles and issue numbers', async ({ api }) => {
	const name = uniqueName('existing');
	const created = await uploadArchive(api, 'POST', `?projectName=${encodeURIComponent(name)}`, readFileSync(FIXTURE_ZIP));
	expect(created.status, created.body).toBe(200);
	const repoId = track((await findRepoId(api, name))!);

	const merged = await uploadArchive(api, 'PUT', `?repo_id=${repoId}&importMode=true`, readFileSync(FIXTURE_ZIP));
	expect(merged.status, merged.body).toBe(200);

	const stories = await getStories<ImportedStory>(api, repoId);
	expect(stories).toHaveLength(FIXTURE_TITLES.length * 2);
	// Rename mode: colliding titles get a suffix, so every title is distinct
	expect(new Set(stories.map(story => story.title)).size).toBe(stories.length);
	for (const title of FIXTURE_TITLES)
		expect(stories.some(story => story.title !== title && story.title.startsWith(title))).toBe(true);
	expect(new Set(stories.map(story => story.issue_number)).size).toBe(stories.length);

	// Blocks imported into an existing project must name this project as their repository
	const blocks = await getBlocks<BlockRecord>(api, repoId);
	expect(blocks).toHaveLength(4);
	for (const block of blocks)
		expect(block.repository, `block "${block.name}" repository`).toBe(name);
});

test('uploading a malformed file renamed to .zip shows a readable error and creates no project', async ({ page, api }) => {
	const name = uniqueName('malformed');
	const before = (await api.get(`${API_URL}/repository/`).then(r => r.json())) as { repoName: string }[];
	await new AppPage(page).gotoAccount();

	const dialog = await openNewProjectImportModal(page);
	await dialog.locator('input[type=file][name=fileInput]').setInputFiles({
		name: 'not-a-zip.zip',
		mimeType: 'application/zip',
		buffer: Buffer.from('this is plain text, not a zip archive\n'),
	});
	await dialog.locator('.projectNameInput').pressSequentially(name);
	await dialog.locator('.modal-footer').getByRole('button', { name: 'Import', exact: true }).click();

	const toast = page.locator('.snackbar-error');
	await expect(toast).toBeVisible();
	await expect(toast).not.toHaveText(/^\s*$/);
	await expect(toast).not.toContainText('undefined');

	const after = (await api.get(`${API_URL}/repository/`).then(r => r.json())) as { repoName: string }[];
	expect(after.length).toBe(before.length);
	expect(after.some(repo => repo.repoName === name)).toBe(false);
});
