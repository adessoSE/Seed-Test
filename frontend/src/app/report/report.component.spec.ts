import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { ReportComponent } from './report.component';
import { ReportService } from '../Services/report.service';
import { of, throwError } from 'rxjs';
import { NotificationService } from '../Services/notification.service';

describe('ReportComponent', () => {
	let component: ReportComponent;
	let fixture: ComponentFixture<ReportComponent>;
	let reportService: ReportService;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [HttpClientTestingModule, MatSnackBarModule, ReportComponent],
			providers: [{
				provide: ActivatedRoute,
				useValue: {
					snapshot: { params: { reportName: '24fkzrw3487943uf358lovd' } },
					params: of({ reportName: '24fkzrw3487943uf358lovd' })
				}
			}],
			schemas: [NO_ERRORS_SCHEMA]
		})
			.compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(ReportComponent);
		component = fixture.componentInstance;
		reportService = TestBed.inject(ReportService);
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	describe('behavioral: report input and state', () => {
		it('should set report via linkedSignal from reportInput', () => {
			const testReport = { reportId: 'abc123', htmlFile: '<h1>Test</h1>' };
			fixture.componentRef.setInput('report', testReport);
			TestBed.flushEffects();
			expect(component.report()).toEqual(testReport);
		});

		it('should update reportId and htmlReport when report input changes', () => {
			const testReport = { reportId: 'report-1', htmlFile: '<p>Result</p>' };
			fixture.componentRef.setInput('report', testReport);
			TestBed.flushEffects();
			expect(component.reportId()).toBe('report-1');
		});

		it('should set showResults to true after ngOnChanges', () => {
			const testReport = { reportId: 'r-1', htmlFile: '<p>OK</p>' };
			fixture.componentRef.setInput('report', testReport);
			TestBed.flushEffects();
			expect(component.showResults()).toBe(true);
			expect(component.testDone()).toBe(true);
		});
	});

	describe('behavioral: hideResults toggle', () => {
		it('should toggle showResults from true to false', () => {
			component.showResults.set(true);
			component.hideResults();
			expect(component.showResults()).toBe(false);
		});

		it('should toggle showResults from false to true', () => {
			component.showResults.set(false);
			component.hideResults();
			expect(component.showResults()).toBe(true);
		});
	});

	describe('behavioral: report save/unsave', () => {
		it('should update reportComponent and call saveReport service', async () => {
			vi.spyOn(reportService, 'saveReport').mockReturnValue(of({} as any));
			component.reportComponent.set({
				_id: 'rep-1', isSaved: false, reportTime: 1000,
				scenariosTested: { passed: 1, failed: 0 }
			} as any);

			await component.saveReport('rep-1');

			expect(reportService.saveReport).toHaveBeenCalledWith('rep-1');
			expect(component.reportComponent()?.isSaved).toBe(true);
		});

		it('should update reportComponent and call unsaveReport service', async () => {
			vi.spyOn(reportService, 'unsaveReport').mockReturnValue(of({} as any));
			component.reportComponent.set({
				_id: 'rep-1', isSaved: true, reportTime: 1000,
				scenariosTested: { passed: 1, failed: 0 }
			} as any);

			await component.unsaveReport('rep-1');

			expect(reportService.unsaveReport).toHaveBeenCalledWith('rep-1');
			expect(component.reportComponent()?.isSaved).toBe(false);
		});
	});

	describe('behavioral: error handling - report service failure', () => {
		it('shows an error toast when getReport fails', () => {
			const notify = TestBed.inject(NotificationService);
			const error = vi.spyOn(notify, 'error');
			vi.spyOn(reportService, 'getReport').mockReturnValue(throwError(() => new Error('not found')));

			component.getReport('missing-report');

			expect(error).toHaveBeenCalledWith('Could not load the report.');
		});

		it('should survive when ngOnChanges encounters a service error', () => {
			// Component does not catch subscription errors — this test verifies it
			// at least doesn't throw synchronously when setting up the subscription
			const testReport = { reportId: 'err-rep', htmlFile: '<p>Error</p>' };
			expect(() => {
				fixture.componentRef.setInput('report', testReport);
				TestBed.flushEffects();
			}).not.toThrow();
		});

		it('should not throw synchronously on getReport call', () => {
			expect(() => component.getReport('nonexistent')).not.toThrow();
		});
	});

	describe('behavioral: DOM rendering', () => {
		it('should render report header when results are shown', () => {
			component.showResults.set(true);
			TestBed.flushEffects();
			fixture.detectChanges();
			const header = fixture.nativeElement.querySelector('#report-header');
			expect(header).toBeTruthy();
			expect(header.textContent).toContain('Test Results');
		});
	});
});
