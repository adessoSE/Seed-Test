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
        this.apiService.getReport(params.reportName).subscribe((resp) => {
          const iframe: HTMLIFrameElement = document.getElementById('testFrame') as HTMLIFrameElement;
          this.reportReceived = true;
          iframe.srcdoc = resp;
        })
      }
    });
  }

  ngOnInit() {
  }

}
