import { Component, OnInit, Input, ViewChild, EventEmitter, Output } from '@angular/core';
import { ApiService } from '../Services/api.service';
import {saveAs} from 'file-saver';
import { StepDefinition } from '../model/StepDefinition';
import { Story } from '../model/Story';
import { Scenario } from '../model/Scenario';
import { StepDefinitionBackground } from '../model/StepDefinitionBackground';
import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import { StepType } from '../model/StepType';
import { StoriesBarComponent } from '../stories-bar/stories-bar.component';
import { RepositoryContainer} from '../model/RepositoryContainer';
import { Background } from '../model/Background';
import { ToastrService } from 'ngx-toastr';
import { RunTestToast } from '../custom-toast';

const emptyBackground:Background = {name, stepDefinitions: {when: []}};

@Component({
  selector: 'app-story-editor',
  templateUrl: './story-editor.component.html',
  styleUrls: ['./story-editor.component.css']
})
export class StoryEditorComponent implements OnInit {

  originalStepTypes: StepType[];
  stories: Story[];
  selectedStory: Story;
  selectedScenario: Scenario;
  showEditor = false;
  showResults = false;
  showDescription = false;
  showBackground = false;
  arrowLeft = true;
  arrowRight = true;
  testDone = false;
  testRunning = false;
  htmlReport;
  storiesLoaded = false;
  storiesError = false;
  db = false;
  newStepName = 'New Step';
  runUnsaved = false;
  currentTestStoryId: number;
  currentTestScenarioId: number;
  activeActionBar: boolean = false;
  allChecked: boolean = false;

  @ViewChild('exampleChildView') exampleChild;
  @ViewChild('scenarioChild') scenarioChild;

  constructor(
      public apiService: ApiService,
      private toastr: ToastrService
  ) {
      this.apiService.getStoriesEvent.subscribe((stories: Story[]) => {
          this.storiesLoaded = true;
          this.storiesError = false;
          this.showEditor = false;
          this.setStories(stories);
          this.db = localStorage.getItem('source') === 'db' ;
      });
      this.apiService.storiesErrorEvent.subscribe(errorCode => {
          this.storiesError = true;
          this.showEditor = false;
      });

      this.apiService.getBackendUrlEvent.subscribe(() => {
        this.loadStepTypes();
    });

    if (this.apiService.urlReceived) {
        this.loadStepTypes();
    }
  }

  ngOnInit() {
    this.apiService.runSaveOptionEvent.subscribe(option => {
        if(option == "run"){
            this.runUnsaved = true;
            this.runOption();
        }
        if(option == "saveRun"){
            this.updateBackground()
        }
    })
  }

  runOption(){
      console.log('running')
      let tmpScenarioSaved = this.scenarioChild.scenarioSaved;
      let tmpBackgroundSaved = this.selectedStory.background.saved;
      this.scenarioChild.scenarioSaved = true;
      this.selectedStory.background.saved = true;
      this.runTests(this.currentTestScenarioId);
      this.scenarioChild.scenarioSaved = tmpScenarioSaved;
      this.selectedStory.background.saved = tmpBackgroundSaved;
  }



  setStories(stories: Story[]) {
      this.stories = stories;
  }

  @Input() storiesBar: StoriesBarComponent;

  @Input()
  set newSelectedScenario(scenario: Scenario) {
      this.selectedScenario = scenario;
      if (this.selectedStory) {
          this.selectScenario(scenario);
      }
      this.activeActionBar = false;
      this.allChecked = false;
  }

  @Input()
  set newSelectedStory(story: Story) {
      this.selectedStory = story;
      this.showEditor = true;
      this.activeActionBar = false;
      this.allChecked =false;
  }

  @Input() 

  loadStepTypes() {
    this.apiService
        .getStepTypes()
        .subscribe((resp: StepType[]) => {
            this.originalStepTypes = resp;
        });
    }

    checkAllSteps(event, checkValue: boolean){
        if(checkValue!= null){
            this.allChecked = checkValue;
        }else{
            this.allChecked = !this.allChecked;
        }
        if(this.allChecked){
            for (let prop in this.selectedStory.background.stepDefinitions) {
                for (var i = this.selectedStory.background.stepDefinitions[prop].length - 1; i >= 0; i--) {
                    this.checkStep(null, this.selectedStory.background.stepDefinitions[prop][i], true)
                }
            }
            this.activeActionBar = true;
            this.allChecked = true;
        }else{
            for (let prop in this.selectedStory.background.stepDefinitions) {
                for (var i = this.selectedStory.background.stepDefinitions[prop].length - 1; i >= 0; i--) {
                    this.checkStep(null, this.selectedStory.background.stepDefinitions[prop][i], false)
                }
            }
            this.activeActionBar = false;
            this.allChecked = false;
        }
    }

