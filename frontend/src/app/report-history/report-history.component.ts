import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Report } from '../model/Report';
import { ReportContainer } from '../model/ReportContainer';
import { Story } from '../model/Story';
import { ApiService } from '../Services/api.service';

@Component({
  selector: 'app-report-history',
  templateUrl: './report-history.component.html',
  styleUrls: ['./report-history.component.css']
})
export class ReportHistoryComponent implements OnInit {

  selectedStory: Story = null;
  reports: ReportContainer = null;

  @Output()
  changeEditor: EventEmitter<any> = new EventEmitter();

  constructor(public apiService: ApiService) { }

  ngOnInit(): void {
  }

  @Input()
  set newSelectedStory(story: Story) {
      this.selectedStory = story;
      if (this.selectedStory){
        this.getReports();
      }
  }

  getReports(){
    this.reports = null;
    this.apiService.getReportHistory(this.selectedStory._id).subscribe(resp => {
        console.log('resp.', resp)
        this.reports = resp;
    });
  }

  sortScenarioReports(scenario){
    return this.reports.scenarioReports.filter((elem) => parseInt(elem.scenarioId) == scenario.scenario_id)
  }

  sortReportsTime(reps){
    return reps.sort((a, b) => a.reportTime > b.reportTime)
  }

  goBack(){
    this.changeEditor.emit();
  }

  reportTime(time){
    let date = new Date(time).toLocaleDateString("de")
    let t = new Date(time).toLocaleTimeString("de")
    return "Report: " + date + " " + t
  }


  deleteReport(report: Report){
    console.log('report', report)
    return new Promise<void>((resolve, reject) => {this.apiService
      .deleteReport(report._id)
      .subscribe(_resp => {
          let newReports = JSON.parse(JSON.stringify(this.reports));
          newReports.storyReports = newReports.storyReports.filter((rep) => rep._id != report._id);
          newReports.scenarioReports = newReports.scenarioReports.filter((rep) => rep._id != report._id);
          this.reports = newReports;
          resolve()
      });})
  }

  unsaveReport(report: Report){
    report.isSaved = false;
    return new Promise<void>((resolve, reject) => {this.apiService
      .unsaveReport(report._id)
      .subscribe(_resp => {
          resolve()
      });})  
  }

  saveReport(report: Report){
    report.isSaved = true;
    return new Promise<void>((resolve, reject) => {this.apiService
      .saveReport(report._id)
      .subscribe(_resp => {
          resolve()
      });})
  }

}
