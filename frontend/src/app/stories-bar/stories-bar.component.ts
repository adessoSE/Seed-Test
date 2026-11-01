import { Component, OnChanges, ElementRef, SimpleChanges, ChangeDetectionStrategy, inject, output, input, viewChild, viewChildren, signal, effect, untracked, linkedSignal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Story } from '@seed-test/shared/models/Story';
import { XrayService } from '../Services/xray.service';
import { Scenario } from '@seed-test/shared/models/Scenario';
import { Group } from '@seed-test/shared/models/Group';
import { GroupReport } from '@seed-test/shared/models/GroupReport';
import { StoryStatus } from '@seed-test/shared/models/StoryStatus';
import { ScenarioStatus } from '@seed-test/shared/models/ScenarioStatus';
import { CdkDragDrop, moveItemInArray, CdkDropList, CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { NotificationService } from '../Services/notification.service';
import { ThemingService } from '../Services/theming.service';
import { CreateNewGroupComponent } from '../modals/create-new-group/create-new-group.component';
import { CreateNewStoryComponent } from '../modals/create-new-story/create-new-story.component';
import { UpdateGroupComponent } from '../modals/update-group/update-group.component';
import { CreateScenarioComponent } from '../modals/create-scenario/create-scenario.component';
import { RepositoryContainer } from '@seed-test/shared/models/RepositoryContainer';
import { StoryService } from '../Services/story.service';
import { GroupService } from '../Services/group.service';
import { ScenarioService } from '../Services/scenario.service';
import { ReportService } from '../Services/report.service';
import { BackgroundService } from '../Services/background.service';
import { onActionTrigger } from '../Services/action-trigger';
import { ExecutionListComponent } from '../modals/execution-list/execution-list.component';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { MatTabGroup, MatTab, MatTabLabel } from '@angular/material/tabs';
import { MatTooltip } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { MatFormField, MatLabel, MatSelect, MatOption } from '@angular/material/select';
import { TitleCasePipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatAccordion, MatExpansionModule, MatExpansionPanel } from '@angular/material/expansion';

// Payload types are derived from the service action methods that emit them, so the handlers
// below stay typed without the payload interfaces (which are not exported) being exported.
type CreateStoryPayload = Parameters<StoryService['createCustomStoryEvent']>[0];
type CreateGroupPayload = Parameters<GroupService['createGroupEvent']>[0];
type UpdateGroupPayload = Parameters<GroupService['updateGroupEvent']>[0];
type DeleteGroupPayload = Parameters<GroupService['deleteGroupEvent']>[0];

/** Response shape of the group execution endpoint (POST /execute/Group/:repoId/:groupId) */
interface RunGroupResponse {
	htmlFile: string;
	reportId: string;
	report: GroupReport;
}

/**
 * Component of the Stories bar
 */
@Component({
	selector: 'app-stories-bar',
	templateUrl: './stories-bar.component.html',
	styleUrls: ['./stories-bar.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [CdkScrollable, MatTabGroup, MatTab, MatTabLabel, MatTooltip, FormsModule, MatFormField, MatLabel, MatSelect, MatOption, CdkDropList, CdkDrag, MatIcon, CdkDragHandle, MatAccordion, MatExpansionModule, MatExpansionPanel, CreateNewGroupComponent, CreateNewStoryComponent, UpdateGroupComponent, CreateScenarioComponent, ExecutionListComponent, TitleCasePipe]
})
export class StoriesBarComponent implements OnChanges {
	notify = inject(NotificationService);
	themeService = inject(ThemingService);
	storyService = inject(StoryService);
	xrayService = inject(XrayService);
	groupService = inject(GroupService);
	scenarioService = inject(ScenarioService);
	reportService = inject(ReportService);
	backgroundService = inject(BackgroundService);


	/**
     * Stories in the project — derived from service, writable for local mutations.
     * Preserves the raw issue_number from the service so source-aware display
     * (getIssueNumber/storyNumbering) can distinguish custom from linked stories.
     */
	readonly stories = linkedSignal<Story[]>(() => {
		const raw = this.storyService.stories();
		return raw.filter(s => s != null);
	});

	/**
     * Currently selected story — signal for zoneless OnPush reactivity
     */
	readonly selectedStory = signal<Story | undefined>(undefined);

	/**
     * Currently selected scenario
     */
	selectedScenario!: Scenario;

	/**
     * If it is a custom story — check localStorage source first, then verify we have stories loaded.
     * localStorage check takes priority so "Create New Story" button is visible even in empty projects.
     */
	readonly isCustomStory = linkedSignal(() => {
		const stories = this.storyService.stories();
		const source = localStorage.getItem('source');
		// Priority 1: if source is set and isn't 'db', it's never custom regardless of stories
		if (source && source !== 'db') return false;
		// Priority 2: if source is 'db' (or unset), treat as custom if stories are empty or all are db-sourced
		if (source === 'db') return true;
		// Fallback: no source in localStorage — infer from stories array
		return stories.length === 0 || stories.every(s => s.storySource === 'db' || s.repo_type === 'db');
	});

	/**
     * Emits a new chosen story
     */
	readonly storyChosen = output<Story>();

	/**
      * Emits a new chosen scenario
      */
	readonly scenarioChosen = output<Scenario>();

	/**
      * Emits when a scenario was chosen and its story needs to be expanded
      */
	readonly storyExpansionRequested = output<Story>();

	/**
     * Emits a new chosen scenario
     */
	readonly scenarioDeselected = output<void>();

	readonly testRunningGroup = output<boolean>();

	/**
     * groups in the project
     */
	readonly groups = signal<Group[]>([]);

	/**
     * Currently selected Group
     */
	selectedGroup!: Group;

	readonly isDark = input.required<boolean>();

	readonly newSelectedStory = input.required<Story>();

	/** Currently selected scenario from parent — used for sidebar highlighting */
	readonly parentSelectedScenario = input<Scenario | undefined>(undefined);

	readonly isReviewing = input<boolean>(false);

	/**
     * SearchTerm for story title search
     */
	storyString!: string;

	/**
     * SearchTerm for group title search
     */
	groupString!: string;
	/**
     * Stories filtered for searchterm — derived from service for search filtering.
     * Preserves the raw issue_number (no mapping) so source-aware methods
     * can distinguish custom from linked stories after filtering.
     */
	readonly filteredStories = linkedSignal<Story[]>(() => {
		const raw = this.storyService.stories();
		return raw.filter(s => s != null);
	});

	/**
     * Groups filtered for searchterm
     */
	readonly filteredGroups = signal<Group[]>([]);

	/**
     * Unused; kept so existing references still compile. Delete it together with those references.
     */
	readonly liGroupList = signal<string[]>([]);

	/** Tracks which stories are expanded in the accordion */
	readonly storyExpansion = signal<Map<Story, boolean>>(new Map());

	/**
     * Resolves the display issue number for a single story, source-aware.
     * Linked (jira/github) stories always show their real external number/key (or
     * undefined when none is valid — never a position fake). Custom (db) or legacy
     * stories show the persisted issue_number, else the given position fallback.
     * @param story The story to resolve the number for
     * @param positionFallback 1-based position used when a custom story has no valid persisted number
     * @returns The display issue number, or undefined for a linked story with no valid external key
     */
	private resolveIssueNumber(story: Story, positionFallback: number | undefined): number | undefined {
		const source = story.storySource;
		// CASE: Linked (jira/github) — show the real external number, never a position fake
		if (source === 'jira' || source === 'github') {
			const num = story.issue_number;
			if (typeof num === 'number' && num > 0)
				return num;
			// CASE: Jira-style key (e.g. 'JRA-42') — extract trailing digits
			if (typeof num === 'string') {
				const match = num.match(/\d+/);
				if (match) {
					const extracted = parseInt(match[0], 10);
					if (extracted > 0)
						return extracted;
				}
			}
			return undefined;
		}
		// CASE: Custom (db) or legacy — persisted value if set, else position fallback
		const storedNum = story.issue_number;
		const storedVal = typeof storedNum === 'string' ? parseInt(storedNum, 10) : storedNum;
		if (typeof storedVal === 'number' && storedVal > 0)
			return storedVal;
		return positionFallback;
	}

	/**
     * Computes source-aware numbering for stories.
     * Custom stories (storySource==='db' or missing) show position-based index.
     * Linked stories (storySource==='jira'|'github') show their real external number.
     * For Jira-style keys (e.g. 'JRA-7') extracts the trailing number.
     * @returns Stories array with a computed numbering Map for display
     */
	storyNumbering() {
		const stories = this.getSortedStories();
		const numbering = new Map<Story, number>();
		stories.forEach((s, index) => {
			// Align with getIssueNumber: skip linked stories that yield no valid external number
			const resolved = this.resolveIssueNumber(s, index + 1);
			if (resolved !== undefined)
				numbering.set(s, resolved);
		});
		return { stories, numbering };
	}

	/**
     * Returns the display issue number for a story, source-aware.
     * Custom stories (storySource==='db' or missing) show a position-based index.
     * Linked stories (storySource==='jira'|'github') show their real external key/number.
     * For Jira-style keys (e.g. 'JRA-42') extracts the trailing number.
     * @param story The story to get the number for
     * @returns The issue number to display
     */
	getIssueNumber(story: Story): number | undefined {
		const stories = this.getSortedStories();
		const index = stories.indexOf(story);
		// A custom story not present in the sorted list has no position fallback — resolve as undefined
		const positionFallback = index === -1 ? undefined : index + 1;
		return this.resolveIssueNumber(story, positionFallback);
	}

	/**
      * Toggles story expansion in accordion — only toggles expansion state, NOT selection.
      * Selection is handled separately by clicking the panel-title.
      * @param story The story to expand/collapse
      */
	toggleStoryExpansion(story: Story) {
		const prev = new Map(this.storyExpansion());
		if (prev.has(story))
			prev.delete(story);
		else
			prev.set(story, true);
		this.storyExpansion.set(prev);
		// NOTE: selectStory() is NOT called here — only the panel-title click selects
	}

	/**
     * Marks the current group as open in the liGroupList
     * @param group The group that was opened
     */
	onGroupOpened(group: Group) {
		const groups = this.groups();
		const index = groups.findIndex(g => g._id === group._id);
		if (index === -1) return;
		const liList = [...this.liGroupList()];
		liList[index] = '';
		this.liGroupList.set(liList);
	}

	/**
     * Updates liGroupList when a panel closes (no-op for new accordion)
     * @param group The group that was closed
     */
	onGroupClosed(group: Group) {
		const groups = this.groups();
		const index = groups.findIndex(g => g._id === group._id);
		if (index === -1) return;
		const liList = [...this.liGroupList()];
		liList[index] = '';
		this.liGroupList.set(liList);
	}

	isFilterActive = false;
	showFilter = false;
	assigneeModel?: string;
	testPassedModel?: string;
	groupModel?: string;

	/**
     * Emits a new chosen Group
     */
	readonly GroupChosen = output<Group>();

	readonly report = output<RunGroupResponse>();


	/**
     * View Child Modals
     */
	readonly createNewGroup = viewChild.required<CreateNewGroupComponent>('createNewGroup');
	readonly createNewStory = viewChild.required<CreateNewStoryComponent>('createNewStory');
	readonly updateGroup = viewChild.required<UpdateGroupComponent>('updateGroup');
	readonly createNewScenario = viewChild.required<CreateScenarioComponent>('createNewScenario');
	readonly executionListModal = viewChild.required<ExecutionListComponent>('executionListModal');
	readonly storyElements = viewChildren<ElementRef>('storyElement');

	// --- Effects: replace EventEmitter subscribes with signal watches ---

	/** Effect: watch for custom story creation requests */
	private createStoryEffect = onActionTrigger(this.storyService.createCustomStoryTrigger, custom => {
		this.handleCreateStory(custom);
	});

	/** Creates a story via API, reloads story list, and selects the new story */
	private async handleCreateStory(custom: CreateStoryPayload) {
		try {
			await firstValueFrom(this.storyService.createStory(custom.story.title, custom.story.description, custom.repositoryContainer.repoName, custom.repositoryContainer._id!));
			const resp = await firstValueFrom(this.storyService.getStories(custom.repositoryContainer));
			const filtered = (resp as Story[]).filter(s => s != null);
			this.stories.set(filtered);
			this.filteredStories.set(filtered);
			this.storyTermChange();
			this.selectStory((resp as Story[])[(resp as Story[]).length - 1]);
		} catch {
			this.notify.error('Failed to create story. Please try again.');
		}
	}

	/** Effect: watch for custom group creation requests */
	private createGroupEffect = onActionTrigger(this.groupService.createCustomGroupTrigger, custom => {
		this.handleCreateGroup(custom);
	});

	/** Creates a group via API, reloads group list, and opens the new group */
	private async handleCreateGroup(custom: CreateGroupPayload) {
		await firstValueFrom(this.groupService.createGroup(custom.group.title, custom.repositoryContainer._id!, custom.group.member_stories, custom.group.isSequential));
		const resp = await firstValueFrom(this.groupService.getGroups(custom.repositoryContainer._id!));
		this.groups.set(resp as Group[]);
		this.filteredGroups.set(resp as Group[]);
		this.groupTermChange();
		const allGroups = this.getSortedGroups()!;
		const newLiGroupList = new Array(allGroups.length).fill('');
		const index = allGroups.findIndex((group: Group) => group.name === custom.group.title);
		if (index !== -1)
			newLiGroupList[index] = '';
		this.liGroupList.set(newLiGroupList);
		this.selectFirstStoryOfGroup(allGroups[index]);
	}

	/** Effect: watch for group update requests */
	private updateGroupEffect = onActionTrigger(this.groupService.updateGroupTrigger, custom => {
		this.handleUpdateGroup(custom);
	});

	/** Updates a group via API and reloads the group list */
	private async handleUpdateGroup(custom: UpdateGroupPayload) {
		await firstValueFrom(this.groupService.updateGroup(custom.repositoryContainer._id!, custom.group._id!, custom.group));
		const resp = await firstValueFrom(this.groupService.getGroups(custom.repositoryContainer._id!));
		this.groups.set(resp as Group[]);
	}

	/** Effect: watch for group deletion requests */
	private deleteGroupEffect = onActionTrigger(this.groupService.deleteGroupTrigger, custom => {
		this.handleDeleteGroup(custom);
	});

	/** Deletes a group via API and reloads the group list */
	private async handleDeleteGroup(custom: DeleteGroupPayload) {
		await firstValueFrom(this.groupService.deleteGroup(custom.repo_id, custom.group_id));
		const resp = await firstValueFrom(this.groupService.getGroups(custom.repo_id));
		this.groups.set(resp as Group[]);
	}

	/** Effect: watch for story deletion trigger */
	private deleteStoryEffect = effect(() => {
		const trigger = this.storyService.deleteStoryTrigger();
		if (!trigger) return;
		untracked(() => this.deleteStory());
	});

	/** Action channel: story status from story and group runs, which the "Status Of Story" filter reads */
	// Same in-place write and new array refs as scenarioStatusChangeEffect: the story object keeps its identity
	// (storyExpansion and selectedStory compare by reference), while the new array refs re-run the filter.
	private storyStatusChangeEffect = onActionTrigger(this.scenarioService.storyStatusChangeTrigger, custom => {
		const stories = this.stories();
		const story = stories.find(item => {
			const storyIdStr = typeof item._id === 'object' && item._id !== null
				? (item._id as { toHexString: () => string }).toHexString()
				: String(item._id ?? '');
			return storyIdStr === custom.storyId;
		});
		if (!story) return;
		story.lastTestPassed = custom.lastTestPassed;
		this.stories.set([...stories]);
		this.filteredStories.set([...this.filteredStories()]);
	});

	/** Effect: watch for scenario status changes (e.g. after test runs) */
	// Action channel: every status change of a run is applied, even when a run emits several in one tick.
	// The backend persists the status after the run response is sent (testExecution and sanity controllers), so a list
	// reloaded before that write completes can still show the old status until the next reload.
	private scenarioStatusChangeEffect = onActionTrigger(this.scenarioService.scenarioStatusChangeTrigger, custom => {
		const stories = this.stories();
		// custom.storyId is a string, but story._id is a MongoDB ObjectId at runtime — convert before comparing
		const storyIndex = stories.findIndex(story => {
			const storyIdStr = typeof story._id === 'object' && story._id !== null
				? (story._id as { toHexString: () => string }).toHexString()
				: String(story._id ?? '');
			return storyIdStr === custom.storyId;
		});
		if (storyIndex === -1) return;
		const scenarioIndex = stories[storyIndex].scenarios.findIndex(scenario => scenario.scenario_id === custom.scenarioId);
		if (scenarioIndex === -1) return;
		// The story object keeps its identity: storyExpansion and selectedStory compare stories by reference,
		// so replacing it would collapse the accordion and drop the selection highlight.
		// The scenario is written in place, but that write alone does not re-render in zoneless OnPush, because
		// signals do not track nested property writes. Only a new array reference notifies the template, so both
		// list signals get one. Both lists are updated because the rendered list is filteredStories while a search
		// or filter is active.
		stories[storyIndex].scenarios[scenarioIndex].lastTestPassed = custom.lastTestPassed;
		this.stories.set([...stories]);
		this.filteredStories.set([...this.filteredStories()]);
	});

	/**
     * Constructor
     * @param notify
     * @param themeService
     * @param storyService
     * @param groupService
     * @param scenarioService
     * @param reportService
     */
	constructor() {
		const repoId = localStorage.getItem('id');
		if (!repoId) return;
		this.groupService.getGroups(repoId).subscribe({
			next: (groups) => {
				this.groups.set(groups);
				this.liGroupList.set(new Array(groups.length).fill(''));
			},
			error: () => this.notify.error('Could not load groups.')
		});

	}

	ngOnChanges(changes: SimpleChanges): void {
		if (changes.newSelectedStory) {
			this.selectedStory.set(this.newSelectedStory());
			this.scrollToSelectedStory();
			if (this.selectedStory())
				this.selectStory(this.selectedStory()!);

		}
	}


	/**
     * Sorts the stories after issue_number
     * Displays filtered stories if searchterm or filter was given
     * @returns Filtered or unfiltered stories array based on active filters
     */
	getSortedStories() {
		if (this.storyString || this.isFilterActive)
			return this.filteredStories();

		return this.stories();
	}

	getSortedGroups() {
		if (this.groupString)
			return this.filteredGroups();

		if (this.groups() && this.stories())
			return this.mergeById(this.groups(), this.stories());

	}

	/**
     * Returns a copy of groups with non-existent story IDs removed from member_stories.
     * Does NOT mutate the original groups — returns a new array with filtered member_stories.
     * @param groups Groups to validate
     * @param stories Currently loaded stories to validate against
     * @returns New groups array with invalid story IDs removed
     */
	mergeById(groups: Group[], stories: Story[]): Group[] {
		// Build a Set of all valid, existing story IDs — normalize all IDs to hex strings
		const validIds = new Set<string>();
		if (stories)
			for (const story of stories) {
				if (story && story._id) {
					let storyId: string;
					if (typeof story._id === 'object' && story._id !== null) 
						// MongoDB ObjectId object — extract hex string
						storyId = 'toHexString' in story._id
							? (story._id as { toHexString: () => string }).toHexString()
							: String(story._id);
					else 
						// Already a string — ensure it's a plain hex string, not "ObjectId(...)" wrapper
						storyId = story._id.startsWith('ObjectId(') ? story._id.slice(12, -2) : String(story._id);
					
					validIds.add(storyId);
				}
			}
		else {
			console.warn('mergeById called with no stories.');
			return groups;
		}

		if (!groups)  return [];

		// Return new group objects with filtered member_stories — avoid mutating originals
		return groups.map(group => {
			if (!group.member_stories) return { ...group };
			const filtered = group.member_stories.filter(id => {
				if (!id) return false;
				// Normalize group member_stories ID the same way — handle ObjectId wrapper
				let strId = String(id);
				if (strId.startsWith('ObjectId('))
					strId = strId.slice(12, -2);
				if (!validIds.has(strId)) {
					console.warn(`Story ID ${strId} in group '${group.name}' not found. Skipping.`);
					return false;
				}
				return true;
			});
			return { ...group, member_stories: filtered };
		});
	}

	/**
     * Resolves a story ID to the full Story object from the loaded stories list.
     * Used by the template to display story details (title, issue_number) for group member_stories.
     * @param id The story ID to look up
     * @returns The Story object, or undefined if not found
     */
	getStoryById(id: string): Story | undefined {
		return this.stories().find(s => {
			const storyId = typeof s._id === 'object' && s._id !== null
				? (s._id as { toHexString: () => string }).toHexString()
				: String(s._id ?? '');
			return storyId === id;
		});
	}

	/**
 * Evaluates whether to open xray execution list modal in run group.
 * @param group
 */
	evaluateAndRunGroup(group: Group) {
		if (group.xrayTestSet) {
			this.selectedGroup = group;
			this.executionListModal().openExecutionListModal(group);
		} else
		// Run group directly if group is no xray test set
			this.runGroup(group);

	}

	/**
     * Run this function if we close execution list modal
     */
	executeTests(event: { scenarioId: number | null, selectedExecutions: number[] }) {
		this.runGroup(this.selectedGroup, event.selectedExecutions);
	}

	runGroup(group: Group, selectedExecutions?: number[]) {
		const id = localStorage.getItem('id')!;
		this.testRunningGroup.emit(true);
		const params = { repository: localStorage.getItem('repository')!, source: localStorage.getItem('source')! };
		this.groupService.runGroup(id, group._id!, params).subscribe({
			// groupService.runGroup() returns Observable<Object> (untyped http.post) — cast to the known response shape
			next: (ret) => {
				const typedRet = ret as unknown as RunGroupResponse;
				this.report.emit(typedRet);
				this.testRunningGroup.emit(false);
				const report = typedRet.report;
				report.storyStatuses.forEach((story: StoryStatus) => {
					// Story status comes from the run response; the stories bar filter reads it from the story list
					this.scenarioService.storyStatusChangeEmit(story.storyId, story.status);
					story.scenarioStatuses.forEach((scenario: ScenarioStatus) => {
						// ScenarioStatus.scenarioId is modeled as a string, but downstream APIs expect a number
						const scenarioIdNum = Number(scenario.scenarioId);
						this.scenarioService.scenarioStatusChangeEmit(
							story.storyId, scenarioIdNum, scenario.status);

						this.scenarioService.getScenario(story.storyId, scenarioIdNum).subscribe({
							next: (fullScenario) => {
								if (fullScenario && fullScenario.testRunSteps)
									for (const testRun of fullScenario.testRunSteps)
										if (selectedExecutions && selectedExecutions.includes(testRun.testRunId))
											this.xrayService.sendXrayStatus(testRun.testRunId, testRun.testRunStepId, String(scenario.status))
												.subscribe({
													error: (error) => {
														console.error('Error while updating XRay status for TestRunStepId:', testRun.testRunStepId, error);
													}
												});


							},
							error: (error) => {
								console.error('Error fetching scenario details', error);
							}
						});
					});
				});
			},
			error: (error) => {
				console.error('Error running group', error);
			}
		});
	}

	/**
     * Select the first Story of a Group
     * @param group
     */
	selectFirstStoryOfGroup(group: Group) {
		if (!group?.member_stories?.length) return;
		const story = this.stories().find(s => {
			const storyId = typeof s._id === 'object' && s._id !== null
				? (s._id as { toHexString: () => string }).toHexString()
				: String(s._id ?? '');
			return storyId === group.member_stories![0];
		});
		if (story)
			this.selectStory(story);

	}

	/**
      * Selects a new scenario
      * @param scenario
      * @param owner story the scenario was clicked in; scenario_id is only unique per story, so the id lookup below is a fallback
      */
	selectScenario(scenario: Scenario, owner?: Story) {
		// Find which story this scenario belongs to. Matching by scenario_id alone picks the first story that reuses the id and flips the accordion between two stories
		const targetStory = owner ?? this.stories().find(s => 
			s.scenarios.some(sc => sc.scenario_id === scenario.scenario_id)
		);
		if (targetStory) {
			const currentStory = this.selectedStory();
			// If selecting a scenario from a different story, expand that story's panel
			if (targetStory !== currentStory) {
				const prev = new Map(this.storyExpansion());
				prev.set(targetStory, true);
				this.storyExpansion.set(prev);
				// Select the story first (this also calls selectStory internally)
				this.selectedStory.set(targetStory);
				this.storyChosen.emit(targetStory);
			}
		}
		// Always emit scenario choice — parent handles selection
		this.scenarioChosen.emit(scenario);
	}

	/**
     * Deselects Scenario - Destroys Scenario Editor
     * @param scenario
     */
	deselectScenario(){
		this.selectedScenario = undefined as unknown as Scenario;
		this.scenarioDeselected.emit();
	}

	/**
     * Selects a new Story — updates local state immediately and emits to parent.
     * Local selectedStory is set first so template bindings (expansion, highlight)
     * react in the same change detection cycle, preventing stale-UI bugs where
     * the first click appears to do nothing.
     * @param story
     */
	selectStory(story: Story) {
		this.selectedStory.set(story);
		this.storyChosen.emit(story);
	}

	scrollToSelectedStory() {
		const story = this.selectedStory();
		if (this.storyElements() && story)
			setTimeout(() => {
				// Template ids story elements as 'story' + (index + 1) over the currently
				// rendered (sorted/filtered) list — match on array position, not issue_number,
				// since linked stories carry external keys (e.g. 'JRA-42') that never match.
				const index = this.getSortedStories().indexOf(story);
				const targetId = `story${index + 1}`;
				const selectedElementRef = this.storyElements().find(element => element.nativeElement.id === targetId);
				if (selectedElementRef)
					selectedElementRef.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}, 0);

	}

	/**
     * Selects a new Group
     * @param group
     */
	selectGroup(group: Group) {
		this.selectedGroup = group;
	}

	/**
     * Selects the story matching a member_stories ID.
     * Converts story._id (MongoDB ObjectId at runtime) to string for comparison.
     * @param id The story ID (hex string) from group.member_stories
     */
	selectStoryOfGroup(id: string) {
		const story = this.stories().find(s => {
			const storyId = typeof s._id === 'object' && s._id !== null
				? (s._id as { toHexString: () => string }).toHexString()
				: String(s._id ?? '');
			return storyId === id;
		});
		if (story)
			this.selectStory(story);

	}

	/**
     * Opens a create New story Modal
     */
	openCreateNewStoryModal() {
		this.createNewStory().openCreateNewStoryModal(this.stories());
	}

	addScenario(scenarioName: string) {
		const story = this.selectedStory();
		// A scenario can only be added to an already-persisted story, so _id is guaranteed here
		this.scenarioService.addScenario(story!._id!, scenarioName)
			.subscribe({
				next: (resp: Scenario) => {
					this.selectScenario(resp);
					story!.scenarios.push(resp);
					this.notify.info('Successfully added', 'Scenario');
				},
				error: () => this.notify.error('Could not add scenario.')
			});
	}

	/**
     * Opens a create New group Modal
     */
	openCreateNewGroupModal() {
		this.createNewGroup().openCreateNewGroupModal(this.groups());
	}

	/**
     * Opens a update group Modal
     */
	openUpdateGroupModal(group: Group) {
		this.updateGroup().openUpdateGroupModal(group, this.groups());
	}

	openCreateScenario() {
		this.createNewScenario().openCreateScenarioModal(this.selectedStory()!);
	}

	/**
	 * Mirrors the backend renumber for custom stories after a drop (ADR-0001).
	 * Walks the new order and assigns issue_number = 1..N to non-linked (db / legacy)
	 * stories so the in-session display reflects the persisted order immediately,
	 * without a reload. Linked (jira/github) stories keep their external key untouched.
	 * @param arr The reordered stories array (already moved into final position)
	 */
	private renumberCustomLocal(arr: Story[]) {
		// Counter advances only for custom stories, mirroring renumberCustomStories
		let nextNumber = 1;
		for (const s of arr) {
			// CASE: Linked (jira/github) — preserve the external key, never a position number
			if (s.storySource === 'jira' || s.storySource === 'github') continue;
			// CASE: Custom (db) or legacy — renumber to its position among custom stories
			s.issue_number = nextNumber;
			nextNumber++;
		}
	}

	dropStory(event: CdkDragDrop<Story[]>) {
		const repo_id = localStorage.getItem('id');
		if (!repo_id) return;
		const arr = [...this.getSortedStories()];
		moveItemInArray(arr, event.previousIndex, event.currentIndex);
		this.renumberCustomLocal(arr);
		this.stories.set(arr);
		this.storyService.updateStoryList(repo_id, arr.map((s: Story) => s._id)).subscribe({
			error: () => this.notify.error('Could not save story order.')
		});
	}

	dropScenario(event: CdkDragDrop<string[]>, s: Story) {
		const stories = this.stories();
		const index = stories.findIndex(o => o._id === s._id);
		moveItemInArray(stories[index].scenarios, event.previousIndex, event.currentIndex);
		this.scenarioService.updateScenarioList(stories[index]._id!, stories[index].scenarios).subscribe({
			error: () => this.notify.error('Could not save scenario order.')
		});
	}

	dropGroup(event: CdkDragDrop<string[]>) {
		const repo_id = localStorage.getItem('id')!;
		const arr = [...this.groups()];
		moveItemInArray(arr, event.previousIndex, event.currentIndex);
		this.groups.set(arr);
		// Deep copy to avoid mutating the original; member_stories already contains string IDs
		const pass_arr = JSON.parse(JSON.stringify(arr));
		this.groupService.updateGroupsArray(repo_id, pass_arr).subscribe({
			error: () => this.notify.error('Could not save group order.')
		});
	}

	dropGroupStory(event: CdkDragDrop<string[]>, group: Group) {
		const repo_id = localStorage.getItem('id')!;
		const groups = this.groups();
		const index = groups.findIndex(o => o._id === group._id);
		// Reorder story IDs within the group
		moveItemInArray(groups[index].member_stories, event.previousIndex, event.currentIndex);
		this.groupService.updateGroup(repo_id, group._id!, groups[index]).subscribe({
			error: () => this.notify.error('Could not save group.')
		});
	}

	/**
     * Deletes story
     * @param story
     */
	deleteStory() {
		const story = this.selectedStory();
		if (this.stories().find(x => x === story)) {
			const repository = localStorage.getItem('id')!;
			{
				this.storyService
					.deleteStory(repository, story!._id!)
					.subscribe({
						next: _ => {
							this.storyDeleted();
							this.groupService.getGroups(localStorage.getItem('id')!).subscribe({
								next: groups => this.groups.set(groups),
								error: () => this.notify.error('Could not load groups.')
							});
							this.notify.success('', 'Story deleted');
						},
						error: () => this.notify.error('Could not delete story.')
					});
			}
		}
	}

	/**
     * Removes the selected story
     */
	storyDeleted() {
		const story = this.selectedStory();
		const stories = this.stories();
		if (stories.find(x => x === story)) {
			const updated = stories.filter(x => x !== story);
			this.stories.set(updated);
		}
	}

	/**
     * Filters stories for searchterm
     */
	storyTermChange(storiesToFilter = this.stories()) {
		if (this.storyString)
			this.filteredStories.set(storiesToFilter.filter(story => story.title.toLowerCase().includes(this.storyString.toLowerCase())));
		else
			this.filteredStories.set(storiesToFilter);

	}

	/**
   * Filters group for searchterm
   */
	groupTermChange() {
		if (this.groupString)
			this.filteredGroups.set(this.groups().filter(group => group.name.toLowerCase().includes(this.groupString.toLowerCase())));
		else
			this.filteredGroups.set(this.groups());

	}

	/**
     * Delete Search Term
     * @param varToErase either group or story
     */
	eraseSearchTerm(varToErase: string) {
		if (varToErase === 'story')
			this.storyString = null as unknown as string;
		else if (varToErase === 'group')
			this.groupString = null as unknown as string;

	}

	filter() {
		this.isFilterActive = true;
		const stories = this.stories();
		let filter;

		// filter for last test passed
		switch (this.testPassedModel) {
			case 'Passed':
				filter = stories.filter(story => story.lastTestPassed === true);
				break;
			case 'Failed':
				filter = stories.filter(story => story.lastTestPassed === false);
				break;
			default:
				filter = stories;
				break;
		}
		// CASE: Filter by group membership — member_stories contains string IDs,
		// but story._id is a MongoDB ObjectId at runtime; convert before comparing
		if (this.groupModel !== undefined) {
			const group = this.groups().filter(grp => grp.name == this.groupModel)[0];
			filter = filter.filter(story => {
				const storyId = typeof story._id === 'object' && story._id !== null
					? (story._id as { toHexString: () => string }).toHexString()
					: String(story._id ?? '');
				return group.member_stories.includes(storyId);
			});
		}

		// filter for assignee in testPassed filter result
		if (this.assigneeModel !== undefined)
			filter = filter.filter(story => story.assignee.toLowerCase().includes(this.assigneeModel!.toLowerCase()));


		// check if no filter is active and apply search term
		if (this.assigneeModel === undefined && this.testPassedModel === undefined && this.groupModel === undefined) {
			this.isFilterActive = false;
			if (this.storyString)
				this.storyTermChange();

		} else
			if (this.storyString)
				this.storyTermChange(filter);
			else
				this.filteredStories.set(filter);


	}

	/**
     * Create List for Filter Selection
     * @param filter case for which filter the selection list should be created
     * @returns
     */
	createDistictList(filter: string) {
		const stories = this.stories();
		if (stories.length)
			switch (filter) {
				case 'assignee':
					return stories.map(story => story.assignee).filter((value, index, self) => self.indexOf(value) === index);
				case 'lastTestPassed':
					return ['Passed', 'Failed'];
				case 'group':
					if (this.groups().length)
						return this.groups().map(group => group.name);

					break;
				default:
					return stories;
			}
		else
			return stories;

	}

	/**
     * Show or Hide Filter
     */
	showFilterClick() {
		this.showFilter = !this.showFilter;
	}

	/**
     * Clear Filter
     */
	clearAllFilter() {
		// overwrite filterdStories
		if (this.storyString)
			this.storyTermChange();
		else
			this.filteredStories.set(this.stories());


		this.assigneeModel = '--';
		this.testPassedModel = '--';
		this.groupModel = '--';
		this.isFilterActive = false;
	}

	bouncer() {
		return this.stories().filter((stories) => {
			return stories;
		});
	}

	toTicket(story: string) {
		const repoName = localStorage.getItem('repository') ?? '';
		const _id = localStorage.getItem('id') ?? undefined;
		const source = localStorage.getItem('source') ?? '';
		const repositoryContainer: RepositoryContainer = { repoName, source, _id };
		this.storyService.goToTicket(story, repositoryContainer);
	}
}
