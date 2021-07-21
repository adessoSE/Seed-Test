import { Component, OnInit } from '@angular/core';
import { ApiService } from '../Services/api.service';
import { Story } from '../model/Story';
import { Scenario } from '../model/Scenario';
import { RepositoryContainer } from '../model/RepositoryContainer';
import {ActivatedRoute} from "@angular/router";

/**
 * Component containing the Story-Bar and Story Editor
 */
@Component({
  selector: 'app-parent',
  templateUrl: './parent.component.html',
  styleUrls: ['./parent.component.css']
})
export class ParentComponent implements OnInit {

  /**
   * Stories in the selected project
   */
  stories: Story[];

  /**
   * Currently selected story
   */
  selectedStory: Story;

  /**
   * Currently selected Scenario
   */
  selectedScenario: Scenario;

  /**
   * If the story Editor is shown or the report history
   */
  isStoryEditorActive = true;

  /**
   * Constructor
   * @param apiService 
   */
  constructor(public apiService: ApiService, public route: ActivatedRoute) {
    this.apiService.getBackendUrlEvent.subscribe(() => {
      this.loadStories();
    });
    if(this.apiService.urlReceived) {
      this.loadStories();
    }else {
      this.apiService.getBackendInfo()
    }
   }

  /**
   * Requests the repositories on init
   */
  ngOnInit() {
    this.apiService.getRepositories().subscribe();

  }

  /**
   * Leads the stories of the current selected repository
   */
  loadStories() {
    let value: string = localStorage.getItem('repository');
    let source: string = localStorage.getItem('source');
    let _id: string = localStorage.getItem('id');
    let repository: RepositoryContainer = {value, source, _id};
    this.apiService
      .getStories(repository)
      .subscribe((resp: Story[]) => {
        this.stories = resp;
        this.showStory()
    });
  }

  showStory() {
    const storyid = this.route.paramMap.subscribe(params => {
      if(params.get('id')){
        const id = params.get('id')
        this.selectedStory = this.stories.find(o => o._id === id)
        this.setSelectedScenario(this.selectedStory.scenarios[0])// could throw error without scenarios
        console.log('id is', id, this.stories, this.selectedStory)
      }
    })
  }

  /**
   * Sets the currently selected story
   * @param story 
   */
  setSelectedStory(story: Story){
    this.selectedStory = story;
  }

  /**
   * Sets the currently selected scenario
   * @param scenario 
   */
  setSelectedScenario(scenario: Scenario){
    this.selectedScenario = scenario;
  }

  /**
   * Change the editor to report history or story editor
   * @param event event
   */
  setEditor(event){
    this.isStoryEditorActive = !this.isStoryEditorActive;
  }
}
