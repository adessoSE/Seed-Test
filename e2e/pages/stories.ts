import { expect, type Locator, type Page } from '@playwright/test';
import { StepEditor } from './step-editor';
import { StoriesBar } from './stories-bar';

/**
 * Story and scenario actions of the stories bar and the story editor.
 * Several ids exist twice in the DOM (a hidden and a visible copy), so every lookup is scoped with `visible=true`.
 */
export class StoriesPage {
	/** Stories bar of the same page; expands a story before its scenario buttons are used. */
	private readonly bar: StoriesBar;

	/** @param page Playwright page the actions run on. */
	constructor(readonly page: Page) {
		this.bar = new StoriesBar(page);
	}

	/**
	 * Opens a story in the editor (route story/:story_id).
	 * @param storyId Story id.
	 */
	async gotoStory(storyId: string): Promise<void> {
		await this.page.goto(`/story/${storyId}`);
	}

	/**
	 * Opens one scenario of a story by deep link (route story/:story_id/:scenario_id).
	 * @param storyId Story id.
	 * @param scenarioId Numeric scenario_id, not the Mongo _id.
	 */
	async gotoScenario(storyId: string, scenarioId: number): Promise<void> {
		await this.page.goto(`/story/${storyId}/${scenarioId}`);
	}

	/**
	 * Returns the visible element matching a selector. Needed because some ids are rendered twice.
	 * @param selector CSS selector.
	 */
	visible(selector: string): Locator {
		return this.page.locator(selector).locator('visible=true').first();
	}

	/**
	 * Types into an input or contenteditable the way a user does.
	 * WHY: fill() does not fire keyup/input for the validators and the contenteditable value handlers, so the
	 * submit buttons would stay disabled. The delay keeps contenteditable values from being garbled.
	 * @param field Element to type into.
	 * @param text Text to type.
	 * @param delay Milliseconds between key presses.
	 */
	async typeInto(field: Locator, text: string, delay = 60): Promise<void> {
		await field.click();
		await field.pressSequentially(text, { delay });
	}

	/**
	 * Replaces the content of a plain input, firing keyup per key like typing does.
	 * @param field Input to clear and type into.
	 * @param text New content.
	 */
	async replaceInput(field: Locator, text: string): Promise<void> {
		await field.click();
		await field.press('ControlOrMeta+a');
		await field.press('Backspace');
		await field.pressSequentially(text, { delay: 60 });
	}

	/**
	 * Opens the create-story modal from the empty-project CTA or the "Create New Story" button.
	 */
	async openCreateStoryModal(): Promise<void> {
		await this.page.locator('#createFirstStory, #createNewStoryDiv button').locator('visible=true').first().click();
		await expect(this.page.locator('#storytitle').locator('visible=true')).toBeVisible();
	}

	/**
	 * Opens the rename-story modal from the story editor header.
	 */
	async openRenameStoryModal(): Promise<void> {
		await this.page.locator('button.storyTitle.pencil_icon').locator('visible=true').first().click();
		await expect(this.page.locator('#newStoryTitle').locator('visible=true')).toBeVisible();
	}

	/**
	 * Adds the first scenario of a story without scenarios from the stories bar (#add_first_scenario).
	 * WHY: the story row must be expanded first, because its panel body is collapsed by default.
	 * @param storyTitle Exact story title, used to expand its row in the bar.
	 * @param name Scenario name.
	 */
	async addFirstScenarioFromBar(storyTitle: string, name: string): Promise<void> {
		await this.bar.expandStory(storyTitle);
		await this.visible('#add_first_scenario').click();
		await this.submitScenarioModal(name);
	}

	/**
	 * Adds a scenario from the stories bar (#add_scenario, shown when the story already has one).
	 * WHY: the story row must be expanded first, because its panel body is collapsed by default.
	 * @param storyTitle Exact story title, used to expand its row in the bar.
	 * @param name Scenario name.
	 */
	async addScenarioFromBar(storyTitle: string, name: string): Promise<void> {
		await this.bar.expandStory(storyTitle);
		await this.visible('#add_scenario').click();
		await this.submitScenarioModal(name);
	}

	/**
	 * Adds a scenario from the scenario editor header (#new_scenario).
	 * @param name Scenario name.
	 */
	async addScenarioFromEditor(name: string): Promise<void> {
		await this.visible('#new_scenario').click();
		await this.submitScenarioModal(name);
	}

	/**
	 * Fills the create-scenario modal and waits for it to close.
	 * @param name Scenario name typed into #newTitle.
	 */
	private async submitScenarioModal(name: string): Promise<void> {
		const modal = this.page.locator('mat-dialog-container');
		await this.typeInto(modal.locator('#newTitle'), name, 30);
		await modal.locator('button[type=submit]').click();
		await expect(modal).toHaveCount(0);
	}

	/**
	 * Adds a "Website / URL" step to the given section of the open scenario and types its URL.
	 * WHY: the step is added and typed through StepEditor. The step type is matched by its exact label in StepEditor
	 * because "Go To Website / URL" and "Correct Website / URL" contain the same words. The new step's index is the
	 * number of given steps that already exist, so it is also correct for a scenario that already has steps.
	 * @param url URL typed into the step value (no quotes: quote validation fires on blur).
	 */
	async addWebsiteStep(url: string): Promise<void> {
		const editor = new StepEditor(this.page);
		const existing = await this.page.locator('[id^="scenario_0_checkbox_"]').locator('visible=true').count();
		await editor.addStep('given', 'Website / URL');
		await editor.fillValue('given', existing, url);
	}

	/**
	 * Saves the open scenario and waits for the server to accept it.
	 * WHY: delegates to StepEditor.save, which waits for the PUT response instead of only checking the button state.
	 */
	async saveScenario(): Promise<void> {
		await new StepEditor(this.page).save();
	}

	/**
	 * Deletes the open scenario and confirms the dialog with "Delete".
	 */
	async deleteSelectedScenario(): Promise<void> {
		await this.visible('button[matTooltip="Delete Scenario"]').click();
		await this.confirmDialog('Delete');
	}

	/**
	 * Clicks a button of the open confirmation dialog.
	 * @param label Button text, e.g. "Delete" or "Cancel".
	 */
	async confirmDialog(label: string): Promise<void> {
		await this.page.locator('mat-dialog-container').getByRole('button', { name: label, exact: true }).click();
	}

	/**
	 * Opens the story delete dialog from the story editor header.
	 */
	async openDeleteStoryDialog(): Promise<void> {
		await this.visible('#story_delete').click();
		await expect(this.page.locator('mat-dialog-container')).toBeVisible();
	}
}
