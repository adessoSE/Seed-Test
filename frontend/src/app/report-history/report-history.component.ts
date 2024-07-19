import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { StoryReport } from '../model/StoryReport';
import { ReportContainer } from '../model/ReportContainer';
import { Scenario } from '../model/Scenario';
import { Story } from '../model/Story';
import { ThemingService } from '../Services/theming.service';
import {Group} from '../model/Group';
import {ScenarioReport} from '../model/ScenarioReport';
import {GroupReport} from '../model/GroupReport';
import { ReportService } from '../Services/report.service';
import { StoryService } from '../Services/story.service';


type Report = ScenarioReport | StoryReport | GroupReport;

/**
 * Component of the report history
 */
@Component({
  selector: 'app-report-history',
  templateUrl: './report-history.component.html',
  styleUrls: ['./report-history.component.css']
})

export class ReportHistoryComponent implements OnInit {
  /**
   * Currently selected story
   */
  selectedStory: Story = null;

  /**
   * groups in the project
   */
  groups: Group[];

  /**
   * Reports of the selected story
   */
  reports: ReportContainer = null;

  isDark: boolean;
  updatedReports;


  /**
   * @ignore
   */
  constructor(private themeService: ThemingService, public reportService: ReportService, public storyService: StoryService) { }

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
        this.updatedReports = JSON.parse(storedReportComponentString);
        for (const prop in this.reports) {
          for (let i = this.reports[prop].length - 1; i >= 0; i--) {
            if (this.reports[prop][i]._id == this.updatedReports._id) {
              this.reports[prop][i] = this.updatedReports;
            }
          }  
        }
      }
    });    
  }
 
  /**
   * Sets a new currently used story
   */
  @Input()
  set newSelectedStory(story: Story) {
      this.selectedStory = story;
      if (this.selectedStory) {
        this.getReports();
      }
  }

  /**
   * Retrieves the reports of the story
   */
  getReports() {
    this.reports = null;
    this.reportService.getReportHistory(this.selectedStory._id).subscribe(resp => {
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
  sortReportsTime(reps) {
    return reps.sort((a, b) => a.reportTime > b.reportTime);
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
          newReports.storyReports = newReports.storyReports.filter((rep) => rep._id !== report._id);
          newReports.scenarioReports = newReports.scenarioReports.filter((rep) => rep._id !== report._id);
          newReports.groupReports = newReports.groupReports.filter((rep) => rep._id !== report._id);
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
    console.log(groupReport.storyStatuses.find(storyStatus => storyStatus.storyId === story_id).storyId);
    const storyStatusObj = groupReport.storyStatuses.find(storyStatus => storyStatus.storyId === story_id);
    console.log(storyStatusObj);
    return storyStatusObj.status;

  }
}
