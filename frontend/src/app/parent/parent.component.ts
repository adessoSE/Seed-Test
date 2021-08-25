import { Component, OnInit } from '@angular/core';
import { ApiService } from '../Services/api.service';
import { Story } from '../model/Story';
import { Scenario } from '../model/Scenario';
import { RepositoryContainer } from '../model/RepositoryContainer';
import {Group} from "../model/Group";
import {ActivatedRoute} from "@angular/router";
import {group} from "@angular/animations";


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

  testRunningForGroup = false;

  groups: Group[]

  report;

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
        this.routing()
    });
    this.apiService
        .getGroups(_id)
        .subscribe((resp: Group[]) => {
          this.groups = resp;
        });
  }

  routing() {
    const routeMap = this.route.paramMap.subscribe(params => {
      if(params.has('story_id')){
        const story_id = params.get('story_id')
        this.selectedStory = this.stories.find(o => o._id === story_id)
        if(params.has('scenario_id')){
          const scenario_id = params.get('scenario_id')
          this.setSelectedScenario(this.selectedStory.scenarios.find(o => o.scenario_id.toString() === scenario_id))
        } else {
          this.setSelectedScenario(this.selectedStory.scenarios[0])
        }
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

  viewReport($event){
    this.report = $event
  }

  testRunningGroup($event){
    this.isStoryEditorActive = true;
    this.testRunningForGroup = $event
  }
}
