import {Component, OnInit, EventEmitter, Output, ViewChild, OnDestroy} from '@angular/core';
import {ApiService} from '../Services/api.service';
import {Story} from '../model/Story';
import {Scenario} from '../model/Scenario';
import {ModalsComponent} from '../modals/modals.component';
import {Subscription} from 'rxjs/internal/Subscription';
import {Group} from "../model/Group";
import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import {getMatSelectNonFunctionValueError} from "@angular/material/select/select-errors";
import {group} from "@angular/animations";
import {find} from "rxjs/operators";

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
    isCustomStory: boolean = false;

    /**
     * If it is the daisy version
     */
    daisyVersion: boolean = true;

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
     * Emits a new chosen Group
     */
    @Output()
    GroupChosen: EventEmitter<any> = new EventEmitter();

    /**
     * View Child Modals
     */
    @ViewChild('modalsComponent') modalsComponent: ModalsComponent;

    /**
     * Constructor
     * @param apiService
     */
    constructor(public apiService: ApiService) {
        this.apiService.getStoriesEvent.subscribe(stories => {
            this.stories = stories;
            this.isCustomStory = localStorage.getItem('source') === 'db';
        });
        this.apiService.getGroups(localStorage.getItem('id')).subscribe(groups => {
            this.groups = groups;
            console.log('hallo constructor', groups)
        } );

    }

    /**
     * Checks if this is the daisy version
     */
    ngOnInit() {
        let version = localStorage.getItem('version')
        if (version == 'DAISY' || !version) {
            this.daisyVersion = true;
        } else {
            this.daisyVersion = false;
        }

        this.createStoryEmitter = this.apiService.createCustomStoryEmitter.subscribe(custom => {
            this.apiService.createStory(custom.story.title, custom.story.description, custom.repositoryContainer.value, custom.repositoryContainer._id).subscribe(respp => {
                this.apiService.getStories(custom.repositoryContainer).subscribe((resp: Story[]) => {
                    this.stories = resp;
                });
            });
        });

        this.createGroupEmitter = this.apiService.createCustomGroupEmitter.subscribe(custom => {
            this.apiService.createGroup(custom.group.title, custom.repositoryContainer._id, custom.group.member_stories).subscribe(respp => {
                this.apiService.getGroups(custom.repositoryContainer._id).subscribe((resp: Group[]) => {
                    this.groups = resp;
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
    }

    ngOnDestroy() {
        this.createStoryEmitter? this.createStoryEmitter.unsubscribe():null;
        this.createGroupEmitter? this.createGroupEmitter.unsubscribe():null;
        this.updateGroupEmitter? this.updateGroupEmitter.unsubscribe():null;
        this.deleteGroupEmitter? this.deleteGroupEmitter.unsubscribe():null;
    }


    /**
     * Sorts the stories after issue_number
     * @returns
     */
    getSortedStories() {
        if (this.stories) {
            return this.stories.sort(function (a, b) {
                if (a.issue_number < b.issue_number) {
                    return -1;
                }
                if (a.issue_number > b.issue_number) {
                    return 1;
                }
                return 0;
            });
        }
    }

    getSortedGroups() {
        if (this.groups && this.stories) {
            return this.mergeById(this.groups, this.stories)
        }
    }

    mergeById(groups, stories) {
        let myMap = new Map
        for(let story of stories)
            myMap.set(story._id, story.title)

        let ret = []
        for(let group of groups){
            let gr = group
            for (let index in group.member_stories) {
                if(!group.member_stories[index].title){
                    gr.member_stories[index] = {
                        'title': myMap.get(group.member_stories[index]),
                        '_id': group.member_stories[index]
                    }
                }
            }
            ret.push(gr)
        }
        return ret;
    }

    runGroup(group: Group){
        let id = localStorage.getItem('id')
        this.apiService.runGroup(id, group._id, null).subscribe(ret => {
            console.log('Group report, No Frontend Yet')
        })
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
    }

    /**
     * Selects a new Group
     * @param Group
     */
    selectGroupStory(group: Group) {
        this.selectedGroup = group;
    }

    selectStoryOfGroup(id){
        let story = this.stories.find(o => o._id === id)
        this.selectStoryScenario(story)
    }

    /**
     * Opens a create New scenario Modal
     */
    openCreateNewScenarioModal() {
        this.modalsComponent.openCreateNewStoryModal()
    }

    /**
     * Opens a create New group Modal
     */
    openCreateNewGroupModal(){
        this.modalsComponent.openCreateNewGroupModal()
    }

    /**
     * Opens a update group Modal
     */
    openUpdateGroupModal(group: Group){
        this.modalsComponent.openUpdateGroupModal(group)
    }

    dropStory(event: CdkDragDrop<string[]>, s) {
        let source = localStorage.getItem('source')
        let index = this.stories.findIndex(o => o._id === s._id)
        moveItemInArray(this.stories[index].scenarios, event.previousIndex, event.currentIndex);
        this.apiService.updateScenarioList(this.stories[index]._id, source, this.stories[index].scenarios).subscribe(ret => {
            console.log(ret)
        })
    }

    dropGroup(event: CdkDragDrop<string[]>, g) {
        let index = this.groups.findIndex(o => o._id === g._id)
        moveItemInArray(this.groups[index].member_stories, event.previousIndex, event.currentIndex);
        this.apiService.updateGroup(localStorage.getItem('id'), g._id, this.groups[index]).subscribe(ret => {
            console.log(ret)
        })
    }

}
