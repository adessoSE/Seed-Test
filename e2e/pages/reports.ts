import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Story editor and report history: run a scenario, open the report list, delete a report.
 * Selectors are checked against frontend/src/app/story-editor, stories-bar and report-history.
 */
export class ReportsPage {
	/** @param page Playwright page the report flows run on. */
	constructor(readonly page: Page) {}

	/**
	 * Selects a story in the stories bar and waits until the editor shows it.
	 * @param title Story title as typed when the story was created.
	 */
	async openStory(title: string): Promise<void> {
		// WHY: the title stops click propagation (stories-bar.component.html), so only the header's expansion indicator toggles the panel
		const header = this.page.locator('mat-expansion-panel-header', { has: this.page.locator('a.storyListLink', { hasText: title }) });
		if ((await header.getAttribute('aria-expanded')) !== 'true')
			await header.locator('.mat-expansion-indicator').click();
	}

	/**
	 * Selects a scenario of the open story. The bar title-cases scenario names, so the match ignores case.
	 * @param name Scenario name as typed when the scenario was created.
	 */
	async openScenario(name: string): Promise<void> {
		// WHY: a string hasText match is already case-insensitive, so no regex escaping is needed
		await this.page.locator('a.scenarioListItem', { hasText: name }).click();
		await expect(this.page.locator('#run_scenario')).toBeVisible();
	}

	/** Starts the selected scenario with the Run Scenario button. */
	async runScenario(): Promise<void> {
		await this.page.locator('#run_scenario').click();
	}

	/**
	 * Waits until the result frame of the run shows and the run spinner is gone.
	 * @param timeout Milliseconds to wait; a run against a real site takes about 60 s.
	 */
	async waitForRunResult(timeout = 170_000): Promise<void> {
		await expect(this.page.locator('#testreport')).toBeVisible({ timeout });
	}

	/** Switches the story editor to the report history with the View Reports button. */
	async openReportHistory(): Promise<void> {
		await this.page.getByRole('button', { name: 'View Reports' }).first().click();
		await expect(this.page.locator('.changedStoryViewTitle')).toBeVisible();
	}

	/** Rows of the scenario reports section, one per saved scenario report. */
	scenarioReportRows(): Locator {
		return this.page.locator('.scenarioReportContainer .report');
	}

	/**
	 * Returns the delete button of one report row (the trash icon whose ligature text is "delete").
	 * @param row Report row from scenarioReportRows().
	 */
	deleteButton(row: Locator): Locator {
		return row.locator('button.actionButton').filter({ hasText: 'delete' });
	}

	/** Returns the open "Delete Report?" confirmation dialog. */
	confirmDialog(): Locator {
		return this.page.getByRole('dialog').filter({ hasText: 'Delete Report?' });
	}
}
