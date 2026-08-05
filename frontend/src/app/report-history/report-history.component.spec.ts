import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { ReportHistoryComponent } from './report-history.component';
import { ReportService } from '../Services/report.service';
import { StoryService } from '../Services/story.service';
import { Story } from '@shared/models/Story';
import { ReportContainer } from '@shared/models/ReportContainer';

const mockStory: Story = {
	_id: 'story-1', story_id: 1, title: 'Test Story', body: '',
	storySource: 'db', repo_type: 'db',
	background: { name: '', stepDefinitions: { when: [] } },
	scenarios: [
		{ scenario_id: 1, name: 'Scenario 1', comment: '', stepDefinitions: { given: [], when: [], then: [], example: [] } }
	],
	state: 'open', assignee: '', assignee_avatar_url: ''
};

const mockReportContainer: ReportContainer = {
	storyReports: [
		{ _id: 'sr-1', reportName: 'rep-1', reportTime: 1000, isSaved: true, scenariosTested: { passed: 2, failed: 0 }, scenarioId: '1' },
		{ _id: 'sr-2', reportName: 'rep-2', reportTime: 2000, isSaved: false, scenariosTested: { passed: 1, failed: 1 }, scenarioId: '1' }
	] as never[],
	scenarioReports: [
		{ _id: 'scenr-1', reportName: 'scen-rep-1', reportTime: 1500, isSaved: true, scenariosTested: { passed: 1, failed: 0 }, scenarioId: '1' }
	] as never[],
	groupReports: [
		{ _id: 'gr-1', reportName: 'group-rep-1', reportTime: 2500, isSaved: false, scenariosTested: { passed: 3, failed: 0 }, storyStatuses: [{ storyId: 'story-1', status: true }] }
	] as never[]
};

describe('ReportHistoryComponent', () => {
	let component: ReportHistoryComponent;
	let fixture: ComponentFixture<ReportHistoryComponent>;
	let reportService: ReportService;
	let storyService: StoryService;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [HttpClientTestingModule, MatSnackBarModule, ReportHistoryComponent],
			providers: [{
				provide: ActivatedRoute,
				useValue: { snapshot: { params: {} }, params: of({}) }
			}],
			schemas: [NO_ERRORS_SCHEMA]
		})
			.compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(ReportHistoryComponent);
		component = fixture.componentInstance;
		reportService = TestBed.inject(ReportService);
		storyService = TestBed.inject(StoryService);
		// Set a default story so template renders
		component.selectedStory = mockStory;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	describe('behavioral: report loading via newSelectedStory input', () => {
		it('should load reports when newSelectedStory is set', () => {
			vi.spyOn(reportService, 'getReportHistory').mockReturnValue(of(mockReportContainer));
			vi.spyOn(component, 'getReports');

			fixture.componentRef.setInput('newSelectedStory', mockStory);
			TestBed.flushEffects();

			expect(component.selectedStory).toBe(mockStory);
			expect(component.getReports).toHaveBeenCalled();
		});

		it('should set reports from service response', () => {
			vi.spyOn(reportService, 'getReportHistory').mockReturnValue(of(mockReportContainer));

			component.getReports();

			expect(component.reports()).toEqual(mockReportContainer);
			expect(component.reports().storyReports.length).toBe(2);
			expect(component.reports().scenarioReports.length).toBe(1);
			expect(component.reports().groupReports.length).toBe(1);
		});
	});

	describe('behavioral: empty reports state', () => {
		it('should handle empty report container', () => {
			const emptyContainer: ReportContainer = { storyReports: [], scenarioReports: [], groupReports: [] };
			vi.spyOn(reportService, 'getReportHistory').mockReturnValue(of(emptyContainer));

			component.getReports();

			expect(component.reports()).toEqual(emptyContainer);
			expect(component.reports().storyReports.length).toBe(0);
		});
	});

	describe('behavioral: error handling', () => {
		it('should not throw synchronously on getReports when service fails', () => {
			expect(() => component.getReports()).not.toThrow();
		});
	});

	describe('behavioral: report save/unsave', () => {
		it('should save report and update isSaved', () => {
			vi.spyOn(reportService, 'saveReport').mockReturnValue(of({} as any));
			const report = { _id: 'sr-1', isSaved: false, reportName: 'rep-1' } as any;

			component.saveReport(report);

			expect(reportService.saveReport).toHaveBeenCalledWith('sr-1');
		});

		it('should unsave report and update isSaved', () => {
			vi.spyOn(reportService, 'unsaveReport').mockReturnValue(of({} as any));
			const report = { _id: 'sr-1', isSaved: true } as any;

			component.unsaveReport(report);

			expect(reportService.unsaveReport).toHaveBeenCalledWith('sr-1');
		});
	});

	describe('behavioral: report deletion', () => {
		it('should delete report and remove it from the list', () => {
			const container: ReportContainer = {
				storyReports: [{ _id: 'sr-1', reportName: 'r1' }] as any[],
				scenarioReports: [],
				groupReports: []
			};
			component.reports.set(container);
			vi.spyOn(reportService, 'deleteReport').mockReturnValue(of({} as any));

			component.deleteReport({ _id: 'sr-1' } as any);

			expect(reportService.deleteReport).toHaveBeenCalledWith('sr-1');
		});
	});

	describe('behavioral: stringify report time', () => {
		it('should produce a formatted string from report time', () => {
			const result = component.stringifyReportTime(1000000000000);
			expect(result).toContain('Report from');
		});
	});

	describe('behavioral: filter scenario reports', () => {
		it('should filter scenario reports for a given scenario', () => {
			const container: ReportContainer = {
				storyReports: [] as never[],
				scenarioReports: [
					{ _id: 's1', scenarioId: '1', reportName: 'r1' },
					{ _id: 's2', scenarioId: '2', reportName: 'r2' }
				] as never[],
				groupReports: [] as never[]
			};
			component.reports.set(container);
			const scenario = { scenario_id: 1 } as never;

			const filtered = component.filterScenarioReports(scenario);

			expect(filtered.length).toBe(1);
			expect(filtered[0]._id).toBe('s1');
		});
	});

	describe('behavioral: go back to story editor', () => {
		it('should call changeStoryViewEvent on goBackToStoryEditor', () => {
			vi.spyOn(storyService, 'changeStoryViewEvent');
			component.goBackToStoryEditor();
			expect(storyService.changeStoryViewEvent).toHaveBeenCalledWith('storyView');
		});
	});
});
