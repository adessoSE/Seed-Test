import type { APIRequestContext } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { test, expect } from '../fixtures';
import { createProject, createStory, deleteProject } from '../helpers/api';
import { API_URL } from '../helpers/config';
import { AppPage } from '../pages/app';
import { ProjectsPage } from '../pages/projects';

/** Project as returned by GET /api/repository/ (only the fields this spec reads). */
interface RepoDto {
	_id: string;
	repoName: string;
	settings?: { stepWaitTime?: number; width?: number; height?: number };
}

/**
 * Projects created during the running test, deleted in afterEach.
 * WHY: module state is safe because the suite runs with one worker; UI-created projects are only known after the list loads.
 */
const createdIds: string[] = [];

/**
 * Builds a project name that is unique per run and readable in the list.
 * @param label Short label that identifies the test in the list.
 * @returns Name with a timestamp and random suffix.
 */
function uniqueName(label: string): string {
	return `E2E ${label} ${new Date().toISOString()} ${randomBytes(3).toString('hex')}`;
}

/**
 * Lists the projects of the test user through the API.
 * @param api Request context with the session cookie.
 * @returns All projects of the user.
 */
async function listRepos(api: APIRequestContext): Promise<RepoDto[]> {
	const response = await api.get(`${API_URL}/repository/`);
	expect(response.status()).toBe(200);
	return (await response.json()) as RepoDto[];
}

/**
 * Finds one project by exact name through the API.
 * @param api Request context with the session cookie.
 * @param name Exact project name.
 * @returns The project, or undefined when no project has that name.
 */
async function findRepo(api: APIRequestContext, name: string): Promise<RepoDto | undefined> {
	return (await listRepos(api)).find(repo => repo.repoName === name);
}

test.afterEach(async ({ api }) => {
	// Idempotent: deleteProject treats 404 as success, so projects deleted inside a test are fine
	for (const id of createdIds.splice(0))
		await deleteProject(api, id);
});

test('creating a custom project in the UI keeps the page responsive, lists it, selects it and accepts a story', async ({ page, api }) => {
	const name = uniqueName('ui-create');
	const projects = new ProjectsPage(page);
	await new AppPage(page).gotoAccount();
	await projects.createProjectInUi(name);

	const created = await findRepo(api, name);
	expect(created, 'project is stored in GET /repository/').toBeDefined();
	createdIds.push(created!._id);

	// Regression for an effect loop: the page must answer a follow-up action within 5 s
	await page.getByRole('button', { name: 'Create Custom Project' }).click({ timeout: 5000 });
	await projects.closeCreateModal();

	const selected = await page.evaluate(() => ({
		repository: window.localStorage.getItem('repository'),
		source: window.localStorage.getItem('source'),
		id: window.localStorage.getItem('id'),
	}));
	expect(selected).toEqual({ repository: name, source: 'db', id: created!._id });

	// A story created right after the project lands in that project, not in a null repository
	await new AppPage(page).gotoHome();
	const storyTitle = `E2E story after project ${randomBytes(2).toString('hex')}`;
	await page.locator('#createFirstStory').click();
	const titleInput = page.locator('input#storytitle');
	await titleInput.pressSequentially(storyTitle);
	const [response] = await Promise.all([
		page.waitForResponse(r => r.url() === `${API_URL}/story/` && r.request().method() === 'POST'),
		page.locator('#submitCreateNewStory:visible').click(),
	]);
	expect(response.status()).toBeGreaterThanOrEqual(200);
	expect(response.status()).toBeLessThan(300);

	await expect.poll(async () => {
		const response = await api.get(`${API_URL}/story/`, { params: { source: 'db', id: created!._id } });
		return ((await response.json()) as { title: string }[]).map(story => story.title);
	}).toContain(storyTitle);
});

test('a duplicate project name gives a readable error and creates no second project', async ({ page, api }) => {
	const name = uniqueName('duplicate');
	const first = await createProject(api, name);
	createdIds.push(first.id);

	// API: the backend answers 409 with a readable message
	const duplicate = await api.post(`${API_URL}/repository/`, { data: { name } });
	expect(duplicate.status()).toBe(409);
	expect(((await duplicate.json()) as { error: string }).error).toContain('already own a repository');

	// UI: typing the taken name disables Save and shows the duplicate message
	const projects = new ProjectsPage(page);
	await new AppPage(page).gotoAccount();
	await projects.openCreateModal();
	await projects.typeProjectName(name);
	await expect(projects.saveButton()).toBeDisabled();
	await expect(page.locator('.snackbar-error').filter({ hasText: 'already in use' }).first()).toBeVisible();
	await projects.closeCreateModal();

	const matching = (await listRepos(api)).filter(repo => repo.repoName === name);
	expect(matching).toHaveLength(1);
});

