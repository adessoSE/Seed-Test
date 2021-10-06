import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Report } from '../model/Report';
import { ReportContainer } from '../model/ReportContainer';
import { Scenario } from '../model/Scenario';
import { Story } from '../model/Story';
import { ApiService } from '../Services/api.service';
import { ThemingService } from '../Services/theming.service';
import {Group} from '../model/Group';

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

  isDark: boolean = this.themeService.isDarkMode();

  /**
   * Event emiter to change the editor to story editor
   */
  @Output()
  changeEditor: EventEmitter<any> = new EventEmitter();

  /**
   * @ignore
   */
  constructor(public apiService: ApiService, private themeService : ThemingService) { }

  /**
   * @ignore
   */
  ngOnInit(): void {}

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
    this.apiService.getReportHistory(this.selectedStory._id).subscribe(resp => {
        this.reports = resp;
    });
  }

  /**
   * Filters the scenario reports to only the reports of the current scenario
   * @param scenario currently regarded scenario
   * @returns list of reports of this scenario
   */
   filterScenarioReports(scenario: Scenario) {
    return this.reports.scenarioReports.filter((elem) => parseInt(elem.scenarioId) == scenario.scenario_id);
  }

  /**
   * Sorts the reports depending on their report time
   * @param reps reports
   * @returns
   */
  sortReportsTime(reps) {
    return reps.sort((a, b) => a.reportTime > b.reportTime);
  }

  /**
   * Returns to story editor
   */
  goBackToStoryEditor() {
    this.changeEditor.emit();
  }

  /**
   * Creates a date out of the report time
   * @param time report time
   * @returns Name of the report with the date
   */
  stringifyReportTime(time: number) {
    const date = new Date(time).toLocaleDateString('de');
    const t = new Date(time).toLocaleTimeString('de');
    return 'Report: ' + date + ' ' + t;
  }

  /**
   * Deletes a report of the list
   * @param report report to be deleted
   */
  deleteReport(report: Report) {
    this.apiService
      .deleteReport(report._id)
      .subscribe(_resp => {
          const newReports = JSON.parse(JSON.stringify(this.reports));
          newReports.storyReports = newReports.storyReports.filter((rep) => rep._id != report._id);
          newReports.scenarioReports = newReports.scenarioReports.filter((rep) => rep._id != report._id);
          newReports.groupReports = newReports.groupReports.filter((rep) => rep._id != report._id);
          this.reports = newReports;
      });
  }

  /**
   * Set the report to not be saved
   * @param report
   */
  unsaveReport(report: Report) {
    report.isSaved = false;
    this.apiService
      .unsaveReport(report._id)
      .subscribe(_resp => {
      });
  }

  /**
   * Sets the report to be saved
   * @param report
   */
  saveReport(report: Report) {
    report.isSaved = true;
    this.apiService
      .saveReport(report._id)
      .subscribe(_resp => {
      });
  }

  isDarkModeOn () {
    this.isDark = this.themeService.isDarkMode();
    return this.isDark;
  }

}
