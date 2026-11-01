import type { Page } from '@playwright/test';

/**
 * Page object for the logged-out and account-related auth screens: registration, login, logout and account deletion.
 * Selectors are taken from frontend/src/app/registration, login, app.component.html and modals/delete-account.
 */
export class AuthPage {
	/** @param page Playwright page the actions run on. */
	constructor(readonly page: Page) {}

	/** Opens the registration form. */
	async gotoRegister(): Promise<void> {
		await this.page.goto('/register');
	}

	/** Opens the login form. */
	async gotoLogin(): Promise<void> {
		await this.page.goto('/login');
	}

	/**
	 * Types into the registration form. Uses pressSequentially because fill() does not fire the keyup that updates the validity state.
	 * @param email Email to type.
	 * @param password Password to type.
	 * @param confirmation Confirmation to type; defaults to the password.
	 */
	async fillRegister(email: string, password: string, confirmation = password): Promise<void> {
		await this.page.locator('#email').pressSequentially(email);
		await this.page.locator('#password').pressSequentially(password);
		await this.page.locator('#confirmPassword').pressSequentially(confirmation);
	}

	/** Returns the submit button of the registration form. */
	registerButton() {
		return this.page.locator('form button[type="submit"]');
	}

	/**
	 * Types into the login form.
	 * @param email Email to type.
	 * @param password Password to type.
	 */
	async fillLogin(email: string, password: string): Promise<void> {
		await this.page.locator('#email').pressSequentially(email);
		await this.page.locator('#password').pressSequentially(password);
	}

	/**
	 * Logs out through the top menu. Waits for the server call so the session is gone when this returns.
	 * WHY: the frontend clears localStorage before the request, so the server response is the only proof the session ended.
	 */
	async logout(): Promise<void> {
		await this.page.locator('button[title="menu"]').click();
		const response = this.page.waitForResponse(r => r.url().endsWith('/user/logout') && r.request().method() === 'GET');
		await this.page.locator('#logout').click();
		await response;
	}

	/**
	 * Deletes the logged-in account through the account page modal. Waits for the DELETE response.
	 * Irreversible: removes the user and its projects on the server.
	 * @param email Email of the account, typed into the confirmation field.
	 */
	async deleteAccountViaUi(email: string): Promise<void> {
		await this.page.locator('#erase_Account').click();
		await this.page.locator('#delete-account-email').pressSequentially(email);
		const response = this.page.waitForResponse(r => r.url().endsWith('/user/') && r.request().method() === 'DELETE');
		await this.page.getByRole('button', { name: 'Delete my Account' }).click();
		await response;
	}
}

/**
 * Collects the URLs and methods of every login and register request the page sends.
 * WHY: the auth budget is shared across agents, so specs must prove exactly how many auth requests they sent.
 * @param page Page to observe.
 * @returns Array that receives one entry per request, filled while the page runs.
 */
export function trackAuthRequests(page: Page): string[] {
	const seen: string[] = [];
	page.on('request', request => {
		if (/\/user\/(login|register)$/.test(new URL(request.url()).pathname))
			seen.push(`${request.method()} ${request.url()}`);
	});
	return seen;
}
