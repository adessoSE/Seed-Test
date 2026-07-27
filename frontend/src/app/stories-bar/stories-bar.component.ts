import { Component, OnInit, OnDestroy, Input, ElementRef, SimpleChanges, OnChanges, ChangeDetectionStrategy, inject, output, input, viewChild, viewChildren } from '@angular/core';
import { Story } from '@shared/models/Story';
import { XrayService } from '../Services/xray.service';
import { Scenario } from '@shared/models/Scenario';
import { Subscription } from 'rxjs/internal/Subscription';
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
export class StoriesBarComponent implements OnInit, OnDestroy, OnChanges {
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
	stories!: Story[];

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
	isCustomStory = false;

	/**
     * Subscription element if a custom story should be created
     */
	createStoryEmitter!: Subscription;

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
	groups!: Group[];

	/**
     * Currently selected Group
     */
	selectedGroup!: Group;

	/**
     * Subscription element if a custom Group should be created
     */
	createGroupEmitter!: Subscription;

	/**
     * Subscription element if a custom Group should be created
     */
	updateGroupEmitter!: Subscription;

	/**
     * Subscription element if a custom Group should be created
     */
	deleteGroupEmitter!: Subscription;

	/**
     * Subscription element if a Story should be deleted
     */
	deleteStoryObservable!: Subscription;

	/**
     * Subscription element if theme should change
     */
	themeObservable!: Subscription;

	/**
     * Subscription element to get Stories
     */
	getStoriesObservable!: Subscription;

	/**
     * Subscription element to get status change of scenarios
     */
	scenarioStatusChangeObservable!: Subscription;

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
	filteredStories!: Story[];

	/**
     * Groups filtered for searchterm
     */
	filteredGroups!: Group[];

