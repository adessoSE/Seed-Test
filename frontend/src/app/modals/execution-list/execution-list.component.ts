import { Component, ViewChild, Input, Output, EventEmitter } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Scenario } from '../../model/Scenario';
import { Story } from '../../model/Story';

@Component({
  selector: 'app-execution-list',
  templateUrl: './execution-list.component.html',
  styleUrls: ['./execution-list.component.css']
})
export class ExecutionListComponent {

  @ViewChild('executionListModal') executionListModal: any;

  @Output() selectedExecutions = new EventEmitter<{ scenarioId: number | null, selectedExecutions: number[] }>();

  selectedTestRunIds: number[] = [];

  modalReference: NgbModalRef;

  executionContext: Scenario | Story;

  testExecutions: { testRunId: number, testExecKey: string }[] = [];

  constructor(private modalService: NgbModal) {

  }

  openExecutionListModal(context: Scenario | Story) {
    this.selectedTestRunIds = [];
    this.executionContext = context;
    this.getTestExecutions(this.executionContext);
    this.modalReference = this.modalService.open(this.executionListModal, { size: 'mysize' });
  }

  toggleSelection(testRunId: number, isChecked: boolean) {
    if (isChecked) {
      this.selectedTestRunIds.push(testRunId);
    } else {
      this.selectedTestRunIds = this.selectedTestRunIds.filter(id => id !== testRunId);
    }
  }

  submitSelection() {
    if(this.isScenario(this.executionContext)){
      this.selectedExecutions.emit({ scenarioId: this.executionContext.scenario_id, selectedExecutions: this.selectedTestRunIds });
    } else {
      this.selectedExecutions.emit({ scenarioId: null, selectedExecutions: this.selectedTestRunIds });
    }
    this.modalReference.close();
  }

  getTestExecutions(executionContext) {

    this.testExecutions = [];

    if (this.isScenario(executionContext)) {
      this.testExecutions = executionContext.testRunSteps.map(step => ({ testRunId: step.testRunId, testExecKey: step.testExecKey }));
    } else if (this.isStory(executionContext)) {
      executionContext.scenarios.forEach(scenario => {
          scenario.testRunSteps.forEach(step => {
              this.testExecutions.push({ testRunId: step.testRunId, testExecKey: step.testExecKey });
          });
      });
      
      //remove dublicates
      this.testExecutions = this.testExecutions.filter((execution, index, self) =>
          index === self.findIndex(t => t.testExecKey === execution.testExecKey && t.testRunId === execution.testRunId)
      );
    }
  }

  isScenario(context: any): context is Scenario {
    return context && Array.isArray(context.testRunSteps);
  }
  
  isStory(context: any): context is Story {
    return context && Array.isArray(context.scenarios);
  }
}
