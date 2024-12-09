import { Component, ViewChild, Input, Output, EventEmitter } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Scenario } from '../../model/Scenario';
import { Story } from '../../model/Story';
import { Group } from '../../model/Group'
import { ThemingService } from '../../Services/theming.service';
import { Subscription } from 'rxjs';
import { StoryService } from '../../Services/story.service';
import { lastValueFrom } from 'rxjs';

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

  executionContext: Scenario | Story | Group;
  
  isDark: boolean;
  themeObservable: Subscription;

  testExecutions: { testRunId: number, testExecKey: string, selected: boolean }[] = [];

  constructor(private modalService: NgbModal, public themeService: ThemingService, private storyService: StoryService) {}

  ngOnInit() {
    this.isDark = this.themeService.isDarkMode();
    this.themeObservable = this.themeService.themeChanged.subscribe((_) => {
        this.isDark = this.themeService.isDarkMode();
    });
  }


  openExecutionListModal(context: Scenario | Story | Group) {
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

  async getTestExecutions(executionContext: Scenario | Story | Group) {
    this.testExecutions = [];
  
    if (this.isScenario(executionContext)) {  
      this.testExecutions = executionContext.testRunSteps.map(step => ({
        testRunId: step.testRunId,
        testExecKey: step.testExecKey,
        selected: false
      }));
    } else if (this.isStory(executionContext)) {
      executionContext.scenarios.forEach(scenario => {
        if (!scenario.testRunSteps) {
          return;
        }
        scenario.testRunSteps.forEach(step => {
          this.testExecutions.push({
            testRunId: step.testRunId,
            testExecKey: step.testExecKey,
            selected: false
          });
        });
      });
      // Remove duplicates
      this.testExecutions = this.testExecutions.filter((execution, index, self) =>
        index === self.findIndex(t => t.testExecKey === execution.testExecKey && t.testRunId === execution.testRunId)
      );
    } else if (this.isGroup(executionContext)) {
      if (executionContext.member_stories) {

        const storyIds = executionContext.member_stories.filter(story => story.title !== undefined && story.title !== null).map(story => story._id);

        const promises = storyIds.map(storyId =>
          lastValueFrom(this.storyService.getStory(storyId))
        );
  
  
        const stories = await Promise.all(promises);
        stories.forEach(story => {
          if (story.scenarios && story.scenarios.length > 0) {
            story.scenarios.forEach(scenario => {
              if (scenario.testRunSteps && scenario.testRunSteps.length > 0) {
                scenario.testRunSteps.forEach(step => {
                  this.testExecutions.push({
                    testRunId: step.testRunId,
                    testExecKey: step.testExecKey,
                    selected: false
                  });
                });
              }
            });
          }
        });
        // Remove dublicates
        this.testExecutions = this.testExecutions.filter((execution, index, self) =>
          index === self.findIndex(t => t.testExecKey === execution.testExecKey && t.testRunId === execution.testRunId)
        );
      }
    }
  }
  

  toggleAll(isChecked: boolean) {
    if (this.testExecutions.length > 0) {
      this.testExecutions.forEach(testExecution => {
        testExecution.selected = isChecked;
      });
  
      if (isChecked) {
        this.selectedTestRunIds = this.testExecutions.map(te => te.testRunId);
      } else {
        this.selectedTestRunIds = [];
      }
    }
  }
  

  isScenario(context: any): context is Scenario {
    return context && Array.isArray(context.testRunSteps);
  }
  
  isStory(context: any): context is Story {
    return context && Array.isArray(context.scenarios);
  }

  isGroup(context: any): context is Group {
    return context && Array.isArray(context.member_stories);
  }
}
