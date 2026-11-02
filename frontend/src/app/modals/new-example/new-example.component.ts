import { Scenario } from '@seed-test/shared/models/Scenario';
import { StepType } from '@seed-test/shared/models/StepType';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Component, ChangeDetectionStrategy, inject, viewChild, TemplateRef } from '@angular/core';
import { UntypedFormGroup, UntypedFormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ExampleService } from 'src/app/Services/example.service';
import { LayoutModalComponent, MODAL_CONFIG } from '../layout-modal/layout-modal.component';


@Component({
	selector: 'app-new-example',
	templateUrl: './new-example.component.html',
	styleUrls: ['./new-example.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [LayoutModalComponent, FormsModule, ReactiveFormsModule]
})
export class NewExampleComponent {
	private modalService = inject(MatDialog);
	exampleService = inject(ExampleService);


	/**
     * Currently selected story
     */
	step!: StepType;
	selectedScenario!: Scenario;
	newExampleName!: string;
	columnIndex!: number;
	exampleNames!: string[];
	modalName!: string;

	modalReference!: MatDialogRef<unknown>;

	newExampleForm = new UntypedFormGroup({
		newName: new UntypedFormControl('')
	});

	readonly newExampleModal = viewChild.required<TemplateRef<unknown>>('newExampleModal');

	/**
    * Opens the new example Modal
    *
    */
	openNewExampleModal(selectedScenario: Scenario, exampleModalUse: string, columnIndex?: number) {
		this.selectedScenario = selectedScenario;
		switch (exampleModalUse) {
			case 'rename':
				this.modalName = 'Renaming an existing scenario case';
				this.renameExample(selectedScenario, columnIndex!);
				break;
			case 'createNew': this.modalName = 'Define a new scenario case';
				break;
			case 'createFirst': this.modalName = 'Create a first scenario case';
				break;
			default:
				break;
		}
		this.exampleNames = (this.selectedScenario.multipleScenarios && this.selectedScenario.multipleScenarios.length > 0) ? this.selectedScenario.multipleScenarios[0].values : [];
		this.modalReference = this.modalService.open(this.newExampleModal(), { ...MODAL_CONFIG, ariaLabelledBy: 'modal-basic-title' });
	}

	renameExample(scenario: Scenario, columnIndex: number) {
		this.selectedScenario = scenario;
		this.columnIndex = columnIndex;
		this.newExampleName = scenario.multipleScenarios![0].values[columnIndex];
		this.newExampleForm.setValue({
			newName: scenario.multipleScenarios![0].values[columnIndex]
		});
		this.exampleNames = this.selectedScenario.multipleScenarios![0].values;
	}

	/**
  * Submits the new name for the scenario
  */
	submitExample() {
		if (this.newExampleName) {
			this.exampleService.renameExampleEmit(this.newExampleForm.value.newName, this.columnIndex);
			this.newExampleForm.get('newName')!.reset();
			this.modalReference.close();
		} else {
			const exampleName = this.newExampleForm.value.newName;
			//Create Scenario Emitter (argument scenario name) 
			this.exampleService.newExampleEmit(exampleName);
			this.newExampleForm.get('newName')!.reset();
			this.modalReference.close();
		}

	}

	uniqueExample() {
		const button = (document.getElementById('submitExample')) as HTMLButtonElement;
		if (this.exampleNames != undefined) 
			button.disabled = false;
		else 
			this.uniqueExampleName();
    
	}
	uniqueExampleName() {
		this.exampleService.uniqueExampleName('submitExample', this.newExampleForm.value.newName, this.exampleNames);
	}

}