import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
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
}