    checkStep($event, step, checkValue: boolean){
        if(checkValue != null){
            step.checked = checkValue;
        }else{
            step.checked = !step.checked;
        }
        let checkCount = 0;
        let stepCount = 0;
        
        for (let prop in this.selectedStory.background.stepDefinitions) {
            for (var i = this.selectedStory.background.stepDefinitions[prop].length - 1; i >= 0; i--) {
                stepCount++;
                if(this.selectedStory.background.stepDefinitions[prop][i].checked){
                    checkCount++;
                }
            }
        }
        if(checkCount >= stepCount){
            this.allChecked = true;
        }else{
            this.allChecked = false;
        }
        if(checkCount <= 0){
            this.allChecked = false;
            this.activeActionBar = false;
        }else{
            this.activeActionBar = true
        }
    }

    removeStepFromBackground() {
        for (let prop in this.selectedStory.background.stepDefinitions) {
            for (var i = this.selectedStory.background.stepDefinitions[prop].length - 1; i >= 0; i--) {
                if(this.selectedStory.background.stepDefinitions[prop][i].checked){
                    this.selectedStory.background.stepDefinitions[prop].splice(i, 1)
                }
            }
        }
        this.selectedStory.background.saved = false;
        this.allChecked = false;
        this.activeActionBar = false;
    }

    deactivateStep(){
        for (let prop in this.selectedStory.background.stepDefinitions) {
            for(let s in this.selectedStory.background.stepDefinitions[prop]){
                if(this.selectedStory.background.stepDefinitions[prop][s].checked){
                    this.selectedStory.background.stepDefinitions[prop][s].deactivated = !this.selectedStory.background.stepDefinitions[prop][s].deactivated
                }
            }
    }

        //this.selectedStory.background.stepDefinitions[stepStepType][index].deactivated = !this.selectedStory.background.stepDefinitions[stepStepType][index].deactivated
        this.selectedStory.background.saved = false;
    }

    createnewStory() {
      const title = (document.getElementById('storytitle') as HTMLInputElement).value;
      const description = (document.getElementById('storydescription') as HTMLInputElement).value;
      const value = localStorage.getItem('repository');
      const source = 'db';
      const repositorycontainer: RepositoryContainer = {value, source};
      this.apiService.createStory(title, description, value).subscribe(resp => {
          console.log(resp);
          this.apiService.getStories(repositorycontainer).subscribe((resp: Story[]) => {
              console.log('Stories');
              console.log(resp);
              this.stories = resp;
          });
      });
    }


    inputSize(event){
        let inputField = event.target;
        inputField.style.width = (inputField.value.length) * 9 + "px";
    }

  //from Scenario deleteScenarioEvent
  deleteScenario(scenario: Scenario){
    this.apiService
        .deleteScenario(this.selectedStory.story_id, this.selectedStory.storySource, scenario)
        .subscribe(resp => {
            this.scenarioDeleted();
            this.toastr.error('', 'Scenario deleted')
        });
  }

  scenarioDeleted(){
    const indexScenario: number = this.selectedStory.scenarios.indexOf(this.selectedScenario);
    if(indexScenario !== -1){
        this.selectedStory.scenarios.splice(indexScenario, 1)
    }
    this.showEditor = false;
  }

  addScenario(){
    this.apiService.addScenario(this.selectedStory.story_id, this.selectedStory.storySource)
        .subscribe((resp: Scenario) => {
           this.selectScenario(resp);
           this.selectedStory.scenarios.push(resp);
           this.storiesBar.selectScenario(null, resp)
           this.toastr.info('', 'Senario added')
        });
  }

  onDropBackground(event: CdkDragDrop<any>, stepDefs: StepDefinition) {
      moveItemInArray(this.getBackgroundList(stepDefs), event.previousIndex, event.currentIndex);
  }

  getBackgroundList(stepDefinitions: StepDefinitionBackground) {
      return stepDefinitions.when;
  }


  backgroundNameChange(name: string) {
      this.selectedStory.background.name = name;
  }

  updateBackground() {
    delete this.selectedStory.background.saved;

    Object.keys(this.selectedStory.background.stepDefinitions).forEach((key, index) => {
        this.selectedStory.background.stepDefinitions[key].forEach((step: StepType) => {
            if(step.outdated){
                step.outdated = false;
            }
        })
    })
      this.apiService
          .updateBackground(this.selectedStory.story_id, this.selectedStory.storySource, this.selectedStory.background)
          .subscribe(resp => {
            this.toastr.success('successfully saved', 'Background')
            this.apiService.runSaveOption('saveScenario')
          });
  }

  deleteBackground() {
      this.apiService
          .deleteBackground(this.selectedStory.story_id, this.selectedStory.storySource)
          .subscribe(resp => {
              this.backgroundDeleted();
          });
  }

  backgroundDeleted(){
      this.showBackground = false;
      this.selectedStory.background = emptyBackground;
      this.selectedStory.background.saved = false;
  }

