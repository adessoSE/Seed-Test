import { randomBytes } from 'node:crypto';
import { test, expect } from '../fixtures';
import { createProject, createStory, deleteProject } from '../helpers/api';
import { addScenario } from '../helpers/stories';
import { API_URL } from '../helpers/config';
import { featureTextsFromZip, getReportHistory, scenarioReportIds } from '../helpers/reports';
import { addPassingScenario } from '../helpers/runs';
import { AppPage } from '../pages/app';
import { ReportsPage } from '../pages/reports';

/**
 * Builds a title or name that is unique per run and safe for file names (letters, digits, spaces only).
 * @param label Readable prefix.
 * @returns Label with a random suffix.
 */
function uniqueLabel(label: string): string {
	return `${label} ${randomBytes(3).toString('hex')}`;
}

test.describe('reports', () => {
	test('deleting a report asks for confirmation and removes it only after Delete', async ({ page, api, project, runtimeErrors }) => {
		test.setTimeout(180_000);
		const storyTitle = uniqueLabel('Report Delete Story');
		const storyId = await createStory(api, project.id, storyTitle);
		const scenario = await addPassingScenario(api, storyId, uniqueLabel('Report Pass'));

		const reports = new ReportsPage(page);
		await new AppPage(page).gotoHome();
		await reports.openStory(storyTitle);
		await reports.openScenario(scenario.name);
		await reports.runScenario();
		await reports.waitForRunResult();
		// WHY: the report is persisted after the run; the UI list is only a view of the history
		await expect.poll(async () => (await scenarioReportIds(api, storyId)).length, { timeout: 30_000 }).toBe(1);

		await reports.openReportHistory();
		const rows = reports.scenarioReportRows();
		await expect(rows).toHaveCount(1);
		const idsBefore = await scenarioReportIds(api, storyId);

		// Cancel keeps the report in the UI and in the API
		await reports.deleteButton(rows.first()).click();
		await expect(reports.confirmDialog()).toBeVisible();
		await reports.confirmDialog().getByRole('button', { name: 'Cancel' }).click();
		await expect(reports.confirmDialog()).toBeHidden();
		await expect(rows).toHaveCount(1);
		expect(await scenarioReportIds(api, storyId)).toEqual(idsBefore);

		// Delete removes exactly that report, in the UI and in the API
		await reports.deleteButton(rows.first()).click();
		await expect(reports.confirmDialog()).toBeVisible();
		await reports.confirmDialog().getByRole('button', { name: 'Delete', exact: true }).click();
		await expect(rows).toHaveCount(0);
		const idsAfter = await scenarioReportIds(api, storyId);
		expect(idsAfter).toHaveLength(0);
		expect(idsBefore.filter(id => !idsAfter.includes(id))).toEqual(idsBefore);

		// The report is gone for good: a reload of the list does not bring it back
		await page.reload();
		await reports.openStory(storyTitle);
		await reports.openReportHistory();
		await expect(reports.scenarioReportRows()).toHaveCount(0);
		expect((await getReportHistory(api, storyId)).scenarioReports).toEqual([]);
		expect(runtimeErrors).toEqual([]);
	});

	test('project features download as one zip named after the project with a feature per story', async ({ page, api }) => {
		const repoName = uniqueLabel('E2E Zip Download');
		const project = await createProject(api, repoName);
		try {
			const titles = [uniqueLabel('Zip Story Alpha'), uniqueLabel('Zip Story Beta')];
			for (const title of titles)
				await createStory(api, project.id, title);

			await new AppPage(page).gotoAccount();
			await page.locator('.dropDownProject mat-select').click();
			await page.getByRole('option', { name: repoName, exact: true }).click();

			const [download] = await Promise.all([
				page.waitForEvent('download'),
				page.locator('.repositories').getByRole('button', { name: 'Download', exact: true }).click(),
			]);
			expect(download.suggestedFilename()).toBe(`${repoName}.zip`);

			const zipPath = await download.path();
			expect(zipPath).toBeTruthy();
			const features = featureTextsFromZip(zipPath!);
			expect(features).toHaveLength(titles.length);
			for (const title of titles)
				expect(features.some(text => text.includes(`Feature: ${title}`)), `zip has a feature for "${title}"`).toBe(true);
		} finally {
			await deleteProject(api, project.id);
		}
	});

	test('single story feature file is served by the API with its title and scenarios', async ({ api, project }) => {
		const title = uniqueLabel('Single Feature Story');
		const storyId = await createStory(api, project.id, title);
		const first = await addScenario(api, storyId, uniqueLabel('Feature Scenario One'));
		const second = await addScenario(api, storyId, uniqueLabel('Feature Scenario Two'));

		const response = await api.get(`${API_URL}/story/download/story/${storyId}`);
		expect(response.status()).toBe(200);
		expect(response.headers()['content-disposition']).toContain('.feature');
		const body = await response.text();
		expect(body).toContain(`Feature: ${title}`);
		expect(body).toContain(`Scenario: ${first.name}`);
		expect(body).toContain(`Scenario: ${second.name}`);
	});

	test('story editor offers a download control for the story feature file', async ({ page, api, project }) => {
		// Known bug: downloadFeature() (frontend/src/app/story-editor/story-editor.component.ts:1999) is not bound in any template,
		// so no control in the story editor calls it. Bind it in story-editor.component.html, then drop this line.
		test.fixme(true, 'downloadFeature() is unbound (story-editor.component.ts:1999); the story editor has no download control');

		const title = uniqueLabel('Editor Download Story');
		await createStory(api, project.id, title);
		const reports = new ReportsPage(page);
		await new AppPage(page).gotoHome();
		await reports.openStory(title);

		const download = page.getByRole('button', { name: /download/i }).first();
		await expect(download).toBeVisible();
		const [file] = await Promise.all([page.waitForEvent('download'), download.click()]);
		expect(file.suggestedFilename()).toMatch(/\.feature$/);
	});
});
