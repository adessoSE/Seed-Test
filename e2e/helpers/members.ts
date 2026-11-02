import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { request, type APIRequestContext, type Browser, type BrowserContext, type Locator, type Page } from '@playwright/test';
import { ACCOUNT_PATH, API_URL, BACKEND_INFO, BASE_URL } from './config';
import { recordAppConsoleError } from './console';
import { sha256Hex } from './crypto';

/** A second user registered for the members spec, with the API context that holds its session. */
export interface MemberSession {
	/** Lowercase test email; the account is removed by deleteOwnAccount. */
	email: string;
	/** Logged-in API context of the member. Its cookie jar is copied into the member's browser context. */
	api: APIRequestContext;
}

/** Workgroup member list returned by GET /workgroup/:id/members. */
export interface WorkgroupDto {
	owner: { email: string };
	member: { email: string; canEdit: boolean }[];
}

/**
 * Registers a fresh user and logs it in through the API. Uses two auth requests, which is the whole budget of the members spec.
 * WHY: the auth limiter is shared by all agents (the authLimiter in backend/src/routes/user.routes.ts, per IP), so no extra login is allowed here.
 * Side effect: creates a user in the test database. The returned context must be disposed by the caller.
 * @returns The member's email and its logged-in API context.
 */
export async function registerAndLogin(): Promise<MemberSession> {
	const email = `e2e-member-${randomBytes(4).toString('hex')}@seedtest.test`;
	const password = `Pw-${randomBytes(6).toString('hex')}`;
	// WHY: an empty storageState keeps the shared owner session out of the member's cookie jar, so the member login cannot replace it
	const api = await request.newContext({ storageState: { cookies: [], origins: [] } });
	try {
		// The frontend sends the SHA-256 digest, never the plaintext
		const register = await api.post(`${API_URL}/user/register`, { data: { email, password: sha256Hex(password) } });
		if (register.status() !== 201)
			throw new Error(`registerAndLogin: register failed with HTTP ${register.status()}: ${await register.text()}`);

		// WHY: the session cookie is set by login, so the API context must log in before its storageState is usable in a browser
		const login = await api.post(`${API_URL}/user/login`, { data: { email, password: sha256Hex(password) } });
		if (login.status() !== 200)
			throw new Error(`registerAndLogin: login failed with HTTP ${login.status()}: ${await login.text()}`);
	} catch (error) {
		await api.dispose();
		throw error;
	}
	return { email, api };
}

/**
 * Returns the story button of the stories bar. The bar shows "<n>. <title>" with a drag handle icon, so an exact text
 * match misses it; the exact title also exists in a hidden tooltip, which is why the button role is used.
 * @param page Page with a project open in the editor.
 * @param title Full story title.
 * @returns Locator of the first matching story button (the outer one of two nested buttons).
 */
export function storyItem(page: Page, title: string): Locator {
	return page.getByRole('button', { name: title }).first();
}

/**
 * Reads the email of the shared owner account that global setup wrote to .auth/account.json.
 * @returns Email of the shared test user, which owns the projects the members spec creates.
 */
export async function ownerEmail(): Promise<string> {
	return (JSON.parse(await readFile(ACCOUNT_PATH, 'utf8')) as { email: string }).email;
}

/**
 * Opens a browser context logged in as the member. Copies the member's session cookie and seeds the same
 * localStorage keys the `page` fixture seeds, so the app treats the context like any other test page.
 * WHY: a second browser context is the only way to act as a second user in one test.
 * @param browser Browser from the test fixtures.
 * @param member Logged-in API context of the member.
 * @param runtimeErrors Array that collects page errors of this context; pass the test's `runtimeErrors` fixture.
 * @returns The context (close it when done) and its page.
 */
export async function openMemberContext(
	browser: Browser,
	member: APIRequestContext,
	runtimeErrors: string[] = [],
): Promise<{ context: BrowserContext; page: Page }> {
	const state = await member.storageState();
	const localStorage = [
		{ name: 'login', value: 'true' },
		...Object.entries(BACKEND_INFO).map(([name, value]) => ({ name, value })),
	];
	const context = await browser.newContext({
		storageState: { cookies: state.cookies, origins: [{ origin: BASE_URL, localStorage }] },
	});
	const page = await context.newPage();
	page.on('pageerror', error => runtimeErrors.push(`pageerror (member): ${error.message}`));
	page.on('console', message => recordAppConsoleError(message, runtimeErrors, 'console (member)'));
	return { context, page };
}

/**
 * Reads the workgroup of a project: its owner and its members with their write access.
 * @param api Request context of any user who can read the project.
 * @param repoId Project id.
 * @returns The owner and the member list as stored on the server.
 */
export async function getWorkgroup(api: APIRequestContext, repoId: string): Promise<WorkgroupDto> {
	const response = await api.get(`${API_URL}/workgroup/${repoId}/members`);
	if (response.status() !== 200)
		throw new Error(`getWorkgroup failed: HTTP ${response.status()} ${await response.text()}`);
	return (await response.json()) as WorkgroupDto;
}

/**
 * Deletes the account of the logged-in user. Irreversible: removes the user on the server.
 * WHY: members created by this spec remove themselves so no test user is left behind.
 * @param api Request context carrying the session cookie of the account to delete.
 */
export async function deleteOwnAccount(api: APIRequestContext): Promise<void> {
	const response = await api.delete(`${API_URL}/user/`);
	if (!response.ok())
		throw new Error(`deleteOwnAccount failed: HTTP ${response.status()} ${await response.text()}`);
}
