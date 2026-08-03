import { Component, ChangeDetectionStrategy, input, effect, untracked } from '@angular/core';
import { Scenario } from '@shared/models/Scenario';
import { Story } from '@shared/models/Story';
import { StepType } from '@shared/models/StepType';
import { BaseEditorComponent } from '../base-editor/base-editor.component';

@Component({
	selector: 'app-example',
	template: `<app-base-editor [templateName]="TEMPLATE_NAME"
    [testRunning]="testRunning()"
    [newlySelectedScenario]="selectedScenario"
    [newlySelectedStory]="selectedStory"
    [originalStepTypes]="originalStepTypes()"
   /> `,
	styleUrls: ['./example-table.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [BaseEditorComponent]
})

/* Example component */
export class ExampleComponent {
	selectedScenario!: Scenario;

	selectedStory!: Story;

	readonly originalStepTypes = input<StepType[]>([]);

	readonly templateName = input<string>('');

	/**
   * If the test is running
   */
	readonly testRunning = input(false);

	/**
   * Sets a new selected story
   */
	readonly newlySelectedStory = input<Story>();

	/** Effect: React to new selected story input */
	private readonly newlySelectedStoryEffect = effect(() => {
		const story = this.newlySelectedStory();
		if (!story) return;
		untracked(() => {
			this.selectedStory = story;
		});
	});

	/**
   * Sets a new selected scenaio
   */
	readonly newlySelectedScenario = input<Scenario>();

	/** Effect: React to new selected scenario input */
	private readonly newlySelectedScenarioEffect = effect(() => {
		const scenario = this.newlySelectedScenario();
		if (!scenario) return;
		untracked(() => {
			this.selectedScenario = scenario;
		});
	});

	readonly TEMPLATE_NAME = 'example';
}
