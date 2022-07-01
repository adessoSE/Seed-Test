import { Scenario } from './../../model/Scenario';
import { StepType } from './../../model/StepType';
import { NgForm } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Story } from 'src/app/model/Story';
import { Component, Output, ViewChild, EventEmitter } from '@angular/core';
import { ApiService } from 'src/app/Services/api.service';

@Component({
  selector: 'app-new-example',
  templateUrl: './new-example.component.html',
  styleUrls: ['./new-example.component.css']
})
export class NewExampleComponent{

  /**
     * Currently selected story
     */
   selectedStory: Story;
   step: StepType;
   selectedScenario: Scenario;
   newName: string;
   columnIndex;

   modalReference: NgbModalRef;

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
    openNewExampleModal(selectedStory, step) {
      this.selectedStory = selectedStory;
      this.step = step;
      this.modalReference = this.modalService.open(this.newExampleModal, {ariaLabelledBy: 'modal-basic-title'});
    }

    renameExample(scenario: Scenario, columnIndex) {
      this.selectedScenario = scenario;
      this.columnIndex = columnIndex;
      this.newName = scenario.stepDefinitions.example[0].values[columnIndex]
      this.modalReference = this.modalService.open(this.newExampleModal, {ariaLabelledBy: 'modal-basic-title'});
    }

  /**
  * Submits the new name for the scenario
  */
   createNewExample(form: NgForm) {
    if (this.newName){
      this.apiService.renameExampleEvent.emit({name:form.value.newName, column:this.columnIndex})
      this.modalReference.close();
    } else{

      let exampleName = form.value.newName;
      //Create Scenario Emitter (argument scenario name) 
      this.apiService.newExampleEvent.emit({step:this.step,name:exampleName});
      this.modalReference.close();
    }
  }

}
