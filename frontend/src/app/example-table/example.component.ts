import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { Scenario } from '@seed-test/shared/models/Scenario';
import { Story } from '@seed-test/shared/models/Story';
import { StepType } from '@seed-test/shared/models/StepType';
import { BaseEditorComponent } from '../base-editor/base-editor.component';

@Component({
	selector: 'app-example',
	template: `<app-base-editor [templateName]="TEMPLATE_NAME"
    [testRunning]="testRunning()"
    [newlySelectedScenario]="newlySelectedScenario()"
    [newlySelectedStory]="newlySelectedStory()"
    [originalStepTypes]="originalStepTypes()"
   /> `,
	styleUrls: ['./example-table.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [BaseEditorComponent]
})

/* Example component */
export class ExampleComponent {
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

	/**
   * Sets a new selected scenaio
   */
	readonly newlySelectedScenario = input<Scenario>();

	readonly TEMPLATE_NAME = 'example';
}
