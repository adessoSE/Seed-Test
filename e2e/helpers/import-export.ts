import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { API_URL, FIXTURES_DATA_DIR } from './config';

/** Minimal view of an adm-zip entry, as used by unpackZipText. */
interface ZipEntry {
	entryName: string;
	isDirectory: boolean;
	getData(): Buffer;
}

// WHY: adm-zip is resolved from the e2e package location (and up to the workspace node_modules) instead of a PATH tool.
// Windows bsdtar and GNU tar on PATH disagree on zip input and on absolute paths, so the unzip result depended on the machine.
const AdmZip: new (buffer: Buffer) => { getEntries(): ZipEntry[] } = createRequire(import.meta.url)('adm-zip');

/** Sample export of the import fixture (apiKey removed), 11 stories, 4 groups, 2 blocks. */
export const FIXTURE_ZIP = path.join(FIXTURES_DATA_DIR, 'SeedE2EImport.zip');

/** Story titles of the fixture in repository.json order. */
export const FIXTURE_TITLES = [
	'Lemma', 'papaya', 'Testomatico', 'Dropdown Test', 'MulSce Test', 'Lebenswelten',
	'Lebenswelt2', 'WhichBrowser', 'GitHub', 'AutomationTesting', 'Adtime',
];

/** Story as returned by GET /api/story/ (only the fields the spec reads). */
export interface ImportedStory {
	_id: string;
	title: string;
	issue_number: number;
	scenarios: { scenario_id: number; name: string; stepDefinitions: Record<string, unknown> }[];
	[key: string]: unknown;
}

/** Group as returned by GET /api/group/:repo_id. */
export interface GroupDto {
	_id: string;
	name: string;
	member_stories: string[];
}

/** Block as returned by GET /api/block/getBlocks/:repoId. */
export interface BlockRecord {
	_id: string;
	name: string;
	repository?: string;
	repositoryId?: string;
}

/** Repository entry as returned by GET /api/repository/ (only the fields the spec reads). */
interface RepoEntry {
	_id: string;
	repoName: string;
}

/**
 * Lists the projects of the logged-in user.
 * @param api Request context with the session cookie.
 * @returns All projects of the user.
 */
export async function listRepos(api: APIRequestContext): Promise<RepoEntry[]> {
	const response = await api.get(`${API_URL}/repository/`);
	expect(response.status()).toBe(200);
	return (await response.json()) as RepoEntry[];
}

/**
 * Finds the project id of a project by exact name.
 * @param api Request context with the session cookie.
 * @param name Exact project name.
 * @returns The project id, or undefined when no project has that name.
 */
export async function findRepoId(api: APIRequestContext, name: string): Promise<string | undefined> {
	return (await listRepos(api)).find(repo => repo.repoName === name)?._id;
}

/**
 * Uploads a zip through the import route (multipart field `file`, MIME application/zip as the backend requires).
 * @param api Request context with the session cookie.
 * @param method POST creates a project (query projectName), PUT imports into an existing one (query repo_id, importMode).
 * @param query Query string including the leading `?`.
 * @param buffer Zip bytes.
 * @param fileName Name sent in the multipart part.
 * @returns The HTTP status and body text.
 */
export async function uploadArchive(
	api: APIRequestContext,
	method: 'POST' | 'PUT',
	query: string,
	buffer: Buffer,
	fileName = 'SeedE2EImport.zip',
): Promise<{ status: number; body: string }> {
	const multipart = { file: { name: fileName, mimeType: 'application/zip', buffer } };
	const url = `${API_URL}/story/upload/import/${query}`;
	const response = method === 'POST' ? await api.post(url, { multipart }) : await api.put(url, { multipart });
	return { status: response.status(), body: await response.text() };
}

/**
 * Lists the groups of a project through the API.
 * @param api Request context with the session cookie.
 * @param repoId Project id.
 * @returns Groups of the project.
 */
export async function listGroups(api: APIRequestContext, repoId: string): Promise<GroupDto[]> {
	const response = await api.get(`${API_URL}/group/${repoId}`);
	expect(response.status()).toBe(200);
	return (await response.json()) as GroupDto[];
}

/**
 * Reads every file of a zip in memory and returns its relative path and text content.
 * WHY: the content is searched for secrets, so binary files are read as text too. Entries are kept in zip order.
 * @param zipBuffer Zip bytes to unpack.
 * @returns Map from relative POSIX path (zip entry name) to file text.
 */
export function unpackZipText(zipBuffer: Buffer): Map<string, string> {
	const files = new Map<string, string>();
	for (const entry of new AdmZip(zipBuffer).getEntries()) {
		if (!entry.isDirectory)
			files.set(entry.entryName, entry.getData().toString('utf8'));
	}
	return files;
}

/**
 * Opens the account page Import modal and switches it to "New Project" mode, so the project name input is shown.
 * WHY: the modal opens in "Existing Project" mode by default (import-modal.component.ts isNewProject = false),
 * and `.projectNameInput` is only rendered in new-project mode. The modal is a MatDialog, so its root is
 * `mat-dialog-container`; `.modal-content` does not exist in this app.
 * @param page Page on the account page.
 * @returns Locator of the open dialog, scoped to the modal's own elements.
 */
export async function openNewProjectImportModal(page: Page): Promise<Locator> {
	// WHY: the account page renders its project list only after GET /repository/ answers (@if (repositories()));
	// clicking Import before that raced the page load and timed out in the first test of a run (flaky).
	await expect(page.locator('div.grid_customRepos.repositories')).toBeVisible();
	await page.getByRole('button', { name: 'Import', exact: true }).click();
	const dialog = page.locator('mat-dialog-container');
	// The file input is rendered with the dialog body; attached is enough, it is visually hidden behind the chooser
	await dialog.locator('input[type=file][name=fileInput]').waitFor({ state: 'attached' });
	await dialog.locator('mat-slide-toggle').first().click();
	await expect(dialog.locator('.projectNameInput')).toBeVisible();
	return dialog;
}

/**
 * Imports a zip as a new project through the account page Import modal. Waits for the upload response.
 * WHY: the buffer is passed with MIME application/zip, because the backend's multer filter rejects any other MIME type
 * with 400 (story.routes.ts). The submit button is scoped to `.modal-footer`, because the account page has its own Import button.
 * @param page Page on the account page.
 * @param zipPath Absolute path of the zip to upload.
 * @param projectName Name of the new project.
 */
export async function importNewProjectViaUi(page: Page, zipPath: string, projectName: string): Promise<void> {
	const dialog = await openNewProjectImportModal(page);
	await dialog.locator('input[type=file][name=fileInput]').setInputFiles({
		name: path.basename(zipPath),
		mimeType: 'application/zip',
		buffer: readFileSync(zipPath),
	});
	await dialog.locator('.projectNameInput').pressSequentially(projectName);
	const [response] = await Promise.all([
		page.waitForResponse(r => r.url().includes('/story/upload/import/') && r.request().method() === 'POST'),
		dialog.locator('.modal-footer').getByRole('button', { name: 'Import', exact: true }).click(),
	]);
	expect(response.status()).toBe(200);
}
