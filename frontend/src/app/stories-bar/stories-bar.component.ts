import { Component, OnInit, EventEmitter, Output, ViewChild, OnDestroy } from '@angular/core';
import {ApiService} from '../Services/api.service';
import { Story } from '../model/Story';
import { Scenario } from '../model/Scenario';
import { ModalsComponent } from '../modals/modals.component';
import { Subscription } from 'rxjs/internal/Subscription';
import { ToastrService } from 'ngx-toastr';


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
  isShown: boolean = false;

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
  
  constructor(public apiService: ApiService, private modalService: NgbModal, private toastr: ToastrService) {
    this.apiService.getStoriesEvent.subscribe(stories => {
      this.stories = stories;
      this.isCustomStory = localStorage.getItem('source') === 'db' ;
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
    })
    // TODO update Story
    // TODO delete Story
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
    this.toggleShows();
  }

  /**
   * Opens a create New scenario Modal
   */
  openCreateNewScenarioModal(){
    this.modalsComponent.openCreateNewStoryModal()
  }

  addFirstScenario(){
    this.apiService.addScenario(this.selectedStory._id, this.selectedStory.storySource)
    .subscribe((resp: Scenario) => {
       this.selectScenario(resp);
       this.selectedStory.scenarios.push(resp);
       this.toastr.info('', 'Senario added')
       this.isShown=false;
    });
}

toggleShows():boolean{
  if(this.selectedStory.scenarios.length==0){
    return this.isShown=true; 
  } else{
    return this.isShown=false;
  } 
}

}
