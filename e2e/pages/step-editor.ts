import { expect, type Locator, type Page } from '@playwright/test';
import { escapeRegExp } from '../helpers/text';

/** Step group of a scenario, named as in the editor headers (1. Given, 2. When, 3. Then). */
export type StepGroup = 'given' | 'when' | 'then';

/**
 * Index of each group in the editor's element ids (`scenario_<index>_...`, `scenario_add_step<index>`).
 * WHY: the ids use the position of the group in the scenario's stepDefinitions keys, which are stored as given, when, then.
 */
const GROUP_INDEX: Record<StepGroup, number> = { given: 0, when: 1, then: 2 }; // NOSONAR typescript:S7739 Gherkin step key, not a thenable

/** Matches the scenario save route PUT /story/:story_id/:scenario_id, whose last segment is the numeric scenario id. */
const SCENARIO_SAVE_PATH = /\/story\/[^/]+\/\d+$/;

/**
 * Step editor of the open scenario: adds steps from the step-type dropdown, types their values and saves the scenario.
 * Only usable while a scenario is open, e.g. after StoriesBar.openScenario or StoriesPage.gotoScenario.
 */
export class StepEditor {
	/** @param page Playwright page with a scenario open in the editor. */
	constructor(readonly page: Page) {}

	/**
	 * Returns the visible copy of an element. Needed because several editor ids exist twice (hidden and visible).
	 * @param selector CSS selector.
	 * @returns The first visible match.
	 */
	private visible(selector: string): Locator {
		return this.page.locator(selector).locator('visible=true').first();
	}

	/**
	 * Adds a step to a group by choosing its type from the step-type dropdown of that group.
	 * WHY dispatchEvent: the dropdown is shown only by the CSS :hover rule of its wrapper. Hovering the add button and then
	 * the item still failed, because a sibling <div> intercepted the pointer. The item's (click) binding is an Angular
	 * listener on the span itself, so a DOM click reaches it whether or not the menu is visible.
	 * WHY the item is taken from the add button's own wrapper: the item ids use the index in the full type list, not in
	 * the group's list, so the group is identified through the button.
	 * Waits until the group shows one more step checkbox, which every step type renders.
	 * @param group Group the step is added to.
	 * @param typeName Step type label exactly as shown in the dropdown, e.g. 'Website / URL'.
	 */
	async addStep(group: StepGroup, typeName: string): Promise<void> {
		const index = GROUP_INDEX[group];
		const wrapper = this.visible(`[id="scenario_add_step${index}"]`).locator('xpath=..');
		const item = wrapper
			.locator(`span[id^="scenario_add_step_${index}_type_"]`)
			.filter({ hasText: new RegExp(`^\\s*${escapeRegExp(typeName)}\\s*$`) })
			.first();
		const checkboxes = this.page.locator(`[id^="scenario_${index}_checkbox_"]`).locator('visible=true');
		const before = await checkboxes.count();
		await item.dispatchEvent('click');
		await expect(checkboxes).toHaveCount(before + 1);
	}

	/**
	 * Replaces the text of a step's value input by typing it the way a user does.
	 * WHY pressSequentially with a 70 ms delay: the value highlighter re-renders the contenteditable on every input
	 * event, and faster typing scrambled the value. fill() fires no key events, so the editor would keep Save disabled.
	 * WHY Ctrl+A and Backspace first: a contenteditable has no value to overwrite, so the old text is removed by hand.
	 * @param group Group of the step.
	 * @param stepIndex Position of the step inside its group, zero based.
	 * @param text Text to type. Quotes are validated on blur, so the value must not be wrapped in quotes.
	 * @param valueIndex Which value input of the step, zero based. All value inputs of a step share one id, so they
	 * are told apart by their order in the DOM.
	 */
	async fillValue(group: StepGroup, stepIndex: number, text: string, valueIndex = 0): Promise<void> {
		const index = GROUP_INDEX[group];
		const field = this.page
			.locator(`[contenteditable=true][id="scenario_${index}_input_pre_${stepIndex}"]`)
			.locator('visible=true')
			.nth(valueIndex);
		await expect(field).toBeVisible();
		await field.click();
		await field.press('ControlOrMeta+a');
		await field.press('Backspace');
		await field.pressSequentially(text, { delay: 70 });
	}

	/**
	 * Saves the open scenario and waits until the server has accepted it.
	 * WHY the response is awaited before the button state is checked: the button only switches to "Without changes" after
	 * the PUT succeeded, and a failed PUT would otherwise surface as a timeout instead of the HTTP status.
	 * Throws with the response body when the PUT does not return 2xx.
	 */
	async save(): Promise<void> {
		const [response] = await Promise.all([
			this.page.waitForResponse(r => r.request().method() === 'PUT' && SCENARIO_SAVE_PATH.test(new URL(r.url()).pathname)),
			this.visible('button#saveButton[matTooltip="Save Scenario"]').click(),
		]);
		if (!response.ok())
			throw new Error(`save scenario failed: HTTP ${response.status()} ${await response.text()}`);
		await expect(this.visible('button#saveButton[matTooltip="Without changes"]')).toBeVisible();
	}
}
