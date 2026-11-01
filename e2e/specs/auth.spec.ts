import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { test, expect } from '../fixtures';
import { ACCOUNT_PATH, API_URL } from '../helpers/config';
import { AuthPage, trackAuthRequests } from '../pages/auth';

// WHY: these specs must start logged out, so they ignore the shared session that every other spec uses.
test.use({ storageState: { cookies: [], origins: [] } });

/** Test account written by global-setup; used for the duplicate, wrong-password and login checks without creating users. */
async function sharedAccount(): Promise<{ email: string; password: string }> {
	return JSON.parse(await readFile(ACCOUNT_PATH, 'utf8')) as { email: string; password: string };
}

/**
 * Builds a unique lowercase email so the account can be deleted through the UI (its confirmation field only accepts lowercase).
 * @returns A new email under the test domain.
 */
function freshEmail(): string {
	return `e2e-auth-${randomBytes(4).toString('hex')}@seedtest.test`;
}

test('registers a new account through the UI and lands logged in', async ({ page, runtimeErrors }) => {
	const auth = new AuthPage(page);
	const email = freshEmail();
	const password = `Pw-${randomBytes(6).toString('hex')}`;
	const authRequests = trackAuthRequests(page);
	let created = true;

	try {
		await auth.gotoRegister();
		await auth.fillRegister(email, password);
		await expect(auth.registerButton()).toBeEnabled();

		const registerResponse = page.waitForResponse(r => r.url().endsWith('/user/register') && r.request().method() === 'POST');
		await auth.registerButton().click();
		expect((await registerResponse).status()).toBe(201);

		// WHY: the registration component logs in right after registering, so a second login request follows
		await expect(page).toHaveURL(/\/accountManagement$/);
		await expect(page.locator('#emailLabel')).toHaveText(email);
		expect(await page.evaluate(() => window.localStorage.getItem('login'))).toBe('true');

		// Persisted state: the browser session belongs to the new user
		const me = await page.request.get(`${API_URL}/user/`);
		expect(me.status()).toBe(200);
		expect(((await me.json()) as { email: string }).email).toBe(email);

		expect(authRequests).toHaveLength(2);
		expect(authRequests[0]).toMatch(/POST .*\/user\/register$/);
		expect(authRequests[1]).toMatch(/POST .*\/user\/login$/);

		await auth.deleteAccountViaUi(email);
		created = false;
		// Persisted state: the session of the deleted account is gone
		expect((await page.request.get(`${API_URL}/user/`)).status()).toBe(401);
	} finally {
		// Cleanup for a failed run; a deleted account answers 401 and nothing is left behind
		if (created) await page.request.delete(`${API_URL}/user/`);
	}

	// WHY: only uncaught page errors are asserted; console errors from expected 4xx responses are not failures here
	expect(runtimeErrors.filter(e => e.startsWith('pageerror'))).toEqual([]);
});

test('registering with an email that already exists shows an error and no server error', async ({ page }) => {
	const auth = new AuthPage(page);
	const account = await sharedAccount();
	const authRequests = trackAuthRequests(page);

	await auth.gotoRegister();
	await auth.fillRegister(account.email, `Pw-${randomBytes(6).toString('hex')}`);

	const registerResponse = page.waitForResponse(r => r.url().endsWith('/user/register') && r.request().method() === 'POST');
	await auth.registerButton().click();
	const response = await registerResponse;

	// CASE 1: duplicate email is a conflict, not a validation or server failure
	expect(response.status()).toBe(409);
	await expect(page.locator('.snackbar-error')).toContainText('User with this email already exists');
	await expect(page).toHaveURL(/\/register$/);
	expect(authRequests).toHaveLength(1);
});

test('the register form sends no request while a field is invalid', async ({ page }) => {
	const auth = new AuthPage(page);
	const authRequests = trackAuthRequests(page);
	const cases: Array<{ name: string; email: string; password: string; confirmation?: string }> = [
		{ name: 'invalid email', email: 'not-an-email', password: 'longenough1' },
		{ name: 'short password', email: freshEmail(), password: 'short1' },
		{ name: 'mismatched confirmation', email: freshEmail(), password: 'longenough1', confirmation: 'longenough2' },
	];

	for (const invalid of cases) {
		await auth.gotoRegister();
		await auth.fillRegister(invalid.email, invalid.password, invalid.confirmation);
		await expect(auth.registerButton(), invalid.name).toBeDisabled();
		// WHY: Enter would submit a form whose default button is disabled in some browsers; it must not reach the server
		await page.locator('#confirmPassword').press('Enter');
		// WHY: no DOM or network event marks a request that was never sent, so a fixed window is the only way to give a submit time to reach the network
		await page.waitForTimeout(300);
	}

	expect(authRequests).toEqual([]);
});

test('login with a wrong password shows the generic error and returns 401', async ({ page }) => {
	const auth = new AuthPage(page);
	const account = await sharedAccount();
	const authRequests = trackAuthRequests(page);

	await auth.gotoLogin();
	await auth.fillLogin(account.email, `wrong-${randomBytes(4).toString('hex')}`);

	const loginResponse = page.waitForResponse(r => r.url().endsWith('/user/login') && r.request().method() === 'POST');
	await page.locator('#Login').click();
	expect((await loginResponse).status()).toBe(401);

	// WHY: the message must not reveal whether the email exists, so it is the same generic text as for any failure
	await expect(page.locator('.alert-danger')).toContainText('Wrong Username Or Password');
	await expect(page).toHaveURL(/\/login$/);
	expect(await page.evaluate(() => window.localStorage.getItem('login'))).toBeNull();
	expect(authRequests).toHaveLength(1);
});

test('login with valid credentials succeeds, and logout ends the server session', async ({ page }) => {
	const auth = new AuthPage(page);
	const account = await sharedAccount();
	const authRequests = trackAuthRequests(page);

	await auth.gotoLogin();
	await auth.fillLogin(account.email, account.password);

	const loginResponse = page.waitForResponse(r => r.url().endsWith('/user/login') && r.request().method() === 'POST');
	await page.locator('#Login').click();
	expect((await loginResponse).status()).toBe(200);

	await expect(page).not.toHaveURL(/\/login$/);
	expect(await page.evaluate(() => window.localStorage.getItem('login'))).toBe('true');
	expect((await page.request.get(`${API_URL}/user/`)).status()).toBe(200);

	await auth.logout();

	// Persisted state: the server no longer recognises the session cookie of this browser
	expect((await page.request.get(`${API_URL}/user/`)).status()).toBe(401);
	expect(await page.evaluate(() => window.localStorage.getItem('login'))).toBeNull();
	expect(authRequests).toHaveLength(1);
});

test('a protected page opened while logged out redirects to login', async ({ page }) => {
	await page.goto('/accountManagement');
	await expect(page).toHaveURL(/\/login$/);
	await expect(page.locator('#Login')).toBeVisible();
});
