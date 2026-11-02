import { Component, ChangeDetectionStrategy, inject, signal, computed, input, effect, untracked } from '@angular/core';
import { StoryReport } from '@seed-test/shared/models/StoryReport';
import { ReportContainer } from '@seed-test/shared/models/ReportContainer';
import { Scenario } from '@seed-test/shared/models/Scenario';
import { Story } from '@seed-test/shared/models/Story';
import { ThemingService } from '../Services/theming.service';
import { Group } from '@seed-test/shared/models/Group';
import {ScenarioReport} from '@seed-test/shared/models/ScenarioReport';
import {GroupReport} from '@seed-test/shared/models/GroupReport';
import { ReportService } from '../Services/report.service';
import { StoryService } from '../Services/story.service';
import { NotificationService } from '../Services/notification.service';
import { RouterLink } from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent, ConfirmDialogData } from '../modals/confirm-dialog/confirm-dialog.component';


type Report = ScenarioReport | StoryReport | GroupReport;

/**
 * Component of the report history
 */
@Component({
	selector: 'app-report-history',
	templateUrl: './report-history.component.html',
	styleUrls: ['./report-history.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [RouterLink, NgTemplateOutlet, MatTooltipModule],
	host: {
		'(window:storage)': 'onStorageEvent($event)'
	}
})

export class ReportHistoryComponent {
	private themeService = inject(ThemingService);
	reportService = inject(ReportService);
	storyService = inject(StoryService);
	private notify = inject(NotificationService);
	private dialog = inject(MatDialog);

	/**
	 * Currently selected story
	 */
	selectedStory!: Story;

	/**
	 * groups in the project
	 */
	groups!: Group[];

	/**
	 * Reports of the selected story
	 */
	readonly reports = signal<ReportContainer>(null as unknown as ReportContainer);

	readonly isDark = computed(() => this.themeService.isDark());
	updatedReports?: Report;

	/**
	 * Handles cross-tab report updates via localStorage storage events.
	 * Creates a new reports object to properly trigger signal change detection.
	 */
	onStorageEvent(event: StorageEvent) {
		if (event.key === 'reportComponent') {
			const storedReportComponentString = localStorage.getItem('reportComponent');
			this.updatedReports = JSON.parse(storedReportComponentString!);
			const currentReports = this.reports();
			if (!currentReports) return;
			// Deep-copy to avoid mutating the signal's inner value by reference
			const newReports: ReportContainer = JSON.parse(JSON.stringify(currentReports));
			for (const prop in newReports) {
				const list = newReports[prop as keyof ReportContainer] as Report[];
				for (let i = list.length - 1; i >= 0; i--)
					if (list[i]._id == this.updatedReports!._id)
						list[i] = this.updatedReports!;
			}

			this.reports.set(newReports);
		}
	}

	/**
	 * Sets a new currently used story
	 */
	readonly newSelectedStory = input<Story>();

	/** Loads reports when a new story is selected */
	private newSelectedStoryEffect = effect(() => {
		const story = this.newSelectedStory();
		if (story === undefined) return;
		untracked(() => {
			this.selectedStory = story;
			if (this.selectedStory)
				this.getReports();
		});
	});

	/**
	 * Retrieves the reports of the story
	 */
	getReports() {
		this.reports.set(null as unknown as ReportContainer);
		this.reportService.getReportHistory(this.selectedStory._id!).subscribe({
			next: resp => this.reports.set(resp),
			error: () => this.notify.error('Could not load the report history.')
		});
	}

	/**
	 * Filters the scenario reports to only the reports of the current scenario
	 * @param scenario currently regarded scenario
	 * @returns list of reports of this scenario
	 */
	filterScenarioReports(scenario: Scenario) {
		return this.reports().scenarioReports.filter((elem) => parseInt(elem.scenarioId, 10) === scenario.scenario_id);
	}

	/**
	 * Sorts the reports depending on their report time
	 * @param reps reports
	 * @returns an array, sorted by the timestamps
	 */
	sortReportsTime(reps: Report[]) {
		return reps.sort((a, b) => a.reportTime - b.reportTime);
	}

	/**
	 * Returns to story editor
	 */
	goBackToStoryEditor() {
		this.storyService.changeStoryViewEvent('storyView');
	}

	/**
	 * Creates a date out of the report time
	 * @param time report time
	 * @returns Name of the report with the date
	 */
	stringifyReportTime(time: number) {
		const date = new Date(time).toLocaleDateString('de');
		const t = new Date(time).toLocaleTimeString('de');
		return 'Report from ' + date + ' ' + t;
	}

	/**
	 * Asks the user to confirm before a report is deleted. Only a confirmed dialog reaches deleteReport.
	 * @param report: StoryReport | ScenarioReport | GroupReport report to be deleted
	 */
	confirmDeleteReport(report: Report) {
		const ref = this.dialog.open(ConfirmDialogComponent, {
			data: {
				title: 'Delete Report?',
				message: 'Are you sure you want to delete this report? It cannot be restored.',
				buttons: [
					{ label: 'Delete', value: 'delete', color: 'warn' },
					{ label: 'Cancel', value: 'cancel' }
				]
			} as ConfirmDialogData
		});
		// CASE 1: Only an explicit "delete" button continues to deleteReport
		// CASE 2: Cancel and backdrop dismiss (undefined) delete nothing
		ref.afterClosed().subscribe(result => {
			if (result === 'delete') this.deleteReport(report);
		});
	}

	/**
	 * Deletes a report of the list
	 * @param report: StoryReport | ScenarioReport | GroupReport report to be deleted
	 */
	deleteReport(report: Report) {
		this.reportService
			// Deletion always targets a persisted report, so _id is guaranteed to be set here
			.deleteReport(report._id!)
			.subscribe({
				next: _resp => {
					const newReports: ReportContainer = JSON.parse(JSON.stringify(this.reports()));
					newReports.storyReports = newReports.storyReports.filter(rep => rep._id !== report._id);
					newReports.scenarioReports = newReports.scenarioReports.filter(rep => rep._id !== report._id);
					newReports.groupReports = newReports.groupReports.filter(rep => rep._id !== report._id);
					this.reports.set(newReports);
				},
				error: () => this.notify.error('Could not delete the report.')
			});
	}

	/**
	 * Set the report to not be saved
	 * @param report: StoryReport | ScenarioReport | GroupReport
	 */
	unsaveReport(report: Report) {
		report.isSaved = false;
		localStorage.setItem('reportComponent', JSON.stringify(report));
		this.reportService
			// Unsaving always targets a persisted report, so _id is guaranteed to be set here
			.unsaveReport(report._id!)
			.subscribe({
				error: () => this.notify.error('Could not unsave the report.')
			});
	}

	/**
	 * Sets the report to be saved
	 * @param report: StoryReport | ScenarioReport | GroupReport
	 */
	saveReport(report: StoryReport | ScenarioReport | GroupReport) {
		report.isSaved = true;
		localStorage.setItem('reportComponent', JSON.stringify(report));
		this.reportService
			// Saving always targets a persisted report, so _id is guaranteed to be set here
			.saveReport(report._id!)
			.subscribe({
				error: () => this.notify.error('Could not save the report.')
			});
	}

	getStoryStatus(groupReport: GroupReport, story_id: string) {
		const storyStatusObj = groupReport.storyStatuses.find(storyStatus => storyStatus.storyId === story_id);
		return storyStatusObj!.status;

	}
}
