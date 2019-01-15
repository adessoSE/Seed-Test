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
            console.log('controller: update scenario:', resp);
        });
  }

  addScenario(storyID) {
      this.apiService
          .addScenario(storyID)
          .subscribe(resp => {
            console.log('controller: stepDefinitions loaded', storyID);
            const indexStory: number = this.stories.indexOf(this.selectedStory);
            console.log('storyIDs same?', (storyID === this.selectedStory.story_id));
              if (indexStory !== -1) {
                  this.stories[indexStory].scenarios.push(resp);
            }
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

  addStepToScenario(step) {
    console.log('step to add:', step);
    switch (step.stepType) {
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
    console.log('after adding step', this.selectedScenario);
  }

  removeStepToScenario(event, stepDefTypeID, index) {
      console.log('remove step in ' + stepDefTypeID + ' on index ' + index);
      switch (stepDefTypeID) {
          case 1:
              this.selectedScenario.stepDefinitions[0].given.splice(index, 1);
              break;
          case 2:
              this.selectedScenario.stepDefinitions[0].when.splice(index, 1);
              break;
          case 3:
              this.selectedScenario.stepDefinitions[0].then.splice(index, 1);
              break;
      }
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
