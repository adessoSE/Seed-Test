import { Component, ChangeDetectionStrategy, inject, output, viewChild, TemplateRef } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Story } from '@seed-test/shared/models/Story';
import { LayoutModalComponent, MODAL_CONFIG } from '../layout-modal/layout-modal.component';


@Component({
	selector: 'app-create-scenario',
	templateUrl: './create-scenario.component.html',
	styleUrls: ['./create-scenario.component.css', '../layout-modal/layout-modal.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [LayoutModalComponent, FormsModule]
})
export class CreateScenarioComponent {
	private modalService = inject(MatDialog);


	/**
     * Currently selected story
     */
	selectedStory!: Story;

	modalReference!: MatDialogRef<unknown>;

	readonly createScenarioModal = viewChild.required<TemplateRef<CreateScenarioComponent>>('createScenarioModal');

	/**
     * Event emitter to add a new scenario
     */
	readonly createScenarioEvent = output<string>();

	/**
 * Opens the rename scenario Modal
 *
 */
	openCreateScenarioModal(selectedStory: Story) {
		this.selectedStory = selectedStory;
		this.modalReference = this.modalService.open(this.createScenarioModal(), { ...MODAL_CONFIG, ariaLabelledBy: 'modal-basic-title' });
	}
  
	/**
  * Submits the new name for the scenario
  */
	createNewScenario(form: NgForm) {
		const scenarioName = form.value.newTitle;
		//Create Scenario Emitter (argument scenario name) 
		this.createScenarioEvent.emit(scenarioName);
		this.modalReference.close();
	}
}
