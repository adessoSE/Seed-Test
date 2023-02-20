import { Scenario } from './../../model/Scenario';
import { StepType } from './../../model/StepType';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Component, ViewChild} from '@angular/core';
import { UntypedFormGroup, UntypedFormControl} from '@angular/forms';
import { ExampleService } from 'src/app/Services/example.service';

@Component({
  selector: 'app-new-example',
  templateUrl: './new-example.component.html',
  styleUrls: ['./new-example.component.css']
})
export class NewExampleComponent{

  /**
     * Currently selected story
     */
   step: StepType;
   selectedScenario: Scenario;
   newExampleName: string;
   columnIndex;
   exampleNames;

   modalReference: NgbModalRef;

   newExampleForm = new UntypedFormGroup ({
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
  openNewExampleModal(selectedScenario, step: StepType) {
    this.selectedScenario = selectedScenario;
    this.step = step;
    this.exampleNames = (this.selectedScenario.stepDefinitions.example && this.selectedScenario.stepDefinitions.example.length > 0)? this.selectedScenario.stepDefinitions.example[0].values : []
    this.modalReference = this.modalService.open(this.newExampleModal, {ariaLabelledBy: 'modal-basic-title'});
  }

  renameExample(scenario: Scenario, columnIndex) {
    this.selectedScenario = scenario;
    this.columnIndex = columnIndex;
    this.newExampleName = scenario.stepDefinitions.example[0].values[columnIndex]
    this.newExampleForm.setValue({
      newName: scenario.stepDefinitions.example[0].values[columnIndex]
    });
    this.exampleNames = this.selectedScenario.stepDefinitions.example[0].values
    this.modalReference = this.modalService.open(this.newExampleModal, {ariaLabelledBy: 'modal-basic-title'});
  }

  /**
  * Submits the new name for the scenario
  */
  createNewExample() {
    if (this.newExampleName){
      this.exampleService.renameExampleEvent.emit({name:this.newExampleForm.value.newName, column:this.columnIndex})
      this.modalReference.close();
    } else{

      let exampleName = this.newExampleForm.value.newName;
      //Create Scenario Emitter (argument scenario name) 
      this.exampleService.newExampleEvent.emit({step:this.step,name:exampleName});
      this.modalReference.close();
    }
  }
  uniqueExample() {
    const button = (document.getElementById('submitExample')) as HTMLButtonElement;
    if(this.exampleNames != undefined) {
      button.disabled = false;
    } else {
      this.uniqueExampleName();
    }
   }
  uniqueExampleName(){
       this.exampleService.uniqueExampleName('submitExample', this.newExampleForm.value.newName, this.exampleNames)
  }

}
