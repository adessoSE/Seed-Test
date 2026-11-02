import { Component, ChangeDetectionStrategy, TemplateRef, inject, output, viewChild, computed } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Scenario } from '@seed-test/shared/models/Scenario';
import { Story } from '@seed-test/shared/models/Story';
import { Group } from '@seed-test/shared/models/Group';
import { ThemingService } from '../../Services/theming.service';
import { lastValueFrom } from 'rxjs';
import { StoryService } from '../../Services/story.service';
import { LayoutModalComponent, MODAL_CONFIG } from '../layout-modal/layout-modal.component';
import { FormsModule } from '@angular/forms';

@Component({
	selector: 'app-execution-list',
	templateUrl: './execution-list.component.html',
	styleUrls: ['./execution-list.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [LayoutModalComponent, FormsModule]
})
export class ExecutionListComponent {
	private modalService = inject(MatDialog);
	themeService = inject(ThemingService);
	private storyService = inject(StoryService);


	readonly executionListModal = viewChild<TemplateRef<unknown>>('executionListModal');

	readonly selectedExecutions = output<{
		scenarioId: number | null;
		selectedExecutions: number[];
	}>();

	selectedTestRunIds: number[] = [];

	modalReference!: MatDialogRef<unknown>;

	executionContext!: Scenario | Story | Group;

	readonly isDark = computed(() => this.themeService.isDark());

	testExecutions: { testRunId: number, testExecKey: string, selected: boolean }[] = [];


	openExecutionListModal(context: Scenario | Story | Group) {
		this.selectedTestRunIds = [];
		this.executionContext = context;
		this.getTestExecutions(this.executionContext);
		this.modalReference = this.modalService.open(this.executionListModal()!, MODAL_CONFIG);
	}

	toggleSelection(testRunId: number, isChecked: boolean) {
		if (isChecked) 
			this.selectedTestRunIds.push(testRunId);
		else 
			this.selectedTestRunIds = this.selectedTestRunIds.filter(id => id !== testRunId);
    
	}

	submitSelection() {
		if (this.isScenario(this.executionContext))
			this.selectedExecutions.emit({ scenarioId: this.executionContext.scenario_id, selectedExecutions: this.selectedTestRunIds });
		else 
			this.selectedExecutions.emit({ scenarioId: null, selectedExecutions: this.selectedTestRunIds });
    
		this.modalReference.close();
	}

	async getTestExecutions(executionContext: Scenario | Story | Group) {
		this.testExecutions = [];
  
		if (this.isScenario(executionContext))   
			this.testExecutions = executionContext.testRunSteps!.map(step => ({
				testRunId: step.testRunId,
				testExecKey: step.testExecKey,
				selected: false
			}));
		else if (this.isStory(executionContext)) {
			executionContext.scenarios.forEach(scenario => {
				if (!scenario.testRunSteps) 
					return;
        
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
		} else if (this.isGroup(executionContext)) 
		// member_stories contains string IDs — fetch each story to collect test executions
			if (executionContext.member_stories && executionContext.member_stories.length > 0) {
				const promises = executionContext.member_stories.map(storyId =>
					lastValueFrom(this.storyService.getStory(storyId))
				);
  
  
				const stories = await Promise.all(promises);
				stories.forEach(story => {
					if (story.scenarios && story.scenarios.length > 0) 
						story.scenarios.forEach((scenario: Scenario) => {
							if (scenario.testRunSteps && scenario.testRunSteps.length > 0)
								scenario.testRunSteps.forEach((step: { testRunId: number; testRunStepId: number; testExecKey: string }) => {
									this.testExecutions.push({
										testRunId: step.testRunId,
										testExecKey: step.testExecKey,
										selected: false
									});
								});
              
						});
          
				});
				// Remove dublicates
				this.testExecutions = this.testExecutions.filter((execution, index, self) =>
					index === self.findIndex(t => t.testExecKey === execution.testExecKey && t.testRunId === execution.testRunId)
				);
			}
    
	}
  

	toggleAll(isChecked: boolean) {
		if (this.testExecutions.length > 0) {
			this.testExecutions.forEach(testExecution => {
				testExecution.selected = isChecked;
			});
  
			if (isChecked) 
				this.selectedTestRunIds = this.testExecutions.map(te => te.testRunId);
			else 
				this.selectedTestRunIds = [];
      
		}
	}
  

	isScenario(context: Scenario | Story | Group): context is Scenario {
		return 'testRunSteps' in context && Array.isArray((context as Scenario).testRunSteps);
	}

	isStory(context: Scenario | Story | Group): context is Story {
		return 'scenarios' in context && Array.isArray((context as Story).scenarios);
	}

	isGroup(context: Scenario | Story | Group): context is Group {
		return 'member_stories' in context && Array.isArray((context as Group).member_stories);
	}
}
