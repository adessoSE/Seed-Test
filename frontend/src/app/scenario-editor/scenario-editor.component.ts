import { Component, OnInit } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {ApiService} from '../Services/api.service';
@Component({
  selector: 'app-scenario-editor',
  templateUrl: './scenario-editor.component.html',
  styleUrls: ['./scenario-editor.component.css']
})


export class ScenarioEditorComponent implements OnInit {
  stories;
  stepDefinitions;
  selectedStory;
  selectedScenario;
  showEditor = false;
  editorLocked = true;
  

  constructor(
    private http: HttpClient,
    private apiService: ApiService
  ) {
    this.loadStories();
    this.loadStepDefinitions();
  }

  ngOnInit() {
  }

  loadStories() {
      this.apiService
        .getStories()
        .subscribe(resp => {
          this.stories = resp;
          console.log('controller: stories loaded', this.stories);
        });
  }

  loadStepDefinitions() {
    this.apiService
        .getStepDefinitions()
        .subscribe(resp => {
            this.stepDefinitions = resp;
            console.log('controller: stepDefinitions loaded', this.stepDefinitions);
        });
  }

  updateScenario(storyID) {
    this.apiService
        .updateScenario(storyID, this.selectedScenario)
        .subscribe(resp => {
            console.log('controller:  scenario:', resp);
        });
  }

  addScenario(storyID) {
      this.apiService
          .addScenario(storyID)
          .subscribe(resp => {
            console.log('controller: stepDefinitions loaded', storyID);
            console.log('storyIDs same?', (storyID === this.selectedStory.story_id));
            this.stories[this.stories.indexOf(this.selectedStory)].scenarios.push(resp);
      });
  }

  deleteScenario(event) {
    this.apiService
        .deleteScenario(this.selectedStory.story_id, this.selectedScenario)
        .subscribe(resp => {
            console.log('controller: delete scenario', resp);
            this.showEditor = false;

            const indexStory: number = this.stories.indexOf(this.selectedStory);
            const indexScenario: number = this.stories[indexStory].scenarios.indexOf(this.selectedScenario);
            if (indexScenario !== -1) {
                this.stories[indexStory].scenarios.splice(indexScenario, 1);
            }
        });
  }

  addStepToScenario(storyID,step) {
    console.log('step to add:', step);
    var new_step = { 
      id : new Date().valueOf(), //Used as the unique ID of a step (produces something like 1549025639350
      label: step.label,
      mid: step.mid,
      pre: step.pre,
      stepType: step.stepType,
      type: step.type,
      values: [""]
    }
    switch (new_step.stepType) {
      case 'given':
        this.selectedScenario.stepDefinitions[0].given.push(new_step);
        break;
      case 'when':
        this.selectedScenario.stepDefinitions[0].when.push(new_step);
        break;
      case 'then':
        this.selectedScenario.stepDefinitions[0].then.push(new_step);
         break;
      default:
        break;
    }
    console.log('added step', new_step);
  }

  removeStepToScenario(event, stepDefType, index) {
      console.log('remove step in ' + stepDefType + ' on index ' + index);
      console.log(stepDefType);
      switch (stepDefType) {
          case 'given':
              this.selectedScenario.stepDefinitions[0].given.splice(index, 1);
              break;
          case 'when':
              this.selectedScenario.stepDefinitions[0].when.splice(index, 1);
              break;
          case 'then':
              this.selectedScenario.stepDefinitions[0].then.splice(index, 1);
              break;
      }
    }
  keysList (stepDefs){
    if (stepDefs != null){
      return Object.keys(stepDefs);
    }else {
      return "";
    }
  }

  stepsList(stepDefs,i:number){
    if (i==0){
      return stepDefs.given;
    }else if (i==1){
      return stepDefs.when;
    }else {
      return stepDefs.then;
    }
  }


  addToValues(input:string,stepType,index){
    switch (stepType){
      case 'given':
          this.selectedScenario.stepDefinitions[0].given[index].values[0]=input;
        break;
      case 'when':
          this.selectedScenario.stepDefinitions[0].when[index].values[0]=input;
      break;
      case 'then':
          this.selectedScenario.stepDefinitions[0].then[index].values[0]=input;
      break;
    }
  }

  getValue (i,values:string[]){
    return values[i];
  }

  renameScenario(event, name) {
      if (name) {
          this.selectedScenario.name = name;
          console.log('controller: changed name of scenario to: ', this.selectedScenario.name);
      }
  }

  lockEditor() {
    if (this.editorLocked === false) {
      this.editorLocked = true;
    } else {
      this.editorLocked = false;
    }
  }

  selectScenario(storyID, scenario) {
    this.selectedScenario = scenario;
    this.showEditor = true;
    this.editorLocked = true;
    console.log('selected scenario', this.selectedScenario);
    console.log('selected storyID', this.selectedStory);
  }

  selectStory(story) {
        this.selectedStory = story;
        this.showEditor = false;
        this.editorLocked = true;
        console.log('selected storyID', this.selectedStory);
    }

}