  openDescription() {
      this.showDescription = !this.showDescription;
  }

  openBackground() {
      this.showBackground = !this.showBackground;
  }

  addStepToBackground(storyID: string, step: StepType) {
      const newStep = this.createNewStep(step, this.selectedStory.background.stepDefinitions)
      if (newStep.stepType == 'when') {
          this.selectedStory.background.stepDefinitions.when.push(newStep);
      }
      this.selectedStory.background.saved = false;
  }

  createNewStep(step: StepType, stepDefinitions: StepDefinitionBackground): StepType{
      const obj = this.clone(step);
      const newId = this.getLastIDinStep(stepDefinitions, obj.stepType) + 1;
      const newStep: StepType = {
          id: newId,
          mid: obj.mid,
          pre: obj.pre,
          stepType: obj.stepType,
          type: obj.type,
          values: obj.values
      };
      return newStep;
  }

  getLastIDinStep(stepDefs: any, stepStepType: string): number {
      switch (stepStepType) {
          case 'given':
              return this.buildID(stepDefs.given);
          case 'when':
              return this.buildID(stepDefs.when);
          case 'then':
              return this.buildID(stepDefs.then);
          case 'example':
              return this.buildID(stepDefs.example);
      }
  }

  buildID(step): number {
      if (step.length !== 0) {
          return step[step.length - 1].id;
      } else {
          return 0;
      }
  }


  addToValuesBackground(input: string, stepIndex: number, valueIndex: number) {
      this.selectedStory.background.stepDefinitions.when[stepIndex].values[valueIndex] = input;
      this.selectedStory.background.saved = false;
  }

  selectScenario(scenario: Scenario) {
      this.selectedScenario = scenario;
      this.showResults = false;
      this.showEditor = true;
      this.testDone = false;
  }


  selectStoryScenario(story: Story) {
      this.showResults = false;
      this.selectedStory = story;
      this.showEditor = true;
      const storyIndex = this.stories.indexOf(this.selectedStory);
      if (this.stories[storyIndex].scenarios[0] !== undefined) {
          this.selectScenario(this.stories[storyIndex].scenarios[0]);
      }
  }


  undefined_definition(definition){
      let undefined_list = [];
      if(definition !== undefined){
          let given = definition["given"];
          for(let key in given){
              let obj = given[key];
              if (obj["type"] === "Undefined Step"){
                  undefined_list = undefined_list.concat(obj["values"][0]);
              }
          }
          let then = definition["then"];
          for(let key in then){
              let obj = then[key];
              if (obj["type"] === "Undefined Step"){
                  undefined_list = undefined_list.concat(obj["values"][0]);
              }
          }
          let when = definition["when"];
          for(let key in when){
              let obj = when[key];
              if (obj["type"] === "Undefined Step"){
                  undefined_list = undefined_list.concat(obj["values"][0]);
              }
          }
      }
      return undefined_list;
  }

  // Make the API Request to run the tests and display the results as a chart
  runTests(scenario_id) {
    if(this.storySaved()){
        this.testRunning = true;
        const iframe: HTMLIFrameElement = document.getElementById('testFrame') as HTMLIFrameElement;
        const loadingScreen: HTMLElement = document.getElementById('loading');
        loadingScreen.scrollIntoView();
        this.apiService
            .runTests(this.selectedStory.story_id, this.selectedStory.storySource, scenario_id)
            .subscribe(resp => {
                iframe.srcdoc = resp;
                // console.log("This is the response: " + resp);
                this.htmlReport = resp;
                this.testDone = true;
                this.showResults = true;
                this.testRunning = false;
                setTimeout(function () {
                    iframe.scrollIntoView();
                }, 10);
                this.toastr.info('', 'Test is done')
                this.runUnsaved = false;
            });
    }else{
        this.currentTestScenarioId = scenario_id;
        this.currentTestStoryId = this.selectedStory.story_id;
        this.toastr.info('Do you want to save before running the test?', 'Scenario was not saved', {
            toastComponent: RunTestToast
        })
    }        
  }

  downloadFile() {
      const blob = new Blob([this.htmlReport], {type: 'text/html'});
      saveAs(blob);
  }

  hideResults() {
      this.showResults = !this.showResults;
  }

  // To bypass call by reference of object properties
  // therefore new objects are created and not the existing object changed
  clone(obj) {
      if (obj == null || typeof (obj) != 'object') {
          return obj;
      }
      const temp = new obj.constructor();
      for (var key in obj) {
          temp[key] = this.clone(obj[key]);
      }

      return temp;
  }

  storySaved(){
    return this.runUnsaved ||((this.scenarioChild.selectedScenario.saved === undefined || this.scenarioChild.selectedScenario.saved) && (this.selectedStory.background.saved === undefined || this.selectedStory.background.saved))
  }

}
