import { Scenario } from './../../model/Scenario';
import { StepType } from './../../model/StepType';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Component, ViewChild } from '@angular/core';
import { UntypedFormGroup, UntypedFormControl } from '@angular/forms';
import { ExampleService } from 'src/app/Services/example.service';

@Component({
    selector: 'app-new-example',
    templateUrl: './new-example.component.html',
    styleUrls: ['./new-example.component.css'],
    standalone: false
})
export class NewExampleComponent {

  /**
     * Currently selected story
     */
  step: StepType;
  selectedScenario: Scenario;
  newExampleName: string;
  columnIndex;
  exampleNames;
  modalName: string;

  modalReference: NgbModalRef;

  newExampleForm = new UntypedFormGroup({
    newName: new UntypedFormControl('')
  });

  @ViewChild('newExampleModal') newExampleModal: NewExampleComponent;

  /**
    * Event emitter to add a new example
    */
  //@Output() newExampleEvent: EventEmitter<any> = new EventEmitter();


  constructor(private modalService: NgbModal, public exampleService: ExampleService) { }

  /**
    * Opens the new example Modal
    *
    */
  openNewExampleModal(selectedScenario, exampleModalUse, columnIndex?) {
    this.selectedScenario = selectedScenario;
    switch (exampleModalUse) {
      case "rename":
        this.modalName = "Renaming an existing scenario case";
        this.renameExample(selectedScenario, columnIndex);
        break;
      case "createNew": this.modalName = "Define a new scenario case";
        break;
      case "createFirst": this.modalName = "Create a first scenario case";
        break;
      default:
        break;
    }
    this.exampleNames = (this.selectedScenario.multipleScenarios && this.selectedScenario.multipleScenarios.length > 0) ? this.selectedScenario.multipleScenarios[0].values : []
    this.modalReference = this.modalService.open(this.newExampleModal, { ariaLabelledBy: 'modal-basic-title' });
  }

  renameExample(scenario: Scenario, columnIndex) {
    this.selectedScenario = scenario;
    this.columnIndex = columnIndex;
    this.newExampleName = scenario.multipleScenarios[0].values[columnIndex]
    this.newExampleForm.setValue({
      newName: scenario.multipleScenarios[0].values[columnIndex]
    });
    this.exampleNames = this.selectedScenario.multipleScenarios[0].values
  }

  /**
  * Submits the new name for the scenario
  */
  submitExample() {
    if (this.newExampleName) {
      this.exampleService.renameExampleEvent.emit({ name: this.newExampleForm.value.newName, column: this.columnIndex })
      this.newExampleForm.get('newName').reset();
      this.modalReference.close();
    } else {
      let exampleName = this.newExampleForm.value.newName;
      //Create Scenario Emitter (argument scenario name) 
      this.exampleService.newExampleEvent.emit(exampleName);
      this.newExampleForm.get('newName').reset();
      this.modalReference.close();
    }

  }

  uniqueExample() {
    const button = (document.getElementById('submitExample')) as HTMLButtonElement;
    if (this.exampleNames != undefined) {
      button.disabled = false;
    } else {
      this.uniqueExampleName();
    }
  }
  uniqueExampleName() {
    this.exampleService.uniqueExampleName('submitExample', this.newExampleForm.value.newName, this.exampleNames)
  }

}