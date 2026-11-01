import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Account page and project modals: create, settings, rename and delete of custom projects.
 * Selectors are checked against frontend/src/app/account-management, modals/create-custom-project and modals/workgroup-edit.
 */
export class ProjectsPage {
	/** @param page Playwright page the project flows run on. */
	constructor(readonly page: Page) {}

	/** Opens the "Create Custom Project" modal and waits until its name field is visible. */
	async openCreateModal(): Promise<void> {
		await this.page.getByRole('button', { name: 'Create Custom Project' }).click();
		await expect(this.page.locator('#projectTitle:visible')).toBeVisible();
	}

	/**
	 * Replaces the project name in the create modal. Uses key presses because the modal validates on keyup.
	 * @param name Name to type.
	 */
	async typeProjectName(name: string): Promise<void> {
		const input = this.page.locator('#projectTitle:visible');
		await input.clear();
		await input.pressSequentially(name);
	}

	/** Returns the Save button of the create modal. */
	saveButton(): Locator {
		return this.page.locator('#submitCreateNewProject:visible');
	}

	/** Closes the create modal through its header close button. */
	async closeCreateModal(): Promise<void> {
		await this.page.locator('.modal-header button.close:visible').click();
	}

	/**
	 * Creates a project through the UI and waits until it appears in the list.
	 * @param name Unique project name.
	 */
	async createProjectInUi(name: string): Promise<void> {
		await this.openCreateModal();
		await this.typeProjectName(name);
		await this.saveButton().click();
		await expect(this.projectRow(name)).toBeVisible({ timeout: 5000 });
	}

	/**
	 * Returns the list row of a custom project. Matches by substring, so names must be unique per run.
	 * @param name Project name as shown in the list.
	 */
	projectRow(name: string): Locator {
		return this.page.locator('#DBRepositoriesList li.projectListItem', { hasText: name });
	}

	/**
	 * Opens the project settings modal from the settings icon of the project row.
	 * @param name Project name as shown in the list.
	 */
	async openSettings(name: string): Promise<void> {
		await this.projectRow(name).locator('mat-icon[id^="edit_repository_"]').click();
		await expect(this.page.getByRole('button', { name: 'Save Project' })).toBeVisible();
	}
}