test('a whitespace-only project name keeps Save disabled and sends no request', async ({ page, api }) => {
	const projects = new ProjectsPage(page);
	await new AppPage(page).gotoAccount();
	await projects.openCreateModal();
	const before = (await listRepos(api)).length;

	await projects.typeProjectName('   ');
	await expect(projects.saveButton()).toBeDisabled();
	await projects.closeCreateModal();

	expect((await listRepos(api)).length).toBe(before);
});

test('a project name containing HTML is shown as plain text', async ({ page, api }) => {
	const name = `<b>x</b> ${uniqueName('html')}`;
	const projects = new ProjectsPage(page);
	await new AppPage(page).gotoAccount();
	await projects.createProjectInUi(name);

	const created = await findRepo(api, name);
	expect(created, 'project keeps the raw name in GET /repository/').toBeDefined();
	createdIds.push(created!._id);

	await expect(projects.projectRow(name)).toContainText('<b>x</b>');
	await expect(page.locator('#DBRepositoriesList b')).toHaveCount(0);
});

test('saving project settings without a window size shows success and persists the change', async ({ page, api, project }) => {
	const projects = new ProjectsPage(page);
	await new AppPage(page).gotoAccount();
	await projects.openSettings(project.name);

	// The fixture project has no window size, so the frontend must omit width/height instead of sending 0 (backend 400)
	const waitInput = page.locator('#defaultWaitTimeInput:visible');
	await waitInput.fill('');
	await waitInput.pressSequentially('750');

	const [response] = await Promise.all([
		page.waitForResponse(r => r.url().startsWith(`${API_URL}/repository/settings/${project.id}`) && r.request().method() === 'PUT'),
		page.getByRole('button', { name: 'Save Project' }).click(),
	]);
	expect(response.status()).toBe(200);
	await expect(page.locator('.snackbar-success')).toContainText('successfully saved');
	await expect(page.locator('.snackbar-error')).toHaveCount(0);

	const saved = await findRepo(api, project.name);
	expect(saved?.settings?.stepWaitTime).toBe(750);
	expect(saved?.settings?.width).toBeUndefined();
});

test('renaming a project updates the list and the API', async ({ page, api, project }) => {
	const newName = uniqueName('renamed');
	const projects = new ProjectsPage(page);
	await new AppPage(page).gotoAccount();
	await projects.openSettings(project.name);

	const renameInput = page.locator('#newTitle:visible');
	// The rename field lives on the Ownership tab of the settings modal
	await page.locator('a.nav-link', { hasText: 'Ownership' }).click();
	await renameInput.clear();
	await renameInput.pressSequentially(newName);
	const [response] = await Promise.all([
		page.waitForResponse(r => r.url().startsWith(`${API_URL}/repository/settings/${project.id}`) && r.request().method() === 'PUT'),
		page.locator('#renameProject:visible').click(),
	]);
	expect(response.status()).toBe(200);

	await expect(projects.projectRow(newName)).toBeVisible();
	await expect(page.locator('#DBRepositoriesList')).not.toContainText(project.name);

	expect((await findRepo(api, newName))?._id).toBe(project.id);
	expect(await findRepo(api, project.name)).toBeUndefined();
});

test('deleting a project asks first; cancel keeps it, confirm removes it and its stories', async ({ page, api }) => {
	// Not the selected project: deleting the current project opens the repo switch modal instead
	const other = await createProject(api, uniqueName('delete'));
	createdIds.push(other.id);
	await createStory(api, other.id, 'E2E story of a project to delete');

	const projects = new ProjectsPage(page);
	await new AppPage(page).gotoAccount();
	await projects.openSettings(other.name);

	// The settings modal is a mat-dialog-container too, so the confirm dialog is matched by its title
	const confirm = page.locator('mat-dialog-container').filter({ has: page.locator('[mat-dialog-title]', { hasText: 'Delete Project?' }) });
	await page.getByRole('button', { name: 'Delete Project' }).click();
	await expect(confirm).toContainText('cannot be restored');
	await confirm.locator('button').filter({ hasText: /^\s*Cancel\s*$/ }).click();
	await expect(confirm).toBeHidden();

	expect((await findRepo(api, other.name))?._id).toBe(other.id);
	await expect(projects.projectRow(other.name)).toBeVisible();

	await page.getByRole('button', { name: 'Delete Project' }).click();
	const [response] = await Promise.all([
		page.waitForResponse(r => r.url() === `${API_URL}/repository/${other.id}` && r.request().method() === 'DELETE'),
		confirm.locator('button').filter({ hasText: /^\s*Delete\s*$/ }).click(),
	]);
	expect(response.status()).toBe(200);

	await expect(projects.projectRow(other.name)).toHaveCount(0);
	expect(await findRepo(api, other.name)).toBeUndefined();

	// A deleted project's stories must answer with a client error (not found), never a server error
	const stories = await api.get(`${API_URL}/story/`, { params: { source: 'db', id: other.id } });
	expect(stories.status()).toBeGreaterThanOrEqual(400);
	expect(stories.status()).toBeLessThan(500);
});
