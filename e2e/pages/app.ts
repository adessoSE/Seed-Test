import type { Page } from '@playwright/test';

/**
 * Shell-level navigation shared by all specs. Area page objects live next to it in this folder.
 */
export class AppPage {
	/** @param page Playwright page the navigation runs on. */
	constructor(readonly page: Page) {}

	/** Opens the home page (stories of the current project). */
	async gotoHome(): Promise<void> {
		await this.page.goto('/');
	}

	/** Opens the account management page, where projects are listed and created. */
	async gotoAccount(): Promise<void> {
		await this.page.goto('/accountManagement');
	}

	/**
	 * Opens the home page with a project already selected. The project fixture selects it through localStorage,
	 * so this only navigates. `name` is checked against the stored selection to catch a mismatched fixture.
	 * @param name Expected project name.
	 */
	async openProject(name: string): Promise<void> {
		await this.gotoHome();
		const selected = await this.page.evaluate(() => window.localStorage.getItem('repository'));
		if (selected !== name)
			throw new Error(`openProject: current project is "${selected}", expected "${name}"`);
	}
}
