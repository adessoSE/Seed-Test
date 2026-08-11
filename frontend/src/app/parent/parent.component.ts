import { Component, OnInit, ChangeDetectionStrategy, inject, computed, signal, effect, linkedSignal, untracked } from '@angular/core';
import { ApiService } from '../Services/api.service';
import { Story } from '@shared/models/Story';
import { Scenario } from '@shared/models/Scenario';
import { RepositoryContainer } from '@shared/models/RepositoryContainer';
import { Group } from '@shared/models/Group';
import { ActivatedRoute } from '@angular/router';
import { ThemingService } from '../Services/theming.service';

import { StoryService } from '../Services/story.service';
import { GroupService } from '../Services/group.service';
import { ProjectService } from '../Services/project.service';
import { StoriesBarComponent } from '../stories-bar/stories-bar.component';
import { StoryEditorComponent } from '../story-editor/story-editor.component';
import { ReportHistoryComponent } from '../report-history/report-history.component';
import { FileManagerComponent } from '../file-manager/file-manager.component';
import { ReportComponent } from '../report/report.component';


/**
 * Component containing the Story-Bar and Story Editor
 */
@Component({
	selector: 'app-parent',
	templateUrl: './parent.component.html',
	styleUrls: ['./parent.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [StoriesBarComponent, StoryEditorComponent, ReportHistoryComponent, FileManagerComponent, ReportComponent]
})
export class ParentComponent implements OnInit {
	apiService = inject(ApiService);
	route = inject(ActivatedRoute);
	themeService = inject(ThemingService);
	storyService = inject(StoryService);
	groupService = inject(GroupService);
	projectService = inject(ProjectService);


	/**
   * Stories in the selected project
   */
	readonly stories = signal<Story[] | undefined>(undefined);

	repositories!: RepositoryContainer[];

	readonly selectedRepository = signal<RepositoryContainer | undefined>(undefined);

	/**
   * Currently selected story
   */
	readonly selectedStory = signal<Story | undefined>(undefined);

	/**
   * Currently selected Scenario
   */
	readonly selectedScenario = signal<Scenario | undefined>(undefined);

	/**
   * If the story Editor is shown or the report history
   */
	isStoryEditorActive = true;

	/**
   * If currently group test is running
   */
	testRunningForGroup = false;

	groups!: Group[];

	report?: { reportId: string; htmlFile: string };

	readonly isDark = computed(() => this.themeService.isDark());

	/** Writable derived signal — resets to service value when source changes, keeps local overrides otherwise */
	readonly activeView = linkedSignal({
		source: this.storyService.activeView,
		computation: (viewName, previous) => viewName || previous?.value || 'storyView'
	});

	isReviewing: boolean = false;

	/**
     * Subscribtions for all EventEmitter
     */
	/** Loads stories when backend URL becomes available */
	private backendUrlEffect = effect(() => {
		const trigger = this.apiService.backendUrlReadyTrigger();
		if (trigger === 0) return;
		untracked(() => this.loadStories());
	});

	/**
   * Requests the repositories on init
   */
	ngOnInit() {

		// Backend info already initialized by APP_INITIALIZER — loadStories if url is ready
		if (this.apiService.urlReceived)
			this.loadStories();

	}

	/**
   * Leads the stories of the current selected repository
   */
	loadStories() {
		// Bail early if no repository is selected — prevents endless "Loading Stories ..." spinner
		// when navigating to the root route without a selected repo (e.g., pressing back after login).
		const repoId = localStorage.getItem('id');
		if (!repoId) return;

		// 1. Fetch the complete list of repositories
		this.projectService.getRepositories().subscribe((allRepos: RepositoryContainer[]) => {
			this.repositories = allRepos;

			// 2. Find the full, currently selected repository object from the list
			const selectedRepo = this.repositories.find(repo => repo._id === repoId)!;
			this.selectedRepository.set(selectedRepo);

			// 3. If the full repository object is found, load its stories
			if (selectedRepo)
				this.storyService
					.getStories(selectedRepo)
					.subscribe((resp: Story[]) => {
						this.stories.set(resp);
						this.routing(); // Handle routing after stories are loaded
					});
      
		});

		// Also load the groups for the current repository
		this.groupService
			.getGroups(repoId)
			.subscribe((resp: Group[]) => {
				this.groups = resp;
			});
	}

	/** Reads current route params and selects the matching story/scenario */
	routing() {
		const params = this.route.snapshot.paramMap;
		console.log('routing() called, stories count:', this.stories()?.length, 'has story_id:', params.has('story_id'));
		if (params.has('story_id')) {
			const story_id = params.get('story_id');
			const story = (this.stories() ?? []).find(o => o._id === story_id);
			console.log('routing() found story:', story?._id, 'route param:', story_id);
			if (!story) {
				console.warn('routing() - Story NOT found for ID:', story_id, 'Available IDs:', (this.stories() ?? []).map(s => s._id).join(', '));
			}
			this.selectedStory.set(story);
			if (story && params.has('scenario_id')) {
				const scenario_id = params.get('scenario_id');
				const scenario = story.scenarios.find(o => o.scenario_id.toString() === scenario_id);
				console.log('routing() found scenario:', scenario?.scenario_id);
				if (scenario)
					this.setSelectedScenario(scenario);
				else
					this.setSelectedScenario(story.scenarios[0]);
			} else if (story) {
				this.setSelectedScenario(story.scenarios[0]);
			}
		}
	}

	/**
   * Sets the currently selected story
   * @param story
   */
	setSelectedStory(story: Story) {
		this.selectedStory.set(story);
	}

	/**
   * Sets the currently selected scenario
   * @param scenario
   */
	setSelectedScenario(scenario: Scenario) {
		this.selectedScenario.set(scenario);
	}

	/**
   * Sets the currently selected scenario
   * @param scenario
   */
	deselectScenario() {
		this.selectedScenario.set(undefined);
	}

	/**
   * Change the editor to report history or story editor
   * @param event event
   */
	setEditor() {
		this.isStoryEditorActive = !this.isStoryEditorActive;
	}

	viewReport($event: { reportId: string; htmlFile: string }) {
		this.report = $event;
	}

	testRunningGroup($event: boolean) {
		this.isStoryEditorActive = true;
		this.testRunningForGroup = $event;
		if (this.testRunningForGroup === true)
			this.report = undefined;

	}

}
