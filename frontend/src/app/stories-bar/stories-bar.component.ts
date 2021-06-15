import { Component, OnInit, EventEmitter, Output, ViewChild, OnDestroy } from '@angular/core';
import {ApiService} from '../Services/api.service';
import { Story } from '../model/Story';
import { Scenario } from '../model/Scenario';
import { ModalsComponent } from '../modals/modals.component';
import { Subscription } from 'rxjs/internal/Subscription';

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
      this.isCustomStory = localStorage.getItem('source') === 'db' ;
    } );

    this.apiService.createCustomStoryEmitter.subscribe(custom => {
      this.apiService.createStory(custom.story.title, custom.story.description, custom.repositoryContainer.value, custom.repositoryContainer._id).subscribe(respp => {
        this.apiService.getStories(custom.repositoryContainer).subscribe((resp: Story[]) => {
          console.log('stories', resp);
          this.stories = resp;
        });
      });
    })
    // TODO update Story
    // TODO delete Story
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
    })
  }

  ngOnDestroy() {
    if (this.createStoryEmitter) {
       this.createStoryEmitter.unsubscribe()
    }
 }


  /**
   * Sorts the stories after issue_number
   * @returns 
   */
  getSortedStories() {
    if (this.stories) {
      return this.stories.sort(function(a, b) { 
        if(a.issue_number < b.issue_number) { return -1; }
        if(a.issue_number > b.issue_number) { return 1; }
        return 0;
      });
    }
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
   * Opens a create New scenario Modal
   */
  openCreateNewScenarioModal(){
    this.modalsComponent.openCreateNewStoryModal()
  }

}
