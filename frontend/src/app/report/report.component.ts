import {Component, OnInit, Input} from '@angular/core';
import {ApiService} from '../Services/api.service';
import {ActivatedRoute} from '@angular/router';

/**
 * Component to show the report
 */
@Component({
    selector: 'app-report',
    templateUrl: './report.component.html',
    styleUrls: ['./report.component.css']
})
export class ReportComponent implements OnInit {
    reportReceived: Boolean = false;

    @Input() report


    /**
     * Retrieves the report
     * @param apiService
     * @param route
     */
    constructor(public apiService: ApiService, public route: ActivatedRoute) {
    }

    /**
     * @ignore
     */
    ngOnInit() {
    }

    ngOnChanges() {
        console.log(this.report.htmlFile)
        const iframe: HTMLIFrameElement = document.getElementById('testFrame') as HTMLIFrameElement;
        iframe.srcdoc = this.report.htmlFile
    }

}
