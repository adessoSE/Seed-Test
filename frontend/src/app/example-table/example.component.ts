import { Component, Input, ChangeDetectionStrategy, input } from '@angular/core';
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
    changeDetection: ChangeDetectionStrategy.Eager,
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
	@Input()
	set newlySelectedStory(story: Story) {
		this.selectedStory = story;
	}

	/**
   * Sets a new selected scenaio
   */
	@Input()
	set newlySelectedScenario(scenario: Scenario) {
		this.selectedScenario = scenario;
	}

	readonly TEMPLATE_NAME = 'example';
}
