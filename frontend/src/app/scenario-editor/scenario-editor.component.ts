import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../Services/api.service';
import { getComponentViewDefinitionFactory } from '@angular/core/src/view';
import { TestBed } from '@angular/core/testing';
import { Chart } from 'chart.js';


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
  showChart = false;
  editorLocked = true;
  reportingChart;
  inputVariable = false;
  err_msg = [];
  exampleList: string[] = [];
  
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
        /*for(var j = this.selectedScenario.stepDefinitions.example.length ;j <this.selectedScenario.stepDefinitions.example.length + 3; j++ ){
             this.selectedScenario.stepDefinitions.example.push(new_step);
             this.selectedScenario.stepDefinitions.example[j].values.push("");
        }*/

        for (var i = 0; i < 3; i++){
          this.addStep(step);
          var len = this.selectedScenario.stepDefinitions.example[0].values.length;
          console.log('len: ' + len);
          for(var j = 1 ; j < len; j++){
            console.log('example length: ' + this.selectedScenario.stepDefinitions.example.length)
            this.selectedScenario.stepDefinitions.example[this.selectedScenario.stepDefinitions.example.length - 1].values.push("");
            console.log("j: " + j);
          }
        }

         /*for(var i = 0; i < 3; i++){
           for(var j = 0; j < this.exampleList.length; j++){
            this.addStep(step, i, j);
           } 
          }*/
      break;
      default:
        break;
    }
    console.log('added step', new_step);
  }  

  addStep(step){
    var new_id = this.getLastIDinStep(this.selectedScenario.stepDefinitions, step.stepType) + 1;
    var new_step = {
      id: new_id,
      label: step.label,
      mid: step.mid,
      pre: step.pre,
      stepType: step.stepType,
      type: step.type,
      values: [""]
    }
    this.selectedScenario.stepDefinitions.example.push(new_step);

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

  addToValues(input: string, stepType,step, index, valueIndex? ) {
    if(input.startsWith("<") && input.endsWith('>')){
      var cutInput = input.substr(1,input.length-2)
      if(!this.exampleList.includes(cutInput)){
        this.exampleList.push(cutInput);
        this.handleExamples(cutInput, step);
        console.log("exampleList length: " + this.exampleList.length);
      }
    }
    console.log("add to values: " + input);
    switch (stepType) {
      case 'given':
        //this.handleChangedExamples(this.selectedScenario.stepDefinitions.given[index].values, input)
        this.selectedScenario.stepDefinitions.given[index].values[0] = input;
        break;
      case 'when':
        console.log(this.selectedScenario.stepDefinitions)
        //this.handleChangedExamples(this.selectedScenario.stepDefinitions.when[index].values, input)
        this.selectedScenario.stepDefinitions.when[index].values[0] = input;
        break;
      case 'then':
      console.log('index: ' + index)
      console.log('valueindex: ' + valueIndex)

      console.log('scenario: ' + this.selectedScenario.stepDefinitions.then[index])
        //this.handleChangedExamples(this.selectedScenario.stepDefinitions.then[index].values, input)
        this.selectedScenario.stepDefinitions.then[index].values[0] = input;
        break;
      case 'example':
        this.selectedScenario.stepDefinitions.example[index].values[valueIndex] = input;
        break;
    }
  }


  /*handleChangedExamples(list, input){
    if(input.startsWith("<") && input.endsWith('>') && list[0] != input && list[0] != undefined){
      this.selectedScenario.stepDefinitions.example[0].values.array.forEach(element => {
        if(element == list[0]){
          element = input.substr(1,input.length-2)
        }
      });
      this.exampleList.forEach(element => {
        if(element == list[0]){
          element = input.substr(1,input.length-2)
        }
      });
    }
    
  }*/

 async handleExamples(cutInput,step){
      var i = 0;
      if(!this.inputVariable){
        for(var i = 0; i < 3; i++){
          await this.addStep(step);
         }
        this.selectedScenario.stepDefinitions.example[0].values[0] = (cutInput);
     }else{
        this.selectedScenario.stepDefinitions.example[0].values.push(cutInput);
        
        for(var j = 1;j <this.selectedScenario.stepDefinitions.example.length; j++ ){
          this.selectedScenario.stepDefinitions.example[j].values.push("");
        }
     }
     this.inputVariable = true;
  }

  getValues(values: string[]){
    console.log(values.length)
    if(values.length <= 1 ){
      return['b','d','q']
    }else return values;
  }

  getValue(i, values: string[]) {
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
    this.showChart = false;
    this.reportingChart = undefined;
    this.showEditor = true;
    this.editorLocked = true;
    console.log('selected scenario', this.selectedScenario);
    console.log('selected storyID', this.selectedStory);
  }

  selectStory(story) {
    this.reportingChart = undefined;
    this.showChart = false;
    this.selectedStory = story;
    this.showEditor = false;
    this.editorLocked = true;
    console.log('selected storyID', this.selectedStory);
  }

  //Make the API Request to run the tests and display the results as a chart
  runTests() {
    //This is unused until cucumber actually replies with real data
    //this.apiService.runTests(scenario).subscribe(resp =>console.log(resp));
    this.apiService
      .runTests(this.selectedStory.story_id, this.selectedScenario.scenario_id)
      .subscribe(resp => {
        this.reportingChart = resp;   

          console.log("This is the response: " + resp);
          /*var data = {
            datasets: [{
                data: [resp.failed, resp.successfull, resp.not_implemented,resp.not_executed],
                backgroundColor: [
                  'rgba(239, 21, 14, 1)',
                  'rgba(31, 196, 53, 1)',
                  'rgba(239, 205, 14,1)',
                  'rgba(0,0,0,0.2)'
              ],
            }],
        
            // These labels appear in the legend and in the tooltips when hovering different arcs
            labels: [
                'Failed',
                'Successfull',
                'Not Implemented',
                'Not executed'
            ],
            
        };
        this.reportingChart = new Chart('canvas', {
            type: 'doughnut', 
            data: data
        });
        this.err_msg = resp.err_msg;*/
        this.showChart = true;
        })
      }

  hideChart() {
    this.showChart = !this.showChart;
  }

}



