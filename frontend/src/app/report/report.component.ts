import { Component, ElementRef, OnChanges, ChangeDetectionStrategy, inject, viewChild, computed, signal, effect, untracked, input, linkedSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {ApiService} from '../Services/api.service';
import {ActivatedRoute} from '@angular/router';
import {saveAs} from 'file-saver';
import { ThemingService } from '../Services/theming.service';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ReportService } from '../Services/report.service';
import type { StoryReport } from '@seed-test/shared/models/StoryReport';
import type { ScenarioReport } from '@seed-test/shared/models/ScenarioReport';
import type { GroupReport } from '@seed-test/shared/models/GroupReport';

/** Data structure passed into the report component for rendering */
interface ReportViewData {
	reportId: string;
	htmlFile: string;
}

/** Union of all possible report types returned by the report service */
type AnyReport = StoryReport | ScenarioReport | GroupReport;


/**
 * Component to show the report
 */
@Component({
	selector: 'app-report',
	templateUrl: './report.component.html',
	styleUrls: ['./report.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: {
		'(window:storage)': 'onStorageEvent($event)'
	}
})
export class ReportComponent implements OnChanges {
	apiService = inject(ApiService);
	route = inject(ActivatedRoute);
	reportService = inject(ReportService);
	private themeService = inject(ThemingService);


	/**
     * if the test is done
     */
	readonly testDone = signal(false);

	// eslint-disable-next-line @angular-eslint/no-input-rename
	protected readonly reportInput = input<ReportViewData | null>(null, { alias: 'report' });
	readonly report = linkedSignal(() => this.reportInput());

	readonly reportId = signal<string | null>(null);

	/** Current report data object */
	readonly reportComponent = signal<AnyReport | null>(null);
	/**
     * Changed report from other tabs via localStorage
     */
	updatedReports: AnyReport | null = null;
	/**
     * html report of the result
     */
	htmlReport!: BlobPart;

	/**
     * If the results should be shown
     */
	readonly showResults = signal(false);

	readonly isDark = computed(() => this.themeService.isDark());

	readonly iframe = viewChild.required<ElementRef>('iframe');

	/** Route params as a signal — triggers report loading when reportName changes */
	private readonly routeParams = toSignal(this.route.params);

	/** Processes the report when the report input changes (replaces automatic ngOnChanges for signal input) */
	private readonly reportInputEffect = effect(() => {
		const report = this.reportInput();
		if (!report) return;
		untracked(() => this.ngOnChanges());
	});

	/** Loads the report when the route reportName param changes */
	private readonly reportNameEffect = effect(() => {
		const params = this.routeParams();
		if (!params?.['reportName']) return;
		const reportName = params['reportName'];
		untracked(() => {
			if (!localStorage.getItem('url_backend'))
				this.apiService.getBackendInfo().then(_ => {
					this.getReport(reportName);
				});
			else
				this.getReport(reportName);
		});
	});


	ngOnChanges() {
		// Non-null assertions: this is only invoked when reportInput()/report() has already
		// been populated (guarded by the reportInputEffect / after getReport() sets it directly)
		this.reportId.set(this.report()!.reportId);
		this.htmlReport = this.report()!.htmlFile;
		this.testDone.set(true);
		const iframe: HTMLIFrameElement = document.getElementById('testFrameReport') as HTMLIFrameElement;
		iframe.srcdoc = this.report()!.htmlFile;
		this.showResults.set(true);
		setTimeout(() => {
			iframe?.scrollIntoView?.();
		}, 10);
		if (this.reportId())
			return new Promise<void>((resolve, _reject) => {
				this.reportService
					.getReportData(this.reportId()!)
					.subscribe(resp => {
						this.reportComponent.set(resp);
						resolve();
					});
			});

	}

	/**
	 * Handles cross-tab report updates via localStorage storage events
	 */
	onStorageEvent(event: StorageEvent) {
		if (event.key === 'reportComponent') {
			const storedReportComponentString = localStorage.getItem('reportComponent');
			this.updatedReports = JSON.parse(storedReportComponentString!) as AnyReport;
			if (this.updatedReports?._id === this.reportComponent()?._id)
				this.reportComponent.set(JSON.parse(storedReportComponentString!));
		}
	}

	/**
     * Hide the test results
     */
	hideResults() {
		this.showResults.update(v => !v);
	}

	/**
     * Mark the report as not saved
     * @param reportId
     * @returns
     */
	unsaveReport(reportId: string) {
		// Guard against null: spreading a null report would otherwise produce an
		// object shape that satisfies neither AnyReport nor null
		this.reportComponent.update(r => r ? { ...r, isSaved: false } : r);
		localStorage.setItem('reportComponent', JSON.stringify(this.reportComponent()));
		return new Promise<void>((resolve, _reject) => {
			this.reportService
				.unsaveReport(reportId)
				.subscribe(_resp => {
					resolve();
				});
		});
	}

	/**
     * Mark the report as saved
     * @param reportId
     * @returns
     */
	saveReport(reportId: string) {
		// Guard against null: spreading a null report would otherwise produce an
		// object shape that satisfies neither AnyReport nor null
		this.reportComponent.update(r => r ? { ...r, isSaved: true } : r);
		localStorage.setItem('reportComponent', JSON.stringify(this.reportComponent()));
		return new Promise<void>((resolve, _reject) => {
			this.reportService
				.saveReport(reportId)
				.subscribe(_resp => {
					resolve();
				});
		});
	}

	/**
     * Download the test report
     */
	downloadFile() {
		const blob = new Blob([this.htmlReport], {type: 'text/html'});
		saveAs(blob, this.reportId() + '.html');
	}

	getReport(reportName: string) {
		this.reportService.getReport(reportName).subscribe(resp => {
			console.log('report', resp);
			// getReport() returns a loosely-typed Record; cast to the shape this component expects
			this.report.set(resp as unknown as ReportViewData);
			this.ngOnChanges();
			// const iframe: HTMLIFrameElement = document.getElementById('reportFrame') as HTMLIFrameElement;
			// iframe.srcdoc = resp
		});
	}

	public exportHtmlToPDF(){
		const iframe = this.iframe().nativeElement;
		const body = iframe.contentWindow.document.getElementsByTagName('body')[0];
		const divEl =  iframe.contentWindow.document.querySelectorAll('[id^="collapseFeature"]');
		for (const element of divEl)
			element.classList.add('in');


		html2canvas(body).then(canvas => {

			const imgData = canvas.toDataURL('image/jpeg', 1.0);
			const imgWidth = 206;
			const pageHeight = 295;
			const imgHeight = canvas.height * imgWidth / canvas.width - 10;
			let heightLeft = imgHeight;

			const doc = new jsPDF('p', 'mm', 'a4');
			let position;
			doc.addImage(imgData, 'PNG', 0, 12, imgWidth, imgHeight);

			heightLeft -= pageHeight;

			while (heightLeft >= 0) {
				position = heightLeft - imgHeight;
				doc.addPage();
				doc.addImage(imgData, 'PNG', 0, position + 12, imgWidth, imgHeight);
				heightLeft -= pageHeight;
			}

			doc.save(this.reportId() + '.pdf');
		});
	}

}
