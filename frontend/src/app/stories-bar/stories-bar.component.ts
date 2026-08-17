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
import { ExecutionListComponent } from '../modals/execution-list/execution-list.component';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { MatTabGroup, MatTab, MatTabLabel } from '@angular/material/tabs';
import { MatTooltip } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { MatFormField, MatLabel, MatSelect, MatOption } from '@angular/material/select';
import { TitleCasePipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatAccordion, MatExpansionModule, MatExpansionPanel } from '@angular/material/expansion';

// Payload types mirror the private signal payloads declared in StoryService/GroupService.
// Derived structurally via ReturnType rather than importing (those interfaces aren't exported)
// so effect handlers below can be typed without touching the shared service files.
type CreateStoryPayload = NonNullable<ReturnType<StoryService['createCustomStoryValue']>>;
type CreateGroupPayload = NonNullable<ReturnType<GroupService['createCustomGroupValue']>>;
type UpdateGroupPayload = NonNullable<ReturnType<GroupService['updateGroupValue']>>;
type DeleteGroupPayload = NonNullable<ReturnType<GroupService['deleteGroupValue']>>;

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
     * Normalizes issue_number to sequential integers (1-based) in array order,
     * fixing the bug where all DB stories show "1" due to duplicate issue_number values.
     */
	readonly stories = linkedSignal<Story[]>(() => {
		const raw = this.storyService.stories();
		return raw.filter(s => s != null).map((s, idx) => ({
			...s,
			issue_number: idx + 1
		}));
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
     * Stories filtered for searchterm — derived from service, writable for local search filtering.
     * Normalizes issue_number the same way as the stories signal above.
     */
	readonly filteredStories = linkedSignal<Story[]>(() => {
		const raw = this.storyService.stories();
		return raw.filter(s => s != null).map((s, idx) => ({
			...s,
			issue_number: idx + 1
		}));
	});

	/**
     * Groups filtered for searchterm
     */
	readonly filteredGroups = signal<Group[]>([]);

	/**
     * List to track the expansion state of groups (for backwards compatibility tracking)
     * Previously used: "uk-open" for open, "" for close
     * Now unused but kept for compatibility
     */
	readonly liGroupList = signal<string[]>([]);

	/** Tracks which stories are expanded in the accordion */
	readonly storyExpansion = signal<Map<Story, boolean>>(new Map());

	/**
     * Computes sequential numbering for stories. Falls back to position-based when issue_number is missing, null, or zero.
     * @returns Stories array with a computed numbering property for display
     */
	storyNumbering() {
		const stories = this.getSortedStories();
		const numbering = new Map<Story, number>();
		stories.forEach((s, index) => {
			const num = s.issue_number;
			const numVal = typeof num === 'string' ? parseInt(num, 10) : num;
			if (typeof numVal === 'number' && numVal > 0)
				numbering.set(s, numVal);
			else
				// Issue: issue_number is null/missing/0/invalid — assign position-based number for display
				numbering.set(s, index + 1);
		});
		return { stories, numbering };
	}

	/**
     * Returns the display issue number for a story (uses stored issue_number or falls back to position).
     * @param story The story to get the number for
     * @returns The issue number to display
     */
	getIssueNumber(story: Story): number | undefined {
		const num = story.issue_number;
		const numVal = typeof num === 'string' ? parseInt(num, 10) : num;
		if (typeof numVal === 'number' && numVal > 0)
			return numVal;
		const stories = this.getSortedStories();
		return stories.indexOf(story) + 1;
	}

	/**
     * Toggles story expansion in accordion
     * @param story The story to expand/collapse
     */
	toggleStoryExpansion(story: Story) {
		const prev = new Map(this.storyExpansion());
		if (prev.has(story))
			prev.delete(story);
		else
			prev.set(story, true);
		this.storyExpansion.set(prev);
		this.selectStory(story);
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
	private createStoryEffect = effect(() => {
		const custom = this.storyService.createCustomStoryValue();
		if (!custom) return;
		untracked(() => this.handleCreateStory(custom));
	});

	/** Creates a story via API, reloads story list, and selects the new story */
	private async handleCreateStory(custom: CreateStoryPayload) {
		// Reset the signal immediately to prevent re-firing on component re-initialization
		this.storyService.createCustomStoryValue.set(null);
		try {
			await firstValueFrom(this.storyService.createStory(custom.story.title, custom.story.description, custom.repositoryContainer.repoName, custom.repositoryContainer._id!));
			const resp = await firstValueFrom(this.storyService.getStories(custom.repositoryContainer));
			const filtered = (resp as Story[]).filter(s => s != null);
			this.stories.set(filtered);
			this.filteredStories.set(filtered);
			this.storyTermChange();
			this.selectStory((resp as Story[])[(resp as Story[]).length - 1]);
		} catch (error) {
			this.notify.error('Failed to create story. Please try again.');
		}
	}

	/** Effect: watch for custom group creation requests */
	private createGroupEffect = effect(() => {
		const custom = this.groupService.createCustomGroupValue();
		if (!custom) return;
		untracked(() => this.handleCreateGroup(custom));
	});

	/** Creates a group via API, reloads group list, and opens the new group */
	private async handleCreateGroup(custom: CreateGroupPayload) {
		// Reset the signal immediately to prevent re-firing on component re-initialization
		this.groupService.createCustomGroupValue.set(null);
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
	private updateGroupEffect = effect(() => {
		const custom = this.groupService.updateGroupValue();
		if (!custom) return;
		untracked(() => this.handleUpdateGroup(custom));
	});

	/** Updates a group via API and reloads the group list */
	private async handleUpdateGroup(custom: UpdateGroupPayload) {
		// Reset the signal immediately to prevent re-firing on component re-initialization
		this.groupService.updateGroupValue.set(null);
		await firstValueFrom(this.groupService.updateGroup(custom.repositoryContainer._id!, custom.group._id!, custom.group));
		const resp = await firstValueFrom(this.groupService.getGroups(custom.repositoryContainer._id!));
		this.groups.set(resp as Group[]);
	}

	/** Effect: watch for group deletion requests */
	private deleteGroupEffect = effect(() => {
		const custom = this.groupService.deleteGroupValue();
		if (!custom) return;
		untracked(() => this.handleDeleteGroup(custom));
	});

	/** Deletes a group via API and reloads the group list */
	private async handleDeleteGroup(custom: DeleteGroupPayload) {
		// Reset the signal immediately to prevent re-firing on component re-initialization
		this.groupService.deleteGroupValue.set(null);
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

	/** Effect: watch for scenario status changes (e.g. after test runs) */
	private scenarioStatusChangeEffect = effect(() => {
		const custom = this.scenarioService.scenarioStatusChange();
		if (!custom) return;
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
		// In-place mutation — Angular signals track reference changes, template re-renders handle display
		stories[storyIndex].scenarios[scenarioIndex].lastTestPassed = custom.lastTestPassed;
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
		this.groupService.getGroups(repoId).subscribe(groups => {
			this.groups.set(groups);
			this.liGroupList.set(new Array(groups.length).fill(''));
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
     * Displays filterd stories if searchterm was given
     * @returns
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
		// Build a Set of all valid, existing story IDs — handle ObjectId at runtime
		const validIds = new Set<string>();
		if (stories)
			for (const story of stories) {
				if (story && story._id) {
					const storyId = typeof story._id === 'object' && story._id !== null
						? (story._id as { toHexString: () => string }).toHexString()
						: String(story._id);
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
				const strId = String(id);
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
													next: () => {
														console.log('XRay update successful for TestRunStepId:', testRun.testRunStepId, ' and Test Execution:', testRun.testExecKey);
													},
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
     */
	selectScenario(scenario: Scenario) {
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
				const selectedElementRef = this.storyElements().find(element => element.nativeElement.id === `story${story.issue_number}`);
				if (selectedElementRef) {
					console.log('Found selected element', selectedElementRef.nativeElement);
					selectedElementRef.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
				}
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
			.subscribe((resp: Scenario) => {
				this.selectScenario(resp);
				story!.scenarios.push(resp);
				this.notify.info('Successfully added', 'Scenario');
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

	dropStory(event: CdkDragDrop<Story[]>) {
		const repo_id = localStorage.getItem('id');
		if (!repo_id) return;
		const arr = [...this.getSortedStories()];
		moveItemInArray(arr, event.previousIndex, event.currentIndex);
		this.stories.set(arr);
		this.storyService.updateStoryList(repo_id, arr.map((s: Story) => s._id)).subscribe(_ => { });
	}

	dropScenario(event: CdkDragDrop<string[]>, s: Story) {
		const stories = this.stories();
		const index = stories.findIndex(o => o._id === s._id);
		moveItemInArray(stories[index].scenarios, event.previousIndex, event.currentIndex);
		this.scenarioService.updateScenarioList(stories[index]._id!, stories[index].scenarios).subscribe(_ => { });
	}

	dropGroup(event: CdkDragDrop<string[]>) {
		const repo_id = localStorage.getItem('id')!;
		const arr = [...this.groups()];
		moveItemInArray(arr, event.previousIndex, event.currentIndex);
		this.groups.set(arr);
		// Deep copy to avoid mutating the original; member_stories already contains string IDs
		const pass_arr = JSON.parse(JSON.stringify(arr));
		this.groupService.updateGroupsArray(repo_id, pass_arr).subscribe(_ => { });
	}

	dropGroupStory(event: CdkDragDrop<string[]>, group: Group) {
		const repo_id = localStorage.getItem('id')!;
		const groups = this.groups();
		const index = groups.findIndex(o => o._id === group._id);
		// Reorder story IDs within the group
		moveItemInArray(groups[index].member_stories, event.previousIndex, event.currentIndex);
		this.groupService.updateGroup(repo_id, group._id!, groups[index]).subscribe(_ => { });
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
					.subscribe(_ => {
						this.storyDeleted();
						this.groupService.getGroups(localStorage.getItem('id')!).subscribe(groups => {
							this.groups.set(groups);
						});
						this.notify.error('', 'Story deleted');
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
