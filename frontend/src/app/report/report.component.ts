import { Component, OnInit } from '@angular/core';
import { ApiService } from '../Services/api.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-report',
  templateUrl: './report.component.html',
  styleUrls: ['./report.component.css']
})
export class ReportComponent implements OnInit {
  reportReceived: Boolean = false;


  constructor(public apiService: ApiService, public route: ActivatedRoute) { 
    this.route.params.subscribe((params) => {
      if(params.reportName){
        if(!localStorage.getItem('url_backend')){
          this.apiService.getBackendInfo().then((value) => {
            this.getReport(params.reportName);
          })
        }else {
          this.getReport(params.reportName);
        }
      }
    });
  }

  ngOnInit() {
  }

  getReport(reportName: string){
    this.apiService.getReport(reportName).subscribe((resp) => {
      const iframe: HTMLIFrameElement = document.getElementById('testFrame') as HTMLIFrameElement;
      this.reportReceived = true;
      iframe.srcdoc = resp;
    })
  }

}
