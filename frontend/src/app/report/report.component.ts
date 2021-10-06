import {Component, OnInit, Input} from '@angular/core';
import {ApiService} from '../Services/api.service';
import {ActivatedRoute} from '@angular/router';
import {saveAs} from 'file-saver';
import { ThemingService } from '../Services/theming.service';

/**
 * Component to show the report
 */
@Component({
    selector: 'app-report',
    templateUrl: './report.component.html',
    styleUrls: ['./report.component.css']
})
export class ReportComponent implements OnInit {

    /**
     * if the test is done
     */
    testDone = false;

    @Input() report;

    reportId;

    reportIsSaved;

    /**
     * html report of the result
     */
    htmlReport: BlobPart;

    /**
     * If the results should be shown
     */
    showResults = false;

    isDark:boolean;


    /**
     * Retrieves the report
     * @param apiService
     * @param route
     */
    constructor(public apiService: ApiService, public route: ActivatedRoute, 
        private themeService: ThemingService) {
        this.route.params.subscribe(params => {
            if (params.reportName) {
                if (!localStorage.getItem('url_backend')) {
                    this.apiService.getBackendInfo().then(value => {
                        this.getReport(params.reportName);
                    });
                } else {
                    this.getReport(params.reportName);
                }
            }
        });
    }

    /**
     * @ignore
     */
    ngOnInit() {
        this.isDark = this.themeService.isDarkMode();
        this.themeService.themeChanged
        .subscribe((currentTheme) => {
            this.isDark = this.themeService.isDarkMode()
    });
    }

    ngOnChanges() {
        this.reportId = this.report.reportId;
        this.htmlReport = this.report.htmlFile;
        this.testDone = true;
        this.reportIsSaved = false;
        const iframe: HTMLIFrameElement = document.getElementById('testFrameReport') as HTMLIFrameElement;
        iframe.srcdoc = this.report.htmlFile;
        this.showResults = true;
        setTimeout(function () {
            iframe.scrollIntoView();
        }, 10);
    }

    /**
     * Hide the test results
     */
    hideResults() {
        this.showResults = !this.showResults;
    }

    /**
     * Mark the report as not saved
     * @param reportId
     * @returns
     */
    unsaveReport(reportId) {
        this.reportIsSaved = false;
        return new Promise<void>((resolve, reject) => {this.apiService
            .unsaveReport(reportId)
            .subscribe(_resp => {
                resolve();
            }); });
    }

    /**
     * Mark the report as saved
     * @param reportId
     * @returns
     */
    saveReport(reportId) {
        this.reportIsSaved = true;
        return new Promise<void>((resolve, reject) => {this.apiService
            .saveReport(reportId)
            .subscribe(_resp => {
                resolve();
            }); });
    }

    /**
     * Download the test report
     */
    downloadFile() {
        const blob = new Blob([this.htmlReport], {type: 'text/html'});
        saveAs(blob, this.reportId + '.html');
    }

    getReport(reportName: string) {
        this.apiService.getReport(reportName).subscribe(resp => {
            console.log('report', resp);
            this.report = resp;
            this.ngOnChanges();
            // const iframe: HTMLIFrameElement = document.getElementById('reportFrame') as HTMLIFrameElement;
            // iframe.srcdoc = resp
        });
    }
}
