import { Component, ChangeDetectionStrategy, inject, output, viewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Story } from '@shared/models/Story';

@Component({
	selector: 'app-create-scenario',
	templateUrl: './create-scenario.component.html',
	styleUrls: ['./create-scenario.component.css', '../layout-modal/layout-modal.component.css'],
	changeDetection: ChangeDetectionStrategy.Eager,
	standalone: false
})
export class CreateScenarioComponent {
	private modalService = inject(NgbModal);


	/**
     * Currently selected story
     */
	selectedStory!: Story;

	modalReference!: NgbModalRef;

	readonly createScenarioModal = viewChild.required<CreateScenarioComponent>('createScenarioModal');

	/**
     * Event emitter to add a new scenario
     */
	readonly createScenarioEvent = output<any>();

	/**
 * Opens the rename scenario Modal
 *
 */
	openCreateScenarioModal(selectedStory: Story) {
		this.selectedStory = selectedStory;
		this.modalReference = this.modalService.open(this.createScenarioModal(), {ariaLabelledBy: 'modal-basic-title'});
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
