import { Component, OnInit } from '@angular/core';
import {tap} from "rxjs/operators";
import {HttpClient} from "@angular/common/http";
import {ApiService} from "../Services/api.service";
declare var UIkit: any;
@Component({
  selector: 'app-scenario-editor',
  templateUrl: './scenario-editor.component.html',
  styleUrls: ['./scenario-editor.component.css']
})
export class ScenarioEditorComponent implements OnInit {
  stories;
  stepDefinitions;
  selectedStory;
  selectedFeature;
  selectedScenario;
  clicked;
  showEditor = false;
  editorLocked: boolean = true;
  private apiServer: string = "https://cucumberapp.herokuapp.com/api";

  constructor(
    private http: HttpClient,
    private apiService: ApiService
  ) {
    this.loadStories();
    this.loadStepDefinitions();
  }

  ngOnInit() {
  }

  public loadStories(){
      this.apiService
        .getStories()
        .subscribe(resp => {
          this.stories = resp;
          console.log('controller: stories loaded', this.stories);
        })
  }

  public loadStepDefinitions(){
    this.apiService
      .getStepDefinitions()
      .subscribe(resp => {
        this.stepDefinitions = resp;
        console.log('controller: stepDefinitions loaded', this.stepDefinitions);
      })
  }

  addScenario (story) {
    let scenario = {
      scenario_id: 125342,
      name: "New Scenario",
      stepDefinitions: [
        {
          given: [],
          when: [],
          then: [],
        }
      ]
    };
    console.log("to add scenario", scenario);
    // this.stories.scenarios.push(scenario);
  };

  addStepToScenario(step) {
    console.log("step to add:", step);
    switch (step.stepType){
      case 'given':
        this.selectedScenario.stepDefinitions[0].given.push(step);
        break;
      case 'when':
        this.selectedScenario.stepDefinitions[0].when.push(step);
        break;
      case 'then':
        this.selectedScenario.stepDefinitions[0].then.push(step);
         break;
      default:
        break;
    }
    console.log("after adding step", this.selectedScenario);


    /*
        // console.log("feature index: ", this.features.indexOf(this.selectedFeature));
        // console.log("scenario index: ", this.features[this.features.indexOf(this.selectedFeature)].scenarios.indexOf(this.selected));

        // console.log("nr:", this.features[this.features.indexOf(this.selectedFeature)].scenarios[this.features[this.features.indexOf(this.selectedFeature)].scenarios.indexOf(this.selected)].given_steps.length);

    let nr: number;
    switch (id){
      case 1:
        nr = this.stories[this.stories.indexOf(this.selectedFeature)].scenarios[this.features[this.features.indexOf(this.selectedFeature)].scenarios.indexOf(this.selectedScenario)].given_steps.length;
        break;
      case 2:
        nr = this.stories[this.stories.indexOf(this.selectedFeature)].scenarios[this.features[this.features.indexOf(this.selectedFeature)].scenarios.indexOf(this.selectedScenario)].when_steps.length;
        break;
      case 3:
        nr = this.stories[this.stories.indexOf(this.selectedFeature)].scenarios[this.features[this.features.indexOf(this.selectedFeature)].scenarios.indexOf(this.selectedScenario)].then_steps.length;
        break;
      default:
        nr = 0;
        break;
    }

    let step =
      {
        id: ( nr + 1),
        type: type,
        name: name,
        value: ['', '', '']
      };

    switch (id){
      case 1:
        this.stories[this.stories.indexOf(this.selectedFeature)].scenarios[this.stories[this.stories.indexOf(this.selectedFeature)].scenarios.indexOf(this.selectedScenario)].given_steps.push(step);
        break;
      case 2:
        this.stories[this.stories.indexOf(this.selectedFeature)].scenarios[this.stories[this.stories.indexOf(this.selectedFeature)].scenarios.indexOf(this.selectedScenario)].when_steps.push(step);
        break;
      case 3:
        this.stories[this.stories.indexOf(this.selectedFeature)].scenarios[this.stories[this.stories.indexOf(this.selectedFeature)].scenarios.indexOf(this.selectedScenario)].then_steps.push(step);
        break;
    }
    */
  }

  renameScenario(story_ID, scenario) {

  };

  deleteScenario(feature, scenario) {
    this.stories[feature.id-1].scenarios.splice(this.stories[feature.id-1].scenarios.indexOf(scenario), 1);
    this.showEditor = false;
  };

  lockEditor(){
    if(this.editorLocked == false){
      this.editorLocked = true;
    } else {
      this.editorLocked = false;
    }
  }

  selectScenario(storyID, scenario) {
    this.selectedScenario = scenario;
    this.selectedStory = storyID;
    this.showEditor = true;
    this.editorLocked = true;
    this.clicked = scenario;
    console.log("selected scenario", this.selectedScenario)
    console.log("selected storyID", this.selectedStory)
  };

}
