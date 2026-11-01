import { randomBytes } from 'node:crypto';
import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import { createStory, getStory } from '../helpers/api';
import { deleteStory } from '../helpers/stories';
import { addFailingScenario, addPassingScenario, getScenarioStatus, getStoryStatus } from '../helpers/runs';
import { AppPage } from '../pages/app';
import { StoriesBar } from '../pages/stories-bar';

/** Window with the marker a test sets before a run to prove the page was not reloaded afterwards. */
type MarkedWindow = Window & { __noReload?: boolean };

/** Upper bound for the backend answer to one real test run; a run against example.com takes about 60 s. */
const RUN_TIMEOUT_MS = 150_000;

/** Unique suffix so names never clash with leftovers from other runs or parallel workers. */
function unique(label: string): string {
	return `${label} ${randomBytes(3).toString('hex')}`;
}

/**
 * Marks the page so a later check can prove that no reload happened.
 * @param page Page to mark.
 */
async function markPage(page: Page): Promise<void> {
	await page.evaluate(() => {
		(window as MarkedWindow).__noReload = true;
	});
}

/**
 * Reads the marker set by markPage; false after a reload or a navigation.
 * @param page Page to check.
 */
async function pageWasNotReloaded(page: Page): Promise<boolean> {
	return page.evaluate(() => (window as MarkedWindow).__noReload === true);
}

/**
 * Clicks a run button and waits for the backend answer to that run request, then for the report.
 * WHY: a run takes about a minute, so the wait is tied to the POST response of the run route. Waiting on the
 * report element alone hides whether the request was sent at all and fails only after the full timeout.
 * @param page Page to drive.
 * @param button Visible run button.
 * @param executePath Run route the frontend posts to, e.g. `/execute/Feature/<storyId>`.
 */
async function runAndWaitForReport(page: Page, button: Locator, executePath: string): Promise<void> {
	const executed = page.waitForResponse(
		response => response.request().method() === 'POST' && response.url().includes(executePath),
		{ timeout: RUN_TIMEOUT_MS },
	);
	await button.click();
	const response = await executed;
	expect(response.status(), `run request ${executePath}`).toBe(200);
	// WHY: the report is shown only after the response handler runs, so it is awaited after the response
	await expect(page.locator('#testreport').locator('visible=true')).toBeVisible();
}

test.describe('runs', () => {
	test('running a passing scenario shows passed in the list without a reload', async ({ page, api, project }) => {
		test.setTimeout(180_000);
		const storyTitle = unique('Run pass story');
		const scenarioName = unique('Run pass scenario');
		const storyId = await createStory(api, project.id, storyTitle);
		const stories = new StoriesBar(page);
		try {
			const scenario = await addPassingScenario(api, storyId, scenarioName);
			await new AppPage(page).gotoHome();
			await stories.openScenario(storyTitle, scenarioName);
			await expect(stories.scenarioIcon(storyTitle, scenarioName)).toHaveClass(/(^|\s)undefined(\s|$)/);

			await markPage(page);
			await runAndWaitForReport(page, page.locator('#run_scenario').filter({ visible: true }), `/execute/Scenario/${storyId}/${scenario.scenario_id}`);

			await expect(stories.scenarioIcon(storyTitle, scenarioName)).toHaveClass(/(^|\s)passed(\s|$)/);
			expect(await pageWasNotReloaded(page)).toBe(true);
			await expect.poll(() => getScenarioStatus(api, storyId, scenarioName)).toBe(true);
		} finally {
			await deleteStory(api, project.id, storyId);
		}
	});

	test('running a failing scenario shows not passed in the list without a reload', async ({ page, api, project }) => {
		test.setTimeout(180_000);
		const storyTitle = unique('Run fail story');
		const scenarioName = unique('Run fail scenario');
		const storyId = await createStory(api, project.id, storyTitle);
		const stories = new StoriesBar(page);
		try {
			const scenario = await addFailingScenario(api, storyId, scenarioName);
			await new AppPage(page).gotoHome();
			await stories.openScenario(storyTitle, scenarioName);
			await expect(stories.scenarioIcon(storyTitle, scenarioName)).toHaveClass(/(^|\s)undefined(\s|$)/);

			await markPage(page);
			await runAndWaitForReport(page, page.locator('#run_scenario').filter({ visible: true }), `/execute/Scenario/${storyId}/${scenario.scenario_id}`);

			await expect(stories.scenarioIcon(storyTitle, scenarioName)).toHaveClass(/(^|\s)notPassed(\s|$)/);
			expect(await pageWasNotReloaded(page)).toBe(true);
			await expect.poll(() => getScenarioStatus(api, storyId, scenarioName)).toBe(false);
		} finally {
			await deleteStory(api, project.id, storyId);
		}
	});

	test('running a story with a failing scenario filters it under Failed without a reload', async ({ page, api, project }) => {
		test.setTimeout(180_000);
		const storyTitle = unique('Run story');
		const passName = unique('Run story pass');
		const failName = unique('Run story fail');
		const storyId = await createStory(api, project.id, storyTitle);
		const stories = new StoriesBar(page);
		try {
			await addPassingScenario(api, storyId, passName);
			await addFailingScenario(api, storyId, failName);
			await new AppPage(page).gotoHome();
			// WHY: the run button acts on the selected story; clicking the title selects it without toggling the panel
			await page.locator('#storyList').filter({ hasText: storyTitle }).first().click();
			await stories.expandStory(storyTitle);

			await markPage(page);
			await runAndWaitForReport(page, page.locator('#run_story').filter({ visible: true }), `/execute/Feature/${storyId}`);
			await expect.poll(() => getStoryStatus(api, storyId)).toBe(false);
			expect((await getStory(api, storyId)).lastTestPassed).toBe(false);

			// Expand the filter bar, then pick the status in "Status Of Story"
			await test.step('expand the filter bar', async () => {
				await page.locator('em#searchBarIcons', { hasText: 'expand_more' }).filter({ visible: true }).first().click({ timeout: 10_000 });
			});
			// WHY: the outline field's <mat-label> overlaps the select box and intercepts pointer events at its centre,
			// so the click targets the arrow wrapper on the right edge instead of the mat-select element itself.
			const statusTrigger = page.locator('mat-form-field').filter({ hasText: 'Status Of Story' }).locator('mat-select .mat-mdc-select-arrow-wrapper');

			await test.step('select Failed and expect the story listed', async () => {
				await statusTrigger.click({ timeout: 10_000 });
				await page.getByRole('option', { name: 'Failed', exact: true }).click({ timeout: 10_000 });
				await expect(page.locator('#storyList').filter({ hasText: storyTitle })).toHaveCount(1, { timeout: 10_000 });
			});

			await test.step('select Passed and expect the story hidden', async () => {
				await statusTrigger.click({ timeout: 10_000 });
				await page.getByRole('option', { name: 'Passed', exact: true }).click({ timeout: 10_000 });
				await expect(page.locator('#storyList').filter({ hasText: storyTitle })).toHaveCount(0, { timeout: 10_000 });
			});

			expect(await pageWasNotReloaded(page)).toBe(true);
		} finally {
			await deleteStory(api, project.id, storyId);
		}
	});
});
