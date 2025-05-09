import { Component, OnInit, EventEmitter, Output, ViewChild, OnDestroy, Input, ElementRef, ViewChildren, QueryList, SimpleChanges } from '@angular/core';
import { Story } from '../model/Story';
import { XrayService } from '../Services/xray.service';
import { Scenario } from '../model/Scenario';
import { Subscription } from 'rxjs/internal/Subscription';
import { Group } from '../model/Group';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { ToastrService } from 'ngx-toastr';
import { ThemingService } from '../Services/theming.service';
import { CreateNewGroupComponent } from '../modals/create-new-group/create-new-group.component';
import { CreateNewStoryComponent } from '../modals/create-new-story/create-new-story.component';
import { UpdateGroupComponent } from '../modals/update-group/update-group.component';
import { CreateScenarioComponent } from '../modals/create-scenario/create-scenario.component';
import { RepositoryContainer } from 'src/app/model/RepositoryContainer';
import { StoryService } from '../Services/story.service';
import { GroupService } from '../Services/group.service';
import { ScenarioService } from '../Services/scenario.service';
import { ReportService } from '../Services/report.service';
import { BackgroundService } from '../Services/background.service';
import { ExecutionListComponent } from '../modals/execution-list/execution-list.component';

/**
 * Component of the Stories bar
 */
@Component({
    selector: 'app-stories-bar',
    templateUrl: './stories-bar.component.html',
    styleUrls: ['./stories-bar.component.css'],
    standalone: false
})
export class StoriesBarComponent implements OnInit, OnDestroy {

    /**
     * Stories in the project
     */
    stories: Story[];

    /**
     * Currently selected story
     */
    selectedStory: Story;

    /**
     * Currently selected scenario
     */
    selectedScenario: Scenario;

    /**
     * If it is a custom story
     */
    isCustomStory = false;

    /**
     * Subscription element if a custom story should be created
     */
    createStoryEmitter: Subscription;

    /**
     * Emits a new chosen story
     */
    @Output()
    storyChosen: EventEmitter<any> = new EventEmitter();

    /**
     * Emits a new chosen scenario
     */
    @Output()
    scenarioChosen: EventEmitter<any> = new EventEmitter();

    /**
     * Emits a new chosen scenario
     */
    @Output()
    scenarioDeselected: EventEmitter<any> = new EventEmitter();
    
    @Output()
    testRunningGroup: EventEmitter<any> = new EventEmitter();

    /**
     * groups in the project
     */
    groups: Group[];

    /**
     * Currently selected Group
     */
    selectedGroup: Group;

    /**
     * Subscription element if a custom Group should be created
     */
    createGroupEmitter: Subscription;

    /**
     * Subscription element if a custom Group should be created
     */
    updateGroupEmitter: Subscription;

    /**
     * Subscription element if a custom Group should be created
     */
    deleteGroupEmitter: Subscription;

    /**
     * Subscription element if a Story should be deleted
     */
    deleteStoryObservable: Subscription;

    /**
     * Subscription element if theme should change
     */
    themeObservable: Subscription;

    /**
     * Subscription element to get Stories
     */
    getStoriesObservable: Subscription;

    /**
     * Subscription element to get status change of scenarios
     */
    scenarioStatusChangeObservable: Subscription;

    @Input() isDark: boolean;

    @Input() newSelectedStory: Story;

    /**
     * SearchTerm for story title search
     */
    storyString: string;

    /**
     * SearchTerm for group title search
     */
    groupString: string;
    /**
     * Stories filtered for searchterm
     */
    filteredStories: Story[];

    /**
     * Groups filtered for searchterm
     */
    filteredGroups: Group[];

    /**
     * List to manually open element in group list
     * "uk-open" for open
     * "" for close
     * Needs to be initialized at init
     * Length = Number of Groups
     */
    liGroupList: string[];

    isFilterActive = false;
    showFilter = false;
    assigneeModel;
    testPassedModel;
    groupModel;

    /**
     * Emits a new chosen Group
     */
    @Output()
    GroupChosen: EventEmitter<any> = new EventEmitter();

    @Output() report: EventEmitter<any> = new EventEmitter();


