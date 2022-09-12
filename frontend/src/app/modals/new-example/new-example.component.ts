import { Scenario } from './../../model/Scenario';
import { StepType } from './../../model/StepType';
import { NgForm } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Component, Output, ViewChild, EventEmitter } from '@angular/core';
import { ApiService } from 'src/app/Services/api.service';
import { FormGroup, FormControl} from '@angular/forms';

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

   newExampleForm = new FormGroup ({
    newName: new FormControl('')
  });

   @ViewChild('newExampleModal') newExampleModal: NewExampleComponent;

   /**
     * Event emitter to add a new example
     */
  //@Output() newExampleEvent: EventEmitter<any> = new EventEmitter();


  constructor(private modalService: NgbModal, public apiService: ApiService) { }

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
      this.apiService.renameExampleEvent.emit({name:this.newExampleForm.value.newName, column:this.columnIndex})
      this.modalReference.close();
    } else{

      let exampleName = this.newExampleForm.value.newName;
      //Create Scenario Emitter (argument scenario name) 
      this.apiService.newExampleEvent.emit({step:this.step,name:exampleName});
      this.modalReference.close();
    }
  }

  uniqueExampleName(){
    this.apiService.uniqueExampleName('submitExample', this.newExampleForm.value.newName, this.exampleNames)
  }

}