	/**
     * List to manually open element in group list
     * "uk-open" for open
     * "" for close
     * Needs to be initialized at init
     * Length = Number of Groups
     */
	liGroupList!: string[];

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
			this.groups = groups;
			this.liGroupList = new Array(this.groups.length).fill('');
		});

	}

	ngOnInit(): void {
		this.getStoriesObservable = this.storyService.getStoriesEvent.subscribe(stories => {
			this.stories = stories.filter((s: Story) => s != null);
			this.filteredStories = this.stories;
			this.isCustomStory = localStorage.getItem('source') === 'db';
		});

		this.createStoryEmitter = this.storyService.createCustomStoryEmitter.subscribe(custom => {
			this.storyService.createStory(custom.story.title, custom.story.description, custom.repositoryContainer.repoName, custom.repositoryContainer._id).subscribe(_ => {
				this.storyService.getStories(custom.repositoryContainer).subscribe((resp: Story[]) => {
					this.stories = resp.filter(s => s != null);
					this.filteredStories = this.stories;
					this.storyTermChange();
					this.selectStory(resp[resp.length - 1]);
				});
			});
		});

		this.createGroupEmitter = this.groupService.createCustomGroupEmitter.subscribe(custom => {
			this.groupService.createGroup(custom.group.title, custom.repositoryContainer._id, custom.group.member_stories, custom.group.isSequential).subscribe(_ => {
				this.groupService.getGroups(custom.repositoryContainer._id).subscribe((resp: Group[]) => {
					this.groups = resp;
					this.filteredGroups = this.groups;
					this.groupTermChange();

					const allGroups = this.getSortedGroups()!;
					this.liGroupList = new Array(allGroups.length).fill('');
					const index = allGroups.findIndex((group: any) => group.name === custom.group.title);
					this.liGroupList[index] = 'uk-open';
					this.selectFirstStoryOfGroup(allGroups[index]);

				});
			});
		});
		this.updateGroupEmitter = this.groupService.updateGroupEmitter.subscribe(custom => {
			this.groupService.updateGroup(custom.repositoryContainer._id, custom.group._id, custom.group).subscribe(_ => {
				this.groupService.getGroups(custom.repositoryContainer._id).subscribe((resp: Group[]) => {
					this.groups = resp;
				});
			});
		});
		this.deleteGroupEmitter = this.groupService.deleteGroupEmitter.subscribe(custom => {
			this.groupService.deleteGroup(custom.repo_id, custom.group_id).subscribe(_ => {
				this.groupService.getGroups(custom.repo_id).subscribe((resp: Group[]) => {
					this.groups = resp;
				});
			});
		});

		this.isDark = this.themeService.isDarkMode();
		this.themeObservable = this.themeService.themeChanged.subscribe((_) => {
			this.isDark = this.themeService.isDarkMode();
		});

		this.deleteStoryObservable = this.storyService.deleteStoryEvent.subscribe(() => {
			this.deleteStory();
		});

		this.scenarioStatusChangeObservable = this.scenarioService.scenarioStatusChangeEvent.subscribe(custom => {
			const storyIndex = this.stories.findIndex(story => story._id === custom.storyId);
			const scenarioIndex = this.stories[storyIndex].scenarios.findIndex(scenario => scenario.scenario_id === custom.scenarioId);
			this.stories[storyIndex].scenarios[scenarioIndex].lastTestPassed = custom.lastTestPassed;
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
			this.stories = changes.stories.currentValue.filter((s: Story) => s != null);
			this.filteredStories = this.stories;
		}
	}

	/* TODO */
	ngOnDestroy() {
		this.createStoryEmitter.unsubscribe();
		this.createGroupEmitter.unsubscribe();
		this.updateGroupEmitter.unsubscribe();
		this.deleteGroupEmitter.unsubscribe();
		if (this.deleteStoryObservable && !this.deleteStoryObservable.closed) 
			this.deleteStoryObservable.unsubscribe();
        
		if (this.themeObservable && !this.themeObservable.closed) 
			this.themeObservable.unsubscribe();
        
		if (this.getStoriesObservable && !this.getStoriesObservable.closed) 
			this.getStoriesObservable.unsubscribe();
        
		if (this.scenarioStatusChangeObservable && !this.scenarioStatusChangeObservable.closed) 
			this.scenarioStatusChangeObservable.unsubscribe();
        
	}


	/**
     * Sorts the stories after issue_number
     * Displays filterd stories if searchterm was given
     * @returns
     */
	getSortedStories() {
		if (this.storyString || this.isFilterActive) 
			return this.filteredStories;
        
		return this.stories;
	}

	getSortedGroups() {
		if (this.groupString) 
			return this.filteredGroups;
        
		if (this.groups && this.stories) 
			return this.mergeById(this.groups, this.stories);
        
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
		return this.stories?.find(s => s._id === id);
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
		const story = this.stories.find(o => o._id === group.member_stories[0]);
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
		const story = this.stories.find(o => o._id === id);
		this.selectStory(story!);
	}

	/**
     * Opens a create New story Modal
     */
	openCreateNewStoryModal() {
		this.createNewStory().openCreateNewStoryModal(this.stories);
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
		this.createNewGroup().openCreateNewGroupModal(this.groups);
	}

	/**
     * Opens a update group Modal
     */
	openUpdateGroupModal(group: Group) {
		this.updateGroup().openUpdateGroupModal(group, this.groups);
	}

	openCreateScenario() {
		this.createNewScenario().openCreateScenarioModal(this.selectedStory);
	}

	dropStory(event: CdkDragDrop<string[]>) {
		const repo_id = localStorage.getItem('id')!;
		moveItemInArray(this.stories, event.previousIndex, event.currentIndex);
		this.storyService.updateStoryList(repo_id, this.stories.map((s: Story) => s._id)).subscribe(_ => { });
	}

	dropScenario(event: CdkDragDrop<string[]>, s: Story) {
		const index = this.stories.findIndex(o => o._id === s._id);
		moveItemInArray(this.stories[index].scenarios, event.previousIndex, event.currentIndex);
		this.scenarioService.updateScenarioList(this.stories[index]._id!, this.stories[index].scenarios).subscribe(_ => { });
	}

	dropGroup(event: CdkDragDrop<string[]>) {
		const repo_id = localStorage.getItem('id')!;
		moveItemInArray(this.groups, event.previousIndex, event.currentIndex);
		// Deep copy to avoid mutating the original; member_stories already contains string IDs
		const pass_arr = JSON.parse(JSON.stringify(this.groups));
		this.groupService.updateGroupsArray(repo_id, pass_arr).subscribe(_ => { });
	}

	dropGroupStory(event: CdkDragDrop<string[]>, group: Group) {
		const repo_id = localStorage.getItem('id')!;
		const index = this.groups.findIndex(o => o._id === group._id);
		// Reorder story IDs within the group
		moveItemInArray(this.groups[index].member_stories, event.previousIndex, event.currentIndex);
		this.groupService.updateGroup(repo_id, group._id!, this.groups[index]).subscribe(_ => { });
	}

	/**
    * Deletes story
    * @param story
    */
	deleteStory() {
		if (this.stories.find(x => x === this.selectedStory)) {
			const repository = localStorage.getItem('id')!;
			{
				this.storyService
					.deleteStory(repository, this.selectedStory._id!)
					.subscribe(_ => {
						this.storyDeleted();
						this.groupService.getGroups(localStorage.getItem('id')!).subscribe(groups => {
							this.groups = groups;
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
		if (this.stories.find(x => x === this.selectedStory)) 
			this.stories.splice(this.stories.findIndex(x => x === this.selectedStory), 1);
        
	}

	/**
     * Filters stories for searchterm
     */
	storyTermChange(storiesToFilter = this.stories) {
		if (this.storyString) 
			this.filteredStories = storiesToFilter.filter(story => story.title.toLowerCase().includes(this.storyString.toLowerCase()));
		else 
			this.filteredStories = storiesToFilter;
        
	}

	/**
   * Filters group for searchterm
   */
	groupTermChange() {
		if (this.groupString) 
			this.filteredGroups = this.groups.filter(group => group.name.toLowerCase().includes(this.groupString.toLowerCase()));
		else 
			this.filteredGroups = this.groups;
        
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
		let filter;

		// filter for last test passed
		switch (this.testPassedModel) {
			case 'Passed':
				filter = this.stories.filter(story => story.lastTestPassed === true);
				break;
			case 'Failed':
				filter = this.stories.filter(story => story.lastTestPassed === false);
				break;
			default:
				filter = this.stories;
				break;
		}
		// filter for group membership (member_stories contains story IDs)
		if (this.groupModel !== undefined) {
			const group = this.groups.filter(grp => grp.name == this.groupModel)[0];
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
				this.filteredStories = filter;
        

	}

	/**
     * Create List for Filter Selection
     * @param filter case for which filter the selection list should be created
     * @returns
     */
	createDistictList(filter: string) {
		if (this.stories) 
			switch (filter) {
				case 'assignee':
					return this.stories.map(story => story.assignee).filter((value, index, self) => self.indexOf(value) === index);
				case 'lastTestPassed':
					return ['Passed', 'Failed'];
				case 'group':
					if (this.groups) 
						return this.groups.map(group => group.name);
                    
					break;
				default:
					return this.stories;
			}
		else 
			return this.stories;
        
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
			this.filteredStories = this.stories;
        

		this.assigneeModel = '--';
		this.testPassedModel = '--';
		this.groupModel = '--';
		this.isFilterActive = false;
	}

	bouncer() {
		return this.stories.filter((stories) => {
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
