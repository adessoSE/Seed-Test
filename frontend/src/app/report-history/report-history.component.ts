import { Component, Input, OnInit, AfterContentInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { StoryReport } from '@shared/models/StoryReport';
import { ReportContainer } from '@shared/models/ReportContainer';
import { Scenario } from '@shared/models/Scenario';
import { Story } from '@shared/models/Story';
import { ThemingService } from '../Services/theming.service';
import { Group } from '@shared/models/Group';
import {ScenarioReport} from '@shared/models/ScenarioReport';
import {GroupReport} from '@shared/models/GroupReport';
import { ReportService } from '../Services/report.service';
import { StoryService } from '../Services/story.service';


type Report = ScenarioReport | StoryReport | GroupReport;

/**
 * Component of the report history
 */
@Component({
	selector: 'app-report-history',
	templateUrl: './report-history.component.html',
	styleUrls: ['./report-history.component.css'],
	changeDetection: ChangeDetectionStrategy.Eager,
	standalone: false
})

export class ReportHistoryComponent implements OnInit, AfterContentInit {
	private themeService = inject(ThemingService);
	reportService = inject(ReportService);
	storyService = inject(StoryService);

	/**
   * Currently selected story
   */
	selectedStory: Story = null as any;

	/**
   * groups in the project
   */
	groups!: Group[];

	/**
   * Reports of the selected story
   */
	reports: ReportContainer = null as any;

	isDark!: boolean;
	updatedReports: any;

	/**
   * @ignore
   */
	ngOnInit(): void {
		this.isDark = this.themeService.isDarkMode();
	}

	ngAfterContentInit(){
		window.addEventListener('storage', (event) => {
			if (event.key === 'reportComponent') {
				const storedReportComponentString = localStorage.getItem('reportComponent');
				this.updatedReports = JSON.parse(storedReportComponentString!);
				for (const prop in this.reports)
					for (let i = (this.reports as any)[prop].length - 1; i >= 0; i--)
						if ((this.reports as any)[prop][i]._id == this.updatedReports._id)
							(this.reports as any)[prop][i] = this.updatedReports;
            
        
			}
		});    
	}
 
	/**
   * Sets a new currently used story
   */
	@Input()
	set newSelectedStory(story: Story) {
		this.selectedStory = story;
		if (this.selectedStory) 
			this.getReports();
      
	}

	/**
   * Retrieves the reports of the story
   */
	getReports() {
		this.reports = null as any;
		this.reportService.getReportHistory(this.selectedStory._id!).subscribe(resp => {
			this.reports = resp;
		});
	}

	/**
   * Filters the scenario reports to only the reports of the current scenario
   * @param scenario currently regarded scenario
   * @returns list of reports of this scenario
   */
	filterScenarioReports(scenario: Scenario) {
		return this.reports.scenarioReports.filter((elem) => parseInt(elem.scenarioId, 10) === scenario.scenario_id);
	}

	/**
   * Sorts the reports depending on their report time
   * @param reps reports
   * @returns an array, sorted by the timestamps
   */
	sortReportsTime(reps: any[]) {
		return reps.sort((a: any, b: any) => a.reportTime - b.reportTime);
	}

	/**
   * Returns to story editor
   */
	goBackToStoryEditor() {
		this.storyService.changeStoryViewEvent('storyView');
	}

	/**
   * Creates a date out of the report time
   * @param time report time
   * @returns Name of the report with the date
   */
	stringifyReportTime(time: number) {
		const date = new Date(time).toLocaleDateString('de');
		const t = new Date(time).toLocaleTimeString('de');
		return 'Report from ' + date + ' ' + t;
	}

	/**
   * Deletes a report of the list
   * @param report: StoryReport | ScenarioReport | GroupReport report to be deleted
   */
	deleteReport(report: Report) {
		this.reportService
			.deleteReport(report._id)
			.subscribe(_resp => {
				const newReports = JSON.parse(JSON.stringify(this.reports));
				newReports.storyReports = newReports.storyReports.filter((rep: any) => rep._id !== report._id);
				newReports.scenarioReports = newReports.scenarioReports.filter((rep: any) => rep._id !== report._id);
				newReports.groupReports = newReports.groupReports.filter((rep: any) => rep._id !== report._id);
				this.reports = newReports;
			});
	}

	/**
   * Set the report to not be saved
   * @param report: StoryReport | ScenarioReport | GroupReport
   */
	unsaveReport(report: Report) {
		report.isSaved = false;
		localStorage.setItem('reportComponent', JSON.stringify(report));
		this.reportService
			.unsaveReport(report._id)
			.subscribe(_resp => {
			});
	}

	/**
   * Sets the report to be saved
   * @param report: StoryReport | ScenarioReport | GroupReport
   */
	saveReport(report: StoryReport | ScenarioReport | GroupReport) {
		report.isSaved = true;
		localStorage.setItem('reportComponent', JSON.stringify(report));
		this.reportService
			.saveReport(report._id)
			.subscribe(_resp => {
			});
	}

	isDarkModeOn () {
		this.isDark = this.themeService.isDarkMode();
		return this.isDark;
	}

	getStoryStatus(groupReport: GroupReport, story_id: string) {
		console.log(story_id);
		console.log(groupReport.storyStatuses.find(storyStatus => storyStatus.storyId === story_id)!.storyId);
		const storyStatusObj = groupReport.storyStatuses.find(storyStatus => storyStatus.storyId === story_id);
		console.log(storyStatusObj);
		return storyStatusObj!.status;

	}
}
