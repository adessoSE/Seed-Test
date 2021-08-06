import { Component, OnInit, EventEmitter, Output, ViewChild, OnDestroy } from '@angular/core';
import {ApiService} from '../Services/api.service';
import { Story } from '../model/Story';
import { Scenario } from '../model/Scenario';
import { ModalsComponent } from '../modals/modals.component';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs/internal/Subscription';
import { DeleteStoryToast } from '../deleteStory-toast';
import { RepositoryContainer } from '../model/RepositoryContainer';



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
  hideCreateScenario: boolean = false;

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
     * View child of the scenario editor
     */
    @ViewChild('storyChild') storyChild;

  /**
   * View Child Modals
   */
  @ViewChild('modalsComponent') modalsComponent: ModalsComponent;

   /**
   * Constructor
   * @param apiService
   */
  constructor(public apiService: ApiService, private toastr: ToastrService) {
    this.apiService.getStoriesEvent.subscribe(stories => {
      var filtered = stories.filter(function(a){return a != null;});
      this.stories = filtered;
      this.isCustomStory = localStorage.getItem('source') === 'db' ;
    } );
    this.apiService.deleteStoryEvent.subscribe(() => {
      this.deleteStory()
  });
    
  }
  

  /**
   * Checks if this is the daisy version
   */
  ngOnInit() {
    const version = localStorage.getItem('version');
    if (version === 'DAISY' || !version) {
      this.daisyVersion = true;
    } else {
      this.daisyVersion = false;
    }

    this.createStoryEmitter = this.apiService.createCustomStoryEmitter.subscribe(custom => {
       this.apiService.createStory(custom.story.title, custom.story.description, custom.repositoryContainer.value,
         custom.repositoryContainer._id).subscribe(() => {
        this.apiService.getStories(custom.repositoryContainer).subscribe((resp: Story[]) => {
          this.stories = resp;
        });
      });
     
    });
  }



  ngOnDestroy() {
    if (this.createStoryEmitter) {
       this.createStoryEmitter.unsubscribe();
    }
 }


  /**
   * Sorts the stories after issue_number
   * @returns
   */
  getSortedStories() {
    if (this.stories) {
      return this.stories.sort(function(a, b) {
        if (a.issue_number < b.issue_number) { return -1; }
        if (a.issue_number > b.issue_number) { return 1; }
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
    this.toggleShows();
  }

  /**
   * Opens a create New scenario Modal
   */
  openCreateNewScenarioModal() {
    this.modalsComponent.openCreateNewStoryModal();
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
  * Deletes story
  * @param story
  */ 
  deleteStory() {  
    let repository=localStorage.getItem('id');
    console.log("Repos:" ,repository)
    console.log("Story", this.selectedStory)
    { this.apiService
       .deleteStory(repository,this.selectedStory._id)
       .subscribe(resp => {
           this.storyDeleted();
           this.toastr.error('', 'Story deleted');
        });}
  }

  /**
  * Removes the selected story
  */ 
  storyDeleted(){
    if (this.stories.find(x => x == this.selectedStory)) {
      this.stories.splice(this.stories.findIndex(x => x == this.selectedStory), 1);       
    };
  }

}

