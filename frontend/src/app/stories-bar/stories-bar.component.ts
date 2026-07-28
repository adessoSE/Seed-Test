import { Component, Input, OnChanges, ElementRef, SimpleChanges, ChangeDetectionStrategy, inject, output, input, viewChild, viewChildren, signal, effect } from '@angular/core';
import { Story } from '@shared/models/Story';
import { XrayService } from '../Services/xray.service';
import { Scenario } from '@shared/models/Scenario';
import { Group } from '@shared/models/Group';
import { CdkDragDrop, moveItemInArray, CdkDropList, CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { NotificationService } from '../Services/notification.service';
import { ThemingService } from '../Services/theming.service';
import { CreateNewGroupComponent } from '../modals/create-new-group/create-new-group.component';
import { CreateNewStoryComponent } from '../modals/create-new-story/create-new-story.component';
import { UpdateGroupComponent } from '../modals/update-group/update-group.component';
import { CreateScenarioComponent } from '../modals/create-scenario/create-scenario.component';
import { RepositoryContainer } from '@shared/models/RepositoryContainer';
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

/**
 * Component of the Stories bar
 */
@Component({
	selector: 'app-stories-bar',
	templateUrl: './stories-bar.component.html',
	styleUrls: ['./stories-bar.component.css'],
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [CdkScrollable, MatTabGroup, MatTab, MatTabLabel, MatTooltip, FormsModule, MatFormField, MatLabel, MatSelect, MatOption, CdkDropList, CdkDrag, MatIcon, CdkDragHandle, CreateNewGroupComponent, CreateNewStoryComponent, UpdateGroupComponent, CreateScenarioComponent, ExecutionListComponent, TitleCasePipe]
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
     * Stories in the project
     */
	readonly stories = signal<Story[]>([]);

	/**
     * Currently selected story
     */
	selectedStory!: Story;

	/**
     * Currently selected scenario
     */
	selectedScenario!: Scenario;

	/**
     * If it is a custom story
     */
	readonly isCustomStory = signal(false);

	/**
     * Emits a new chosen story
     */
	readonly storyChosen = output<any>();

	/**
     * Emits a new chosen scenario
     */
	readonly scenarioChosen = output<any>();

	/**
     * Emits a new chosen scenario
     */
	readonly scenarioDeselected = output<void>();

	readonly testRunningGroup = output<any>();

	/**
     * groups in the project
     */
	readonly groups = signal<Group[]>([]);

	/**
     * Currently selected Group
     */
	selectedGroup!: Group;

	@Input() isDark!: boolean;

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
     * Stories filtered for searchterm
     */
	readonly filteredStories = signal<Story[]>([]);

	/**
     * Groups filtered for searchterm
     */
	readonly filteredGroups = signal<Group[]>([]);

	/**
     * List to manually open element in group list
     * "uk-open" for open
     * "" for close
     * Needs to be initialized at init
     * Length = Number of Groups
     */
	readonly liGroupList = signal<string[]>([]);

	isFilterActive = false;
	showFilter = false;
	assigneeModel: any;
	testPassedModel: any;
	groupModel: any;

	/**
     * Emits a new chosen Group
     */
	readonly GroupChosen = output<any>();

	readonly report = output<any>();


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

	/** Effect: watch for stories being loaded from the service */
	private getStoriesEffect = effect(() => {
		const stories = this.storyService.stories();
		if (!stories.length) return;
		const filtered = stories.filter((s: Story) => s != null);
		this.stories.set(filtered);
		this.filteredStories.set(filtered);
		this.isCustomStory.set(localStorage.getItem('source') === 'db');
	});

	/** Effect: watch for custom story creation requests */
	private createStoryEffect = effect(() => {
		const custom = this.storyService.createCustomStoryValue();
		if (!custom) return;
		this.storyService.createStory(custom.story.title, custom.story.description, custom.repositoryContainer.repoName, custom.repositoryContainer._id).subscribe(_ => {
			this.storyService.getStories(custom.repositoryContainer).subscribe((resp: Story[]) => {
				const filtered = resp.filter(s => s != null);
				this.stories.set(filtered);
				this.filteredStories.set(filtered);
				this.storyTermChange();
				this.selectStory(resp[resp.length - 1]);
			});
		});
	});

	/** Effect: watch for custom group creation requests */
	private createGroupEffect = effect(() => {
		const custom = this.groupService.createCustomGroupValue();
		if (!custom) return;
		this.groupService.createGroup(custom.group.title, custom.repositoryContainer._id, custom.group.member_stories, custom.group.isSequential).subscribe(_ => {
			this.groupService.getGroups(custom.repositoryContainer._id).subscribe((resp: Group[]) => {
				this.groups.set(resp);
				this.filteredGroups.set(resp);
				this.groupTermChange();

				const allGroups = this.getSortedGroups()!;
				const newLiGroupList = new Array(allGroups.length).fill('');
				const index = allGroups.findIndex((group: any) => group.name === custom.group.title);
				newLiGroupList[index] = 'uk-open';
				this.liGroupList.set(newLiGroupList);
				this.selectFirstStoryOfGroup(allGroups[index]);

			});
		});
	});

	/** Effect: watch for group update requests */
	private updateGroupEffect = effect(() => {
		const custom = this.groupService.updateGroupValue();
		if (!custom) return;
		this.groupService.updateGroup(custom.repositoryContainer._id, custom.group._id, custom.group).subscribe(_ => {
			this.groupService.getGroups(custom.repositoryContainer._id).subscribe((resp: Group[]) => {
				this.groups.set(resp);
			});
		});
	});

	/** Effect: watch for group deletion requests */
	private deleteGroupEffect = effect(() => {
		const custom = this.groupService.deleteGroupValue();
		if (!custom) return;
		this.groupService.deleteGroup(custom.repo_id, custom.group_id).subscribe(_ => {
			this.groupService.getGroups(custom.repo_id).subscribe((resp: Group[]) => {
				this.groups.set(resp);
			});
		});
	});

	/** Effect: watch for story deletion trigger */
	private deleteStoryEffect = effect(() => {
		const trigger = this.storyService.deleteStoryTrigger();
		if (!trigger) return;
		this.deleteStory();
	});

	/** Effect: watch for scenario status changes (e.g. after test runs) */
	private scenarioStatusChangeEffect = effect(() => {
		const custom = this.scenarioService.scenarioStatusChange();
		if (!custom) return;
		const stories = this.stories();
		const storyIndex = stories.findIndex(story => story._id === custom.storyId);
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
		this.groupService.getGroups(localStorage.getItem('id')!).subscribe(groups => {
			this.groups.set(groups);
			this.liGroupList.set(new Array(groups.length).fill(''));
		});

	}

	ngOnChanges(changes: SimpleChanges): void {
		if (changes.newSelectedStory) {
			this.selectedStory = this.newSelectedStory();
			this.scrollToSelectedStory();
			if (this.selectedStory)
				this.selectStory(this.selectedStory);

		}
		if (changes.stories && changes.stories.currentValue) {
			const filtered = changes.stories.currentValue.filter((s: Story) => s != null);
			this.stories.set(filtered);
			this.filteredStories.set(filtered);
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
     * Filters out "ghost stories" (deleted or non-existent story IDs) from each group's member_stories.
     * member_stories contains string IDs — this method keeps them as IDs and only removes
     * entries that no longer correspond to an existing story.
     * Mutates group.member_stories in-place to preserve object references for accordion state (liGroupList).
     * @param groups Groups to validate
     * @param stories Currently loaded stories to validate against
     * @returns The groups array with invalid story IDs removed
     */
	mergeById(groups: Group[], stories: Story[]): Group[] {
		// 1. Build a Set of all valid, existing story IDs
		const validIds = new Set<string>();
		if (stories)
			for (const story of stories) {
				if (story && story._id)
					validIds.add(story._id.toString());

			}
		else {
			console.warn('mergeById called with no stories.');
			return groups;
		}

		if (!groups)  return [];

		// 2. Filter each group's member_stories to only keep valid IDs
		for (const group of groups)
			if (group.member_stories)
				group.member_stories = group.member_stories.filter(id => {
					if (!id) return false;
					const strId = id.toString();
					if (!validIds.has(strId)) {
						console.warn(`Story ID ${strId} in group '${group.name}' not found. Skipping.`);
						return false;
					}
					return true;
				});


		return groups;
	}

	/**
     * Resolves a story ID to the full Story object from the loaded stories list.
     * Used by the template to display story details (title, issue_number) for group member_stories.
     * @param id The story ID to look up
     * @returns The Story object, or undefined if not found
     */
	getStoryById(id: string): Story | undefined {
		return this.stories().find(s => s._id === id);
	}

	/**
 * Evaluates whether to open xray execution list modal in run group.
 * @param group
 */
	evaluateAndRunGroup(group: any) {
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
			next: (ret: any) => {
				this.report.emit(ret);
				this.testRunningGroup.emit(false);
				const report = ret.report;
				report.storyStatuses.forEach((story: any) => {
					story.scenarioStatuses.forEach((scenario: any) => {
						this.scenarioService.scenarioStatusChangeEmit(
							story.storyId, scenario.scenarioId, scenario.status);

						this.scenarioService.getScenario(story.storyId, scenario.scenarioId).subscribe({
							next: (fullScenario) => {
								if (fullScenario && fullScenario.testRunSteps)
									for (const testRun of fullScenario.testRunSteps)
										if (selectedExecutions && selectedExecutions.includes(testRun.testRunId))
											this.xrayService.sendXrayStatus(testRun.testRunId, testRun.testRunStepId, scenario.status)
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
		const story = this.stories().find(o => o._id === group.member_stories[0]);
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
		this.selectedScenario = undefined as any;
		this.scenarioDeselected.emit();
	}

	/**
     * Selects a new Story
     * @param story
     */
	selectStory(story: Story) {
		this.storyChosen.emit(story);
	}

	scrollToSelectedStory() {
		if (this.storyElements() && this.selectedStory)
			setTimeout(() => {
				const selectedElementRef = this.storyElements().find(element => element.nativeElement.id === `story${this.selectedStory.issue_number}`);
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

	selectStoryOfGroup(id: string) {
		const story = this.stories().find(o => o._id === id);
		this.selectStory(story!);
	}

	/**
     * Opens a create New story Modal
     */
	openCreateNewStoryModal() {
		this.createNewStory().openCreateNewStoryModal(this.stories());
	}

	addScenario(scenarioName: string) {
		this.scenarioService.addScenario(this.selectedStory._id, scenarioName)
			.subscribe((resp: Scenario) => {
				this.selectScenario(resp);
				this.selectedStory.scenarios.push(resp);
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
		this.createNewScenario().openCreateScenarioModal(this.selectedStory);
	}

	dropStory(event: CdkDragDrop<string[]>) {
		const repo_id = localStorage.getItem('id')!;
		const arr = [...this.stories()];
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
		if (this.stories().find(x => x === this.selectedStory)) {
			const repository = localStorage.getItem('id')!;
			{
				this.storyService
					.deleteStory(repository, this.selectedStory._id!)
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
		const stories = this.stories();
		if (stories.find(x => x === this.selectedStory)) {
			const updated = stories.filter(x => x !== this.selectedStory);
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
			this.storyString = null as any;
		else if (varToErase === 'group')
			this.groupString = null as any;

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
		// filter for group membership (member_stories contains story IDs)
		if (this.groupModel !== undefined) {
			const group = this.groups().filter(grp => grp.name == this.groupModel)[0];
			filter = filter.filter(story => group.member_stories.includes(story._id!));
		}

		// filter for assignee in testPassed filter result
		if (this.assigneeModel !== undefined)
			filter = filter.filter(story => story.assignee.toLowerCase().includes(this.assigneeModel.toLowerCase()));


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
