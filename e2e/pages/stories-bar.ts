import { expect, type Locator, type Page } from '@playwright/test';
import { escapeRegExp } from '../helpers/text';

/**
 * Stories bar on the home page: one expansion panel per story, each listing the story's scenarios.
 * Story rows are matched by their exact title attribute; scenario rows by their visible name, case-insensitively,
 * because the bar renders names through the titlecase pipe.
 */
export class StoriesBar {
	/** @param page Playwright page the stories bar is rendered on. */
	constructor(readonly page: Page) {}

	/**
	 * Locates the row of a story by its exact title.
	 * WHY: the title link carries the full title in its title attribute, so the match is not confused by the
	 * "<issue number>." prefix that precedes the visible text.
	 * @param storyTitle Exact story title.
	 * @returns Locator of the story row (drag wrapper around the expansion panel).
	 */
	private storyRow(storyTitle: string): Locator {
		return this.page.locator('.story-drag-wrapper').filter({ has: this.page.getByTitle(storyTitle, { exact: true }) });
	}

	/**
	 * Locates a scenario link inside a story row.
	 * WHY: the name is matched as a whole word (bounded by whitespace), so "Scenario 1" does not match "Scenario 12".
	 * The status icon text is part of the link text, which is why the match cannot be anchored at the end.
	 * @param storyTitle Exact story title.
	 * @param scenarioName Scenario name as typed when it was created.
	 * @returns Locator of the scenario link (`a.scenarioListItem`).
	 */
	private scenarioLink(storyTitle: string, scenarioName: string): Locator {
		const name = new RegExp(`(^|\\s)${escapeRegExp(scenarioName)}(\\s|$)`, 'i');
		return this.storyRow(storyTitle).locator('a.scenarioListItem').filter({ hasText: name });
	}

	/**
	 * Expands a story row so its scenarios are listed. Does nothing when the row is already expanded.
	 * WHY: the title click only selects the story (its handler stops propagation), so expansion is driven by the
	 * panel indicator. Clicking it on an expanded row would collapse it, hence the aria-expanded check.
	 * Waits for the panel body, which holds either the scenario links or the add-scenario button for an empty story.
	 * @param storyTitle Exact story title.
	 */
	async expandStory(storyTitle: string): Promise<void> {
		const row = this.storyRow(storyTitle);
		const header = row.locator('mat-expansion-panel-header');
		if ((await header.getAttribute('aria-expanded')) !== 'true')
			await header.locator('.mat-expansion-indicator').click();
		await expect(header).toHaveAttribute('aria-expanded', 'true');
		// CASE 1: a story without scenarios shows #add_first_scenario instead of any scenario link
		await expect(row.locator('a.scenarioListItem, #add_scenario, #add_first_scenario').locator('visible=true').first()).toBeVisible();
	}

	/**
	 * Opens a scenario from the stories bar and waits until the editor header shows its name.
	 * @param storyTitle Exact story title.
	 * @param scenarioName Scenario name as typed when it was created.
	 */
	async openScenario(storyTitle: string, scenarioName: string): Promise<void> {
		await this.expandStory(storyTitle);
		await this.scenarioLink(storyTitle, scenarioName).click();
		// WHY: the header is the only signal that the editor finished loading the selected scenario
		await expect(this.page.locator('#scenarioTitle').locator('visible=true'))
			.toContainText(new RegExp(escapeRegExp(scenarioName), 'i'));
	}

	/**
	 * Locates the status icon of a scenario in the stories bar. The story must be expanded first (see expandStory).
	 * The icon's class is `passed` (check_circle_outline), `notPassed` (report) or `undefined` (watch_later, not run yet).
	 * @param storyTitle Exact story title.
	 * @param scenarioName Scenario name as typed when it was created.
	 * @returns Locator of the scenario's `mat-icon.icon`.
	 */
	scenarioIcon(storyTitle: string, scenarioName: string): Locator {
		return this.scenarioLink(storyTitle, scenarioName).locator('mat-icon.icon');
	}
}