    /**
     * View Child Modals
     */
    @ViewChild('createNewGroup') createNewGroup: CreateNewGroupComponent;
    @ViewChild('createNewStory') createNewStory: CreateNewStoryComponent;
    @ViewChild('updateGroup') updateGroup: UpdateGroupComponent;
    @ViewChild('createNewScenario') createNewScenario: CreateScenarioComponent;
    @ViewChild('executionListModal') executionListModal: ExecutionListComponent;
    @ViewChildren('storyElement') storyElements: QueryList<ElementRef>;

    /**
     * Constructor
     * @param toastr
     * @param themeService
     * @param storyService
     * @param groupService
     * @param scenarioService
     * @param reportService
     */
    constructor(
        public toastr: ToastrService,
        public themeService: ThemingService,
        public storyService: StoryService,
        public xrayService: XrayService,
        public groupService: GroupService,
        public scenarioService: ScenarioService,
        public reportService: ReportService,
        public backgroundService: BackgroundService) {
        this.groupService.getGroups(localStorage.getItem('id')).subscribe(groups => {
            this.groups = groups;
            this.liGroupList = new Array(this.groups.length).fill("")
        });

        const version = localStorage.getItem('version');
    }

    ngOnInit() {
        this.getStoriesObservable = this.storyService.getStoriesEvent.subscribe(stories => {
            this.stories = stories.filter(s => s != null);
            this.filteredStories = this.stories;
            this.isCustomStory = localStorage.getItem('source') === 'db';
        });

        this.createStoryEmitter = this.storyService.createCustomStoryEmitter.subscribe(custom => {
            this.storyService.createStory(custom.story.title, custom.story.description, custom.repositoryContainer.value, custom.repositoryContainer._id).subscribe(_ => {
                this.storyService.getStories(custom.repositoryContainer).subscribe((resp: Story[]) => {
                    this.stories = resp.filter(s => s != null);
                    this.filteredStories = this.stories;
                    this.storyTermChange();
                    this.selectStoryScenario(resp[resp.length - 1]);
                });
            });
        });

        this.createGroupEmitter = this.groupService.createCustomGroupEmitter.subscribe(custom => {
            this.groupService.createGroup(custom.group.title, custom.repositoryContainer._id, custom.group.member_stories, custom.group.isSequential).subscribe(_ => {
                this.groupService.getGroups(custom.repositoryContainer._id).subscribe((resp: Group[]) => {
                    this.groups = resp;
                    this.filteredGroups = this.groups;
                    this.groupTermChange();

                    let allGroups = this.getSortedGroups()
                    this.liGroupList = new Array(allGroups.length).fill("")
                    let index = allGroups.findIndex((group: any) => group.name === custom.group.title);
                    this.liGroupList[index] = "uk-open"
                    this.selectFirstStoryOfGroup(allGroups[index])

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

    ngOnChanges(changes: SimpleChanges) {
        if (changes.newSelectedStory) {
            this.selectedStory = this.newSelectedStory;
            this.scrollToSelectedStory();
            if (this.selectedStory){
                this.selectStoryScenario(this.selectedStory);
            }
        }
    }

    /* TODO */
    ngOnDestroy() {
        this.createStoryEmitter.unsubscribe();
        this.createGroupEmitter.unsubscribe();
        this.updateGroupEmitter.unsubscribe();
        this.deleteGroupEmitter.unsubscribe();
        if (!this.deleteStoryObservable.closed) {
            this.deleteStoryObservable.unsubscribe();
        }
        if (!this.themeObservable.closed) {
            this.themeObservable.unsubscribe();
        }
        if (!this.getStoriesObservable.closed) {
            this.getStoriesObservable.unsubscribe();
        }
    }


    /**
     * Sorts the stories after issue_number
     * Displays filterd stories if searchterm was given
     * @returns
     */
    getSortedStories() {
        if (this.storyString || this.isFilterActive) {
            return this.filteredStories;
        }
        return this.stories;
    }

    getSortedGroups() {
        if (this.groupString) {
            return this.filteredGroups;
        }
        if (this.groups && this.stories) {
            return this.mergeById(this.groups, this.stories);
        }
    }

    mergeById(groups, stories) {
        const myMap = new Map;
        for (const story of stories) {
            myMap.set(story._id, story);
        }

        const groupStories = [];
        for (const group of groups) {
            const tmpGroup = group;
            for (const index in group.member_stories) {
                if (!group.member_stories[index].title) {
                    tmpGroup.member_stories[index] = {
                        '_id': group.member_stories[index],
                        'title': myMap.get(group.member_stories[index]).title,
                        'issue_number': myMap.get(group.member_stories[index]).issue_number
                    };
                }
            }
            groupStories.push(tmpGroup);
        }
        return groupStories;
    }

    /**
 * Evaluates whether to open xray execution list modal in run group.
 * @param group
 */
    evaluateAndRunGroup(group) {
        if (group.xrayTestSet) {
            this.selectedGroup = group;
            this.executionListModal.openExecutionListModal(group);
        } else {
            // Run group directly if group is no xray test set
            this.runGroup(group);
        }
    }

    /**
     * Run this function if we close execution list modal
     */
    executeTests(event: { scenarioId: number | null, selectedExecutions: number[] }) {
        this.runGroup(this.selectedGroup, event.selectedExecutions);
    }

    runGroup(group: Group, selectedExecutions?: number[]) {
        const id = localStorage.getItem('id');
        this.testRunningGroup.emit(true);
        const params = { repository: localStorage.getItem('repository'), source: localStorage.getItem('source') }
        this.groupService.runGroup(id, group._id, params).subscribe({
            next: (ret: any) => {
                this.report.emit(ret);
                this.testRunningGroup.emit(false);
                const report = ret.report;
                report.storyStatuses.forEach(story => {
                    story.scenarioStatuses.forEach(scenario => {
                        this.scenarioService.scenarioStatusChangeEmit(
                            story.storyId, scenario.scenarioId, scenario.status);

                        this.scenarioService.getScenario(story.storyId, scenario.scenarioId).subscribe({
                            next: (fullScenario) => {
                                if (fullScenario && fullScenario.testRunSteps) {
                                    for (const testRun of fullScenario.testRunSteps) {
                                        if (selectedExecutions && selectedExecutions.includes(testRun.testRunId)) {
                                            this.xrayService.sendXrayStatus(testRun.testRunId, testRun.testRunStepId, scenario.status)
                                                .subscribe({
                                                    next: () => {
                                                        console.log('XRay update successful for TestRunStepId:', testRun.testRunStepId, " and Test Execution:", testRun.testExecKey);
                                                    },
                                                    error: (error) => {
                                                        console.error('Error while updating XRay status for TestRunStepId:', testRun.testRunStepId, error);
                                                    }
                                                });
                                        }
                                    }
                                }
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
        let story = group.member_stories[0];
        story = this.stories.find(o => o._id === story._id);
        this.selectStoryScenario(story);
    }

    /**
     * Selects a new scenario
     * @param scenario
     */
    selectScenario(scenario: Scenario) {
        this.selectedScenario = scenario;
        this.scenarioChosen.emit(scenario);
    }

    /**
     * Deselects Scenario - Destroys Scenario Editor
     * @param scenario
     */
    deselectScenario(){
        this.selectedScenario = undefined;
        this.scenarioDeselected.emit();
    }

    /**
     * Selects a new Story and with it a new scenario
     * @param story
     */
    selectStoryScenario(story: Story) {
        this.selectedStory = story;
        this.initialyAddIsExample();
        this.storyChosen.emit(story);
        if (story.scenarios.length > 0 && story.scenarios[0] != null && story.scenarios[0] != undefined) {
            this.selectScenario(story.scenarios[0]);
        } else this.deselectScenario()
        this.backgroundService.backgroundReplaced = undefined;
    }

    scrollToSelectedStory() {
        if (this.storyElements && this.selectedStory) {
          setTimeout(() => {
            const selectedElementRef = this.storyElements.find(element => element.nativeElement.id === `story${this.selectedStory.issue_number}`);
            if (selectedElementRef) {
              console.log("Found selected element", selectedElementRef.nativeElement);
              selectedElementRef.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 0);
        }
      }
      
    /**
     * Selects a new Group
     * @param group
     */
    selectGroup(group: Group) {
        this.selectedGroup = group;
    }

    selectStoryOfGroup(id) {
        const story = this.stories.find(o => o._id === id);
        this.selectStoryScenario(story);
    }

    /**
     * Opens a create New story Modal
     */
    openCreateNewStoryModal() {
        this.createNewStory.openCreateNewStoryModal(this.stories);
    }

    addScenario(scenarioName) {
        this.scenarioService.addScenario(this.selectedStory._id, scenarioName)
            .subscribe((resp: Scenario) => {
                this.selectScenario(resp);
                this.selectedStory.scenarios.push(resp);
                this.toastr.info('Successfully added', 'Scenario');
            });
    }

    /**
     * Opens a create New group Modal
     */
    openCreateNewGroupModal() {
        this.createNewGroup.openCreateNewGroupModal(this.groups);
    }

    /**
     * Opens a update group Modal
     */
    openUpdateGroupModal(group: Group) {
        this.updateGroup.openUpdateGroupModal(group, this.groups);
    }

    openCreateScenario() {
        this.createNewScenario.openCreateScenarioModal(this.selectedStory);
    }

    dropStory(event: CdkDragDrop<string[]>) {
        const repo_id = localStorage.getItem('id');
        moveItemInArray(this.stories, event.previousIndex, event.currentIndex);
        this.storyService.updateStoryList(repo_id, this.stories.map(s => s._id)).subscribe(_ => { });
    }

    dropScenario(event: CdkDragDrop<string[]>, s) {
        const index = this.stories.findIndex(o => o._id === s._id);
        moveItemInArray(this.stories[index].scenarios, event.previousIndex, event.currentIndex);
        this.scenarioService.updateScenarioList(this.stories[index]._id, this.stories[index].scenarios).subscribe(_ => { });
    }

    dropGroup(event: CdkDragDrop<string[]>) {
        const repo_id = localStorage.getItem('id');
        moveItemInArray(this.groups, event.previousIndex, event.currentIndex);
        const pass_arr = JSON.parse(JSON.stringify(this.groups)); // deepCopy
        for (const groupIndex in pass_arr) {
            pass_arr[groupIndex].member_stories = pass_arr[groupIndex].member_stories.map(o => o._id);
        }
        this.groupService.updateGroupsArray(repo_id, pass_arr).subscribe(_ => { });
    }

    dropGroupStory(event: CdkDragDrop<string[]>, group) {
        const repo_id = localStorage.getItem('id');
        const index = this.groups.findIndex(o => o._id === group._id);
        moveItemInArray(this.groups[index].member_stories, event.previousIndex, event.currentIndex);
        const pass_gr = this.groups[index];
        pass_gr.member_stories = this.groups[index].member_stories.map(o => o._id);
        this.groupService.updateGroup(repo_id, group._id, pass_gr).subscribe(_ => { });
    }

    /**
    * Deletes story
    * @param story
    */
    deleteStory() {
        if (this.stories.find(x => x === this.selectedStory)) {
            const repository = localStorage.getItem('id');
            {
                this.storyService
                .deleteStory(repository, this.selectedStory._id)
                .subscribe(_ => {
                    this.storyDeleted();
                    this.groupService.getGroups(localStorage.getItem('id')).subscribe(groups => {
                        this.groups = groups;
                    });
                    this.toastr.error('', 'Story deleted');
                });
            }
        }
    }

    /**
    * Removes the selected story
    */
    storyDeleted() {
        if (this.stories.find(x => x === this.selectedStory)) {
            this.stories.splice(this.stories.findIndex(x => x === this.selectedStory), 1);
        }
    }

    /**
     * Filters stories for searchterm
     */
    storyTermChange(storiesToFilter = this.stories) {
        if (this.storyString) {
            this.filteredStories = storiesToFilter.filter(story => story.title.toLowerCase().includes(this.storyString.toLowerCase()));
        } else {
            this.filteredStories = storiesToFilter;
        }
    }

    /**
   * Filters group for searchterm
   */
    groupTermChange() {
        if (this.groupString) {
            this.filteredGroups = this.groups.filter(group => group.name.toLowerCase().includes(this.groupString.toLowerCase()));
        } else {
            this.filteredGroups = this.groups;
        }
    }

    /**
     * Delete Search Term
     * @param varToErase either group or story
     */
    eraseSearchTerm(varToErase: string) {
        if (varToErase === 'story') {
            this.storyString = null;
        } else if (varToErase === 'group') {
            this.groupString = null;
        }
    }

    filter() {
        this.isFilterActive = true;
        let filter = [];

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
        if (this.groupModel !== undefined) {
            const group = this.groups.filter(grp => grp.name == this.groupModel)[0];
            const storiesIds = group.member_stories.map(story => story._id);
            filter = filter.filter(story => storiesIds.includes(story._id));
            console.log(filter);
        }

        // filter for assignee in testPassed filter result
        if (this.assigneeModel !== undefined) {
            filter = filter.filter(story => story.assignee.toLowerCase().includes(this.assigneeModel.toLowerCase()));
        }

        // check if no filter is active and apply search term
        if (this.assigneeModel === undefined && this.testPassedModel === undefined && this.groupModel === undefined) {
            this.isFilterActive = false;
            if (this.storyString) {
                this.storyTermChange();
            }
        } else {
            if (this.storyString) {
                this.storyTermChange(filter);
            } else {
                this.filteredStories = filter;
            }
        }

    }

    /**
     * Create List for Filter Selection
     * @param filter case for which filter the selection list should be created
     * @returns
     */
    createDistictList(filter: string) {
        if (this.stories) {
            switch (filter) {
                case 'assignee':
                    return this.stories.map(story => story.assignee).filter((value, index, self) => self.indexOf(value) === index);
                case 'lastTestPassed':
                    return ['Passed', 'Failed'];
                case 'group':
                    if (this.groups) {
                        return this.groups.map(group => group.name);
                    }
                    break;
                default:
                    return this.stories;
            }
        } else {
            return this.stories;
        }
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
        if (this.storyString) {
            this.storyTermChange();
        } else {
            this.filteredStories = this.stories;
        }

        this.assigneeModel = '--';
        this.testPassedModel = '--';
        this.groupModel = '--';
        this.isFilterActive = false;
    }

    bouncer() {
        return this.stories.filter(function (stories) {
            return stories;
        });
    }

    initialyAddIsExample() {
        console.log(this.selectedStory)
        if (this.selectedStory) {
            this.selectedStory.scenarios.forEach(scenario => {
                scenario.stepDefinitions.given.forEach((value, index) => {
                    if (!scenario.stepDefinitions.given[index].isExample) {
                        scenario.stepDefinitions.given[index].isExample = new Array(value.values.length)
                        value.values.forEach((val, i) => {
                            scenario.stepDefinitions.given[index].isExample[i] = val.startsWith('<') && val.endsWith('>')
                        })
                    }
                })
                scenario.stepDefinitions.when.forEach((value, index) => {
                    if (!scenario.stepDefinitions.when[index].isExample) {
                        scenario.stepDefinitions.when[index].isExample = new Array(value.values.length)
                        value.values.forEach((val, i) => {
                            scenario.stepDefinitions.when[index].isExample[i] = val.startsWith('<') && val.endsWith('>')
                        })
                    }
                })
                scenario.stepDefinitions.then.forEach((value, index) => {
                    if (!scenario.stepDefinitions.then[index].isExample) {
                        scenario.stepDefinitions.then[index].isExample = new Array(value.values.length)
                        value.values.forEach((val, i) => {
                            scenario.stepDefinitions.then[index].isExample[i] = val.startsWith('<') && val.endsWith('>')
                        })
                    }
                })
    
            })
        }
    }
    toTicket(story: string) {
        const value = localStorage.getItem('repository');
        const _id = localStorage.getItem('id');
        const source = localStorage.getItem('source');
        const repositoryContainer: RepositoryContainer = { value, source, _id };
        this.storyService.goToTicket(story, repositoryContainer);
    }
}
