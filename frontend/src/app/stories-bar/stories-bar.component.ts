import {Component, OnInit, EventEmitter, Output, ViewChild, OnDestroy} from '@angular/core';
import {ApiService} from '../Services/api.service';
import {Story} from '../model/Story';
import {Scenario} from '../model/Scenario';
import {ModalsComponent} from '../modals/modals.component';
import {Subscription} from 'rxjs/internal/Subscription';
import {Group} from "../model/Group";

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
                    console.log(resp)
                });
            });
        });
    }

    ngOnDestroy() {
        if (this.createStoryEmitter) {
            this.createStoryEmitter.unsubscribe()
        }
        if (this.createGroupEmitter) {
            this.createGroupEmitter.unsubscribe()
        }
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
        if (this.groups) {
            return this.groups
        }
    }

    mergeById(group, stories){
        //TODO merge groupmember ids to their names
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
    selectGroupStory(Group: Group) {
        this.selectedGroup = Group;
    }

    /**
     * Opens a create New scenario Modal
     */
    openCreateNewScenarioModal() {
        this.modalsComponent.openCreateNewStoryModal()
    }

    /**
     * Opens a create New story Modal
     */
    openCreateNewGroupModal(){
        this.modalsComponent.openCreateNewGroupModal()
    }

}
