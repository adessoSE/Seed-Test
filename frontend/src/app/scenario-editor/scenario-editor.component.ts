import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../Services/api.service';
import { getComponentViewDefinitionFactory } from '@angular/core/src/view';
import { TestBed } from '@angular/core/testing';
import { Chart } from 'chart.js';
import {saveAs} from 'file-saver';


@Component({
  selector: 'app-scenario-editor',
  templateUrl: './scenario-editor.component.html',
  styleUrls: ['./scenario-editor.component.css'],
})
export class ScenarioEditorComponent implements OnInit {
  stories;
  stepDefinitions;
  selectedStory;
  selectedScenario;
  showEditor = false;
  showResults = false;
  editorLocked = true;
  reportingChart;
  testDone: boolean = false;
  uncutInputs: string[] = [];

  constructor(
    private http: HttpClient,
    private apiService: ApiService,
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

  addStepToScenario(storyID, step) {
    if(!this.editorLocked){
      var new_id = this.getLastIDinStep(this.selectedScenario.stepDefinitions, step.stepType) + 1;
      console.log('step to add:', step);
      var new_step = {
        id: new_id,
        label: step.label,
        mid: step.mid,
       pre: step.pre,
       stepType: step.stepType,
       type: step.type,
       values: [""]
     }
     switch (new_step.stepType) {
       case 'given':
         this.selectedScenario.stepDefinitions.given.push(new_step);
         break;
       case 'when':
         this.selectedScenario.stepDefinitions.when.push(new_step);
         break;
       case 'then':
         this.selectedScenario.stepDefinitions.then.push(new_step);
         break;
       case 'example':
           this.addStep(step);
           var len = this.selectedScenario.stepDefinitions.example[0].values.length;
           for(var j = 1 ; j < len; j++){
             this.selectedScenario.stepDefinitions.example[this.selectedScenario.stepDefinitions.example.length - 1].values.push("");
           }
       break;
       default:
         break;
      }
     console.log('added step', new_step);
    }
  }  

  addStepToBackground(storyID, step){
    console.log("step type: " + step.stepType);
    if(!this.editorLocked){
      var new_id = this.getLastIDinStep(this.selectedStory.background.stepDefinitions, step.stepType) + 1;
      console.log('step to add:', step);
      var new_step = {
        id: new_id,
        label: step.label,
        mid: step.mid,
       pre: step.pre,
       stepType: step.stepType,
       type: step.type,
       values: [""]
     }
     switch (new_step.stepType) {
       case 'when':
         this.selectedStory.background.stepDefinitions.when.push(new_step);
         break;
       default:
         break;
      }
     console.log('added step', new_step);
    }
  }

  addStep(step){
    var new_id = this.getLastIDinStep(this.selectedScenario.stepDefinitions, step.stepType) + 1;
    var new_step = {
      id: new_id,
      label: step.label,
      mid: step.mid,
      pre: step.pre,
      stepType: 'example',
      type: step.type,
      values: ['']
    }
    this.selectedScenario.stepDefinitions.example.push(new_step);
    console.log('newID: ' + new_id);
  }

  getLastIDinStep(stepDefs, stepType) {
    switch (stepType) {
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

  buildID(stepType): number {
    if (stepType.length !== 0) {
      return stepType[stepType.length - 1].id;
    } else {
      return 0;
    }
  }

  removeStepToScenario(event, stepDefType, index) {
    console.log('remove step in ' + stepDefType + ' on index ' + index);
    console.log(stepDefType);
    switch (stepDefType) {
      case 'given':
        this.selectedScenario.stepDefinitions.given.splice(index, 1);
        break;
      case 'when':
        this.selectedScenario.stepDefinitions.when.splice(index, 1);
        break;
      case 'then':
        this.selectedScenario.stepDefinitions.then.splice(index, 1);
        break;
      case 'example':
        this.selectedScenario.stepDefinitions.example.splice(index, 1);
        break;
    }
  }


  keysList(stepDefs) {
    if (stepDefs != null) {
      console.log('keys: ' + Object.keys(stepDefs));
      return Object.keys(stepDefs);
    } else {
      console.log("No Step Definitions found!");
      return "";
    }
  }

  stepsList(stepDefs, i: number) {
    if (i == 0) {
      
      return stepDefs.given;
    } else if (i == 1) {
      return stepDefs.when;
    } else if (i == 2){
      return stepDefs.then;
    }else{
      return stepDefs.example;
    }
  }

  backgroundList(stepDefinitions){
    return stepDefinitions.when;
  }

  async addToValues(input: string, stepType,step, index, valueIndex? ) {
    
    await this.checkForExamples(input,step);

    console.log("steptype: " + stepType)
    console.log("add to values: " + input);
    switch (stepType) {
      case 'given':
        this.selectedScenario.stepDefinitions.given[index].values[0] = input;
        break;
      case 'when':
        this.selectedScenario.stepDefinitions.when[index].values[0] = input;
        break;
      case 'then':
        this.selectedScenario.stepDefinitions.then[index].values[0] = input;
        break;
      case 'example':
        this.selectedScenario.stepDefinitions.example[index].values[valueIndex] = input;
        break;
    }
  }


  checkForExamples(input, step){
    //removes example if new input is not in example syntax < >
    if(step.values[0].startsWith("<") && step.values[0].endsWith('>') && !input.startsWith("<") && !input.endsWith('>')){
      var cutOld = step.values[0].substr(1, step.values[0].length-2);
      this.uncutInputs.splice(this.uncutInputs.indexOf(step.values[0]),1);
      for(var i = 0; i < this.selectedScenario.stepDefinitions.example.length; i++){
        console.log("checkForExamples for i: " + i);
        console.log("step.values[0]: " + step.values[0])
        
        
        this.selectedScenario.stepDefinitions.example[i].values.splice(this.selectedScenario.stepDefinitions.example[0].values.indexOf(cutOld), 1);

        

        if(this.selectedScenario.stepDefinitions.example[0].values.length == 0){

          this.selectedScenario.stepDefinitions.example.splice(0,this.selectedScenario.stepDefinitions.example.length);

        }
      }
    }
    //if input has < > and it is a new unique input
    if(input.startsWith("<") && input.endsWith('>') && (this.selectedScenario.stepDefinitions.example[0] == undefined || !this.uncutInputs.includes(input))){
        this.uncutInputs.push(input);
        var cutInput = input.substr(1, input.length-2);
        this.handleExamples(input, cutInput, step);
    }
  }

 handleExamples(input, cutInput, step){
   //changes example header name if the name is just changed in step
    if(step.values[0] != input && step.values[0] != '' && step.values[0].startsWith("<") && step.values[0].endsWith('>') && this.selectedScenario.stepDefinitions.example[0] !== undefined ){
      this.selectedScenario.stepDefinitions.example[0].values[this.selectedScenario.stepDefinitions.example[0].values.indexOf(step.values[0].substr(1, step.values[0].length-2))] = cutInput;
      return;
    }
    //for first example creates 3 steps
    if(this.selectedScenario.stepDefinitions.example[0] === undefined){
        for(var i = 0; i < 3; i++){
          this.addStep(step);
         }
        this.selectedScenario.stepDefinitions.example[0].values[0] = (cutInput);
    }else{
      //else just adds as many values to the examples to fill up the table
        this.selectedScenario.stepDefinitions.example[0].values.push(cutInput);
        
        for(var j = 1;j <this.selectedScenario.stepDefinitions.example.length; j++ ){
          this.selectedScenario.stepDefinitions.example[j].values.push("");
        }
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
    this.showResults = false;
    this.reportingChart = undefined;
    this.showEditor = true;
    this.editorLocked = true;
    this.testDone = false;
    console.log('selected scenario', this.selectedScenario);
    console.log('selected storyID', this.selectedStory);
  }

  selectStory(story) {
    this.reportingChart = undefined;
    this.showResults = false;
    this.selectedStory = story;
    this.showEditor = false;
    this.editorLocked = true;
    console.log('selected storyID', this.selectedStory);
  }

  scenarioShiftLeft(){
    var storyIndex = this.stories.indexOf(this.selectedStory);
    console.log("storyIndex: " + storyIndex);
    var scenarioIndex = this.stories[storyIndex].scenarios.indexOf(this.selectedScenario);

    console.log("scenarioIndex: " + scenarioIndex);

    if(this.selectScenario(null, this.stories[storyIndex].scenarios[scenarioIndex - 1]) != undefined)
       this.selectScenario(null, this.stories[storyIndex].scenarios[scenarioIndex - 1])
    else{
      if(this.stories[storyIndex - 1] != undefined){
        this.selectScenario(null, this.stories[storyIndex - 1 ].scenarios[0])
      }
      
    }
  }

  scenarioShiftRight(){
    var storyIndex = this.stories.indexOf(this.selectedStory);
    console.log("storyIndex: " + storyIndex);
    var scenarioIndex = this.stories[storyIndex].scenarios.indexOf(this.selectedScenario);
    
    console.log("scenarioIndex: " + scenarioIndex);
    if(this.selectScenario(null, this.stories[storyIndex].scenarios[scenarioIndex + 1]) != undefined)
       this.selectScenario(null, this.stories[storyIndex].scenarios[scenarioIndex + 1])
    else{
      if(this.stories[storyIndex + 1] != undefined){
        this.selectScenario(null, this.stories[storyIndex + 1 ].scenarios[0])
      }
      
    }
  }

 //Make the API Request to run the tests and display the results as a chart
  runTests() {
    this
    //This is unused until cucumber actually replies with real data
    //this.apiService.runTests(scenario).subscribe(resp =>console.log(resp));
    this.apiService
      .runTests(this.selectedStory.story_id, this.selectedScenario.scenario_id)
      .subscribe(resp => {
       this.reportingChart = resp;   
        console.log("This is the response: " + resp);
        this.testDone = true;
        this.showResults = true;
        })
     }

  downloadFile(){
    this.apiService.downloadTestResult().subscribe(resp =>{
      saveAs(resp);
   })
  }

  hideResults() {
    this.showResults = !this.showResults;
  }

}



