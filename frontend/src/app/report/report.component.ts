import {Component, OnInit, Input, ViewChild, ElementRef} from '@angular/core';
import {ApiService} from '../Services/api.service';
import {ActivatedRoute} from '@angular/router';
import {saveAs} from 'file-saver';
import { ThemingService } from '../Services/theming.service';
import jsPDF from 'jspdf';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
pdfMake.vfs = pdfFonts.pdfMake.vfs;
import htmlToPdfmake from 'html-to-pdfmake';
import { JsonpInterceptor } from '@angular/common/http';

pdfMake.fonts = {
    HelveticaNeue: {
      normal: 'Roboto-Regular.ttf',
      bold: 'Roboto-Medium.ttf',
      italics: 'Roboto-Italic.ttf',
      bolditalics: 'Roboto-MediumItalic.ttf'
    },
    Roboto: {
        normal: 'Roboto-Regular.ttf',
        bold: 'Roboto-Medium.ttf',
        italics: 'Roboto-Italic.ttf',
        bolditalics: 'Roboto-MediumItalic.ttf'
      }
  };

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

    @ViewChild('iframe') iframe: ElementRef;


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
        this.apiService.getReportByName(reportName).subscribe(resp => {
            console.log('report', resp);
            this.report = resp;
            this.ngOnChanges();
            // const iframe: HTMLIFrameElement = document.getElementById('reportFrame') as HTMLIFrameElement;
            // iframe.srcdoc = resp
        });
    }

    public downloadAsPDF() {
        var htmlString = '';
        const iframe = this.iframe.nativeElement;
        const projectName = iframe.contentWindow.document.getElementsByClassName('project-name')[0];
        const pie_feats = iframe.contentWindow.document.getElementById('piechart_features');
        const pie_scenario = iframe.contentWindow.document.getElementById('piechart_scenarios');
        const panel_title = iframe.contentWindow.document.getElementsByClassName('panel-title');
        const panel_body = iframe.contentWindow.document.getElementsByClassName('panel-body');
        const steps = iframe.contentWindow.document.getElementsByClassName('text');

        htmlString += '<h1>' + projectName.innerText + '</h1>';
        htmlString+= '<div style="width:200">' + pie_feats.innerHTML + '</div>';
        htmlString+= '<div style="width:200">' + pie_scenario.innerHTML + '</div>';
        htmlString+= '<br>';
        htmlString+= '<b>' + panel_title[0].innerText + ': </b><br>';
        htmlString+= panel_body[0].innerHTML;
        var t_string1 = panel_title[1].innerText.trim().replace('\n', ' ').replace(':', ' ').split(/\s+/);
        var t_string2 = panel_title[2].innerText.trim().replace('\n', ' ').replace(':', ' ').split(/\s+/);
        htmlString+= '<br><div><b>' + t_string1[0] + ': </b><em>' +  t_string1.slice(1, t_string1.length).join(' ').slice(0,-1) + '</em></div><br>';
        htmlString+= '<table><tr><th><b>' + t_string2[0] + '</b><br><b>' + t_string2[1] + ': </b><em>' +
        t_string2.slice(2, t_string2.length).join(' ').slice(0,-3) + '</em></th></tr>';
        for (let i=0; i < steps.length; i++) {
            var arr = steps[i].innerText.trim().replace('\n', ' ').split(/\s+/);
            
            var line = '<tr><td><strong>' + arr[0] + ': </strong><em>' + arr.slice(1,arr.length).join(' ') + '</em></td></tr>';
            htmlString+= line;   
        }
        htmlString += '</table>';

        var html = htmlToPdfmake(htmlString);
         
        const documentDefinition = { content: html};
        pdfMake.createPdf(documentDefinition).open(); 
         
      }
}
