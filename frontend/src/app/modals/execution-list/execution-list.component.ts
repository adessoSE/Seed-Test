import { Component, ViewChild, Input, Output, EventEmitter } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Scenario } from '../../model/Scenario';

@Component({
  selector: 'app-execution-list',
  templateUrl: './execution-list.component.html',
  styleUrls: ['./execution-list.component.css']
})
export class ExecutionListComponent {

  @ViewChild('executionListModal') executionListModal: any;

  @Input() inputScenario: Scenario;

  @Output() selectedExecutions = new EventEmitter<number[]>();

  selectedTestRunIds: number[] = [];

  modalReference: NgbModalRef;

  constructor(private modalService: NgbModal) {

  }

  openExecutionListModal() {
    console.log('Scenario:', this.inputScenario);
    this.modalReference = this.modalService.open(this.executionListModal);
  }

  toggleSelection(testRunId: number, isChecked: boolean) {
    if (isChecked) {
      this.selectedTestRunIds.push(testRunId);
    } else {
      this.selectedTestRunIds = this.selectedTestRunIds.filter(id => id !== testRunId);
    }
  }

  submitSelection() {
    console.log(this.selectedTestRunIds)
    this.selectedExecutions.emit(this.selectedTestRunIds);
    this.modalReference.close();
  }
}
