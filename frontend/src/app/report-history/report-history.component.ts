import { Component, ChangeDetectionStrategy, inject, signal, computed, input, effect, untracked } from '@angular/core';
import { StoryReport } from '@shared/models/StoryReport';
import { ReportContainer } from '@shared/models/ReportContainer';
import { Scenario } from '@shared/models/Scenario';
import { Story } from '@shared/models/Story';
import { ThemingService } from '../Services/theming.service';
import { Group } from '@shared/models/Group';
import {ScenarioReport} from '@shared/models/ScenarioReport';
import {GroupReport} from '@shared/models/GroupReport';
import { ReportService } from '../Services/report.service';
import { StoryService } from '../Services/story.service';
import { RouterLink } from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';


type Report = ScenarioReport | StoryReport | GroupReport;

/**
 * Component of the report history
 */
@Component({
	selector: 'app-report-history',
	templateUrl: './report-history.component.html',
	styleUrls: ['./report-history.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [RouterLink, NgTemplateOutlet],
	host: {
		'(window:storage)': 'onStorageEvent($event)'
	}
})

export class ReportHistoryComponent {
	private themeService = inject(ThemingService);
	reportService = inject(ReportService);
	storyService = inject(StoryService);

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
		this.reportService.getReportHistory(this.selectedStory._id!).subscribe(resp => {
			this.reports.set(resp);
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
	 * Deletes a report of the list
	 * @param report: StoryReport | ScenarioReport | GroupReport report to be deleted
	 */
	deleteReport(report: Report) {
		this.reportService
			// Deletion always targets a persisted report, so _id is guaranteed to be set here
			.deleteReport(report._id!)
			.subscribe(_resp => {
				const newReports: ReportContainer = JSON.parse(JSON.stringify(this.reports()));
				newReports.storyReports = newReports.storyReports.filter(rep => rep._id !== report._id);
				newReports.scenarioReports = newReports.scenarioReports.filter(rep => rep._id !== report._id);
				newReports.groupReports = newReports.groupReports.filter(rep => rep._id !== report._id);
				this.reports.set(newReports);
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
			.subscribe(_resp => {
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
			.subscribe(_resp => {
			});
	}

	getStoryStatus(groupReport: GroupReport, story_id: string) {
		console.log(story_id);
		console.log(groupReport.storyStatuses.find(storyStatus => storyStatus.storyId === story_id)!.storyId);
		const storyStatusObj = groupReport.storyStatuses.find(storyStatus => storyStatus.storyId === story_id);
		console.log(storyStatusObj);
		return storyStatusObj!.status;

	}
}
