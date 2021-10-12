import {Component, OnInit, EventEmitter, Output, ViewChild, OnDestroy, Input} from '@angular/core';
import {ApiService} from '../Services/api.service';
import {Story} from '../model/Story';
import {Scenario} from '../model/Scenario';
import {ModalsComponent} from '../modals/modals.component';
import {Subscription} from 'rxjs/internal/Subscription';
import {Group} from '../model/Group';
import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import { ToastrService } from 'ngx-toastr';
import { ThemingService } from '../Services/theming.service';


/**
 * Component of the Stories bar
 */
@Component({
    selector: 'app-stories-bar',
    templateUrl: './stories-bar.component.html',
    styleUrls: ['./stories-bar.component.css']
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
     * If it is the daisy version
     */
    daisyVersion = true;
    hideCreateScenario = false;

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

    @Input() isDark: boolean;


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
    @ViewChild('modalsComponent') modalsComponent: ModalsComponent;

    /**
     * Constructor
     * @param apiService
     * @param ThemingService
     */
    constructor(public apiService: ApiService, public toastr: ToastrService, public themeService: ThemingService) {}

    /**
     * Checks if this is the daisy version
     */
    ngOnInit() {
        this.apiService.getStoriesEvent.subscribe(stories => {
            this.stories = stories.filter(s => s != null);
            this.filteredStories = this.stories;
            this.isCustomStory = localStorage.getItem('source') === 'db';
        });
        this.apiService.getGroups(localStorage.getItem('id')).subscribe(groups => {
            this.groups = groups;
        } );
        this.apiService.deleteStoryEvent.subscribe(() => {
          this.deleteStory();
        });

        const version = localStorage.getItem('version');
        if (version == 'DAISY' || !version) {
            this.daisyVersion = true;
        } else {
            this.daisyVersion = false;
        }

        this.createStoryEmitter = this.apiService.createCustomStoryEmitter.subscribe(custom => {
            this.apiService.createStory(custom.story.title, custom.story.description, custom.repositoryContainer.value, custom.repositoryContainer._id).subscribe(respp => {
                this.apiService.getStories(custom.repositoryContainer).subscribe((resp: Story[]) => {
                    this.stories = resp.filter(s => s != null);
                    this.filteredStories = this.stories;
                    this.storyTermChange();
                });
            });
        });

        this.createGroupEmitter = this.apiService.createCustomGroupEmitter.subscribe(custom => {
            this.apiService.createGroup(custom.group.title, custom.repositoryContainer._id, custom.group.member_stories).subscribe(respp => {
                this.apiService.getGroups(custom.repositoryContainer._id).subscribe((resp: Group[]) => {
                    this.groups = resp;
                    this.filteredGroups = this.groups;
                    this.groupTermChange();
                });
            });
        });
        this.updateGroupEmitter = this.apiService.updateGroupEmitter.subscribe(custom => {
            this.apiService.updateGroup(custom.repositoryContainer._id, custom.group._id, custom.group).subscribe(respp => {
                this.apiService.getGroups(custom.repositoryContainer._id).subscribe((resp: Group[]) => {
                    this.groups = resp;
                });
            });
        });
        this.deleteGroupEmitter = this.apiService.deleteGroupEmitter.subscribe(custom => {
            this.apiService.deleteGroup(custom.repo_id, custom.group_id).subscribe(respp => {
                this.apiService.getGroups(custom.repo_id).subscribe((resp: Group[]) => {
                    this.groups = resp;
                });
            });
        });

        this.isDark = this.themeService.isDarkMode();
        this.themeService.themeChanged
        .subscribe((currentTheme) => {
            this.isDark = this.themeService.isDarkMode();
    });
    }

    ngOnDestroy() {
        this.createStoryEmitter.unsubscribe();
        this.createGroupEmitter.unsubscribe();
        this.updateGroupEmitter.unsubscribe();
        this.deleteGroupEmitter.unsubscribe();
        this.apiService.getStoriesEvent.unsubscribe();
        this.apiService.deleteStoryEvent.unsubscribe();
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
            myMap.set(story._id, story.title);
        }

        const ret = [];
        for (const group of groups) {
            const gr = group;
            for (const index in group.member_stories) {
                if (!group.member_stories[index].title) {
                    gr.member_stories[index] = {
                        'title': myMap.get(group.member_stories[index]),
                        '_id': group.member_stories[index]
                    };
                }
            }
            ret.push(gr);
        }
        return ret;
    }

    runGroup(group: Group) {
        const id = localStorage.getItem('id');
        this.testRunningGroup.emit(true);
        this.apiService.runGroup(id, group._id, null).subscribe(ret => {
            this.report.emit(ret);
            console.log('Group report, No Frontend Yet');
            this.testRunningGroup.emit(false);
        });
    }

    /**
     * Select the first Story of a Group
     * @param group
     */
    selectFirstStoryofGroup(group: Group) {
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
     * Selects a new Story and with it a new scenario
     * @param story
     */
    selectStoryScenario(story: Story) {
        this.selectedStory = story;
        this.storyChosen.emit(story);
        const storyIndex = this.stories.indexOf(this.selectedStory);
        if (this.stories[storyIndex].scenarios[0]) {
            this.selectScenario(this.stories[storyIndex].scenarios[0]);
        }
        this.toggleShows();
    }

    /**
     * Selects a new Group
     * @param Group
     */
    selectGroupStory(group: Group) {
        this.selectedGroup = group;
    }

    selectStoryOfGroup(id) {
        const story = this.stories.find(o => o._id === id);
        this.selectStoryScenario(story);
    }

    /**
     * Opens a create New scenario Modal
     */
    openCreateNewStoryModal() {
        this.modalsComponent.openCreateNewStoryModal(this.stories);
    }

    addFirstScenario() {
        this.apiService.addScenario(this.selectedStory._id, this.selectedStory.storySource)
            .subscribe((resp: Scenario) => {
                this.selectScenario(resp);
                this.selectedStory.scenarios.push(resp);
                this.toastr.info('Successfully added', 'Scenario');
                this.hideCreateScenario = true;
            });
    }

    toggleShows(): boolean {
        if (this.selectedStory.scenarios.length === 0) {
            this.hideCreateScenario = false;
        } else {
            this.hideCreateScenario = true;
        }
        return this.hideCreateScenario;
    }

    /**
     * Opens a create New group Modal
     */
    openCreateNewGroupModal() {
        console.log(this.groups);
        this.modalsComponent.openCreateNewGroupModal(this.groups);
    }

    /**
     * Opens a update group Modal
     */
    openUpdateGroupModal(group: Group) {
        this.modalsComponent.openUpdateGroupModal(group, this.groups);
    }

    dropStory(event: CdkDragDrop<string[]>) {
        const source = localStorage.getItem('source');
        const repo_id = localStorage.getItem('id');
        moveItemInArray(this.stories, event.previousIndex, event.currentIndex);
        this.apiService.updateStoryList(repo_id, source, this.stories.map(s => s._id)).subscribe(ret => {
            // console.log(ret)
        });
    }

    dropScenario(event: CdkDragDrop<string[]>, s) {
        const source = localStorage.getItem('source');
        const index = this.stories.findIndex(o => o._id === s._id);
        moveItemInArray(this.stories[index].scenarios, event.previousIndex, event.currentIndex);
        this.apiService.updateScenarioList(this.stories[index]._id, source, this.stories[index].scenarios).subscribe(ret => {
            // console.log(ret)
        });
    }

    dropGroup(event: CdkDragDrop<string[]>) {
        const repo_id = localStorage.getItem('id');
        moveItemInArray(this.groups, event.previousIndex, event.currentIndex);
        const pass_arr = JSON.parse(JSON.stringify(this.groups)); // deepCopy
        for (const groupIndex in pass_arr) {
            pass_arr[groupIndex].member_stories = pass_arr[groupIndex].member_stories.map(o => o._id);
        }
        this.apiService.updateGroupsArray(repo_id, pass_arr).subscribe(ret => {
            console.log(ret);
        });
    }

    dropGroupStory(event: CdkDragDrop<string[]>, group) {
        const repo_id = localStorage.getItem('id');
        const index = this.groups.findIndex(o => o._id === group._id);
        moveItemInArray(this.groups[index].member_stories, event.previousIndex, event.currentIndex);
        const pass_gr = this.groups[index];
        pass_gr.member_stories = this.groups[index].member_stories.map(o => o._id);
        this.apiService.updateGroup(repo_id, group._id, pass_gr).subscribe( ret => {
            // console.log(ret)
        });
    }

  /**
  * Deletes story
  * @param story
  */
  deleteStory() {
    if(this.stories.find(x => x === this.selectedStory)){
    const repository = localStorage.getItem('id');
    { this.apiService
       .deleteStory(repository, this.selectedStory._id)
       .subscribe(resp => {
           this.storyDeleted();
           this.toastr.error('', 'Story deleted');
        }); }
  }}

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
    if(this.storyString){
        this.filteredStories = storiesToFilter.filter(story => story.title.toLowerCase().includes(this.storyString.toLowerCase()));
    } else {
        this.filteredStories = storiesToFilter;
    }
  }

    /**
   * Filters group for searchterm
   */
    groupTermChange() {
      if(this.groupString){
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
        }} else {
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

}
