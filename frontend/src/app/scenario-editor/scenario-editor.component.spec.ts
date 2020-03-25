import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ScenarioEditorComponent } from './scenario-editor.component';
import { EditableComponent } from '../editable/editable.component';
import { StoriesBarComponent } from '../stories-bar/stories-bar.component';
import { ExampleTableComponent } from '../example-table/example-table.component';
import {DragDropModule} from '@angular/cdk/drag-drop';
import {MatTableModule} from '@angular/material';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ApiService } from '../Services/api.service';
import { componentNeedsResolution } from '@angular/core/src/metadata/resource_loading';
import { Story } from '../model/Story';
import { Scenario } from '../model/Scenario';
import { StepDefinitionBackground } from '../model/StepDefinitionBackground';
import { StepDefinition } from '../model/StepDefinition';
import { StepType } from '../model/StepType';

describe('ScenarioEditorComponent', () => {
  let component: ScenarioEditorComponent;
  let fixture: ComponentFixture<ScenarioEditorComponent>;
  let spy;
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, FormsModule, ReactiveFormsModule, DragDropModule, MatTableModule],
      declarations: [ EditableComponent, ScenarioEditorComponent, StoriesBarComponent, ExampleTableComponent]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ScenarioEditorComponent);
    component = fixture.componentInstance;
    //component.exampleChild = TestBed.createComponent(ExampleTableComponent).componentInstance as ExampleTableComponent;
    fixture.detectChanges();
  });

  //it('should create', () => {
  //  expect(component).toBeTruthy();
  //});

   //it('should create url received', () => {
   //  if(component.apiService.urlReceived){
   //    spy = spyOn(component.apiService, 'getBackendInfo');
   //    expect(spy).toHaveBeenCalled();
   //  } else{
   //    spy = spyOn(component, 'loadStepTypes');
   //    expect(spy).toHaveBeenCalled();
   //  }
   //});


  //describe('removeRowIndex', () => {
  //  it('should remove Row Index', () => {
  //    let scenario : Scenario = {"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}};
  //    //spyOn(component.exampleChild, 'updateTable');
  //    spyOn(component, 'removeStepFromScenario');
  //    component.selectedScenario = scenario;
  //    fixture.componentInstance.removeRowIndex(1);
  //    //expect(component.exampleChild.updateTable).toHaveBeenCalled();
  //    expect(component.removeStepFromScenario).toHaveBeenCalled();
  //  });
  //})
  //describe('set newSelectedStory', () => {
  //  it('should set newSelectedStory', () => {
  //    let story: Story = {"story_id": 123,"background":{"stepDefinitions":{"when":[]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"name":"failed Story creation","comment":"","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number": 7,"state":"open","title":"Story creation"};
  //    fixture.componentInstance.newSelectedStory = story;
  //    expect(component.selectedStory).toBe(story);
  //  });
  //})
//
  //describe('set newSelectedScenario', () => {
  //  it('should set newSelectedScenario without selectScenario', () => {
  //    let scenario : Scenario = {"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}};
  //    spyOn(component, 'selectScenario');
  //    fixture.componentInstance.newSelectedScenario = scenario;
  //    expect(component.selectedScenario).toBe(scenario);
  //    expect(component.selectScenario).not.toHaveBeenCalled();
  //  });
  //
  //  it('should set newSelectedScenario with selectScenario', () => {
  //    let scenario : Scenario = {"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}};
  //    let story: Story = {"story_id": 123,"background":{"stepDefinitions":{"when":[]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number": 7,"state":"open","title":"Story creation"};
  //    component.selectedStory = story;
  //    spyOn(component, 'selectScenario');
  //    fixture.componentInstance.newSelectedScenario = scenario;
  //    expect(component.selectedScenario).toBe(scenario);
  //    expect(component.selectScenario).toHaveBeenCalled();
  //  });
  //})
//
  //
 //
  //describe('getStepsList', () => {
  //  it('should return stepsList', () => {
  //    let stepDefs : StepDefinition = {"given":[],"when":[{"id":1,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":[""]},{"id":2,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":[""]}],"then":[{"id":1,"mid":"","pre":"So I will be navigated to the website:","stepType":"then","type":"Website","values":["<fea>"]}],"example":[{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["fea"]},{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["valueadf"]},{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["value"]}]};
  //    let given, when, then, example;
  //
  //    given = component.getStepsList(stepDefs, 0);
  //    expect(given).toBe(stepDefs.given);
  //
  //    when = component.getStepsList(stepDefs, 1);
  //    expect(when).toBe(stepDefs.when);
  //
  //    then = component.getStepsList(stepDefs, 2);
  //    expect(then).toBe(stepDefs.then);
  //
  //    example = component.getStepsList(stepDefs, 3);
  //    expect(example).toBe(stepDefs.example);
  //  });
  //});
  //
  //describe('getKeysList', () => {
  //  it('should return keysList', () => {
  //    let stepDefs : StepDefinition = {"given":[],"when":[{"id":1,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":[""]},{"id":2,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":[""]}],"then":[{"id":1,"mid":"","pre":"So I will be navigated to the website:","stepType":"then","type":"Website","values":["<fea>"]}],"example":[{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["fea"]},{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["valueadf"]},{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["value"]}]};
  //    let keys;
  //    keys = component.getKeysList(null);
  //    expect(keys).toBe('');
  //
  //    keys = component.getKeysList(stepDefs);
  //    expect(keys).toContain('given');
  //    expect(keys).toContain('when');
  //    expect(keys).toContain('then');
  //    expect(keys).toContain('example');
  //    expect(keys.length).toBe(4);
  //  });
  //})
//
  //describe('loadStepTypes', () => {
  //  it('should load the step types', () => {
  //    let resp: StepType[] = [{"_id":"5d765314aea0c94708a6e0a1","id":0,
  //  "stepType":"given","type":"Role","pre":"As a","mid":"","values":[""],
  //  "selection":["Guest","User"]},
  //  {"_id":"5d765314aea0c94708a6e0a2","id":0,"stepType":"given","type":"Website",
  //  "pre":"I am on the website:","mid":"","values":[""]},
  //  {"_id":"5d765314aea0c94708a6e0a3","id":0,"stepType":"example",
  //  "type":"Add Variable","pre":"","mid":"","values":[""]},
  //  {"_id":"5d765314aea0c94708a6e0a4","id":0,"stepType":"when","type":"Website",
  //  "pre":"I go to the website:","mid":"","values":[""]},
  //  {"_id":"5d765314aea0c94708a6e0a5","id":0,"stepType":"when","type":"Button",
  //  "pre":"I click the button:","mid":"","values":[""]},
  //  {"_id":"5d765314aea0c94708a6e0a6","id":0,"stepType":"when","type":"Field",
  //  "pre":"I insert","mid":"into the field","values":["",""]},
  //  {"_id":"5d765314aea0c94708a6e0a7","id":0,"stepType":"when","type":"Radio",
  //  "pre":"I select ","mid":"from the selection","values":["",""]},
  //  {"_id":"5d765314aea0c94708a6e0a8","id":0,"stepType":"when","type":"Dropdown",
  //  "pre":"I select the option","mid":"from the drop-down-menue","values":["",""]},
  //  {"_id":"5d765314aea0c94708a6e0a9","id":0,"stepType":"when",
  //  "type":"HoverOverAndSelect","pre":"I hover over the element",
  //  "mid":"and select the option","values":["",""]},
  //  {"_id":"5d765314aea0c94708a6e0aa","id":0,"stepType":"when","type":"Checkbox",
  //  "pre":"I select from the","mid":"multiple selection, the values","values":["",""]},
  //  {"_id":"5d765314aea0c94708a6e0ab","id":0,"stepType":"then","type":"Website",
  //  "pre":"So I will be navigated to the website:","mid":"","values":[""]},
  //  {"_id":"5d765314aea0c94708a6e0ac","id":0,"stepType":"then","type":"Text",
  //  "pre":"So I can see the text","mid":"in the textbox:","values":["",""]}];
  //    spyOn(component.apiService, 'getStepTypes').and.returnValue(of(resp));
  //    component.loadStepTypes();
  //    expect(component.apiService.getStepTypes).toHaveBeenCalled();
  //    expect(component.originalStepTypes).toBe(resp);
  //  });
  //});
//
//
//
  //describe('updateScenario', () => {
  //  it('should update the Scenario', () => {
  //    let storyID = 5;
  //    spyOn(component.apiService, 'updateScenario').and.returnValue(of(''));
  //    component.updateScenario(storyID);
  //    expect(component.apiService.updateScenario).toHaveBeenCalled();
  //  });
  //})
//
  //describe('addScenarioToStory', () => {
  //  it('should emit an event to story-editor scenario', () => {
  //    let storyID = 5;
  //    spyOn(component.addScenarioEvent, 'emit');
//
  //    component.addScenarioToStory(storyID);
  //    expect(component.addScenarioEvent.emit).toHaveBeenCalledWith(storyID);
  //  });
  //})
//
//
  //describe('deleteScenario', () => {
  //  it('should delete the Scenario', () => {
  //    let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[]}},"scenarios":[{"scenario_id":1,"name":"successful Story creation","comment":"","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number": 7,"state":"open","title":"Story creation"}];
  //    component.selectedScenario = stories[0].scenarios[0];
  //    spyOn(component.deleteScenarioEvent, 'emit');
  //    component.deleteScenario(component.selectedScenario);
  //    expect(component.deleteScenarioEvent.emit).toHaveBeenCalledWith(component.selectedScenario);
  //  });
  //})
//
  //
  //describe('addStepToScenario', () => {
  //  let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[]}},"scenarios":[{"scenario_id":1,"name":"successful Story creation","comment":"","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[{"_id":"5dce728851e70f2894a170ae","id":"","stepType":"example","type":"Add Variable","pre":"","mid":"","values":["BLUBB"]}]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number": 7,"state":"open","title":"Story creation"}];
  //  beforeEach(() => {
  //    component.selectedScenario = stories[0].scenarios[0];
  //    
  //  });
//
  //  it('should add a given step to the scenario', () => {
  //    let step: StepType = {"_id":"5dce728851e70f2894a170ad","id": 0,"stepType":"given","type":"Website","pre":"I am on the website:","mid":"","values":[""]}
  //    const obj = component.clone( step );
  //    const new_step = {
  //      id: 6,
  //      mid: obj.mid,
  //      pre: obj.pre,
  //      stepType: obj.stepType,
  //      type: obj.type,
  //      values: obj.values
  //   };
  //    spyOn(component, 'clone').and.returnValue(obj);
  //    spyOn(component, 'getLastIDinStep').and.returnValue(5);
//
  //    component.addStepToScenario(1,step);
  //    expect(component.selectedScenario.stepDefinitions.given).toContain(new_step);
  //    expect(component.getLastIDinStep).toHaveBeenCalled();
  //    expect(component.clone).toHaveBeenCalled();
  //  });
//
  //  it('should add a when step to the scenario', () => {
  //    let step: StepType = {"_id":"5dce728851e70f2894a170b0","id": 0,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":[""]}
  //    const obj = component.clone( step );
  //    const new_step = {
  //      id: 6,
  //      mid: obj.mid,
  //      pre: obj.pre,
  //      stepType: obj.stepType,
  //      type: obj.type,
  //      values: obj.values
  //   };
  //    spyOn(component, 'clone').and.returnValue(obj);
  //    spyOn(component, 'createNewStep').and.returnValue(new_step);
  //    component.addStepToScenario(1,step);
  //    expect(component.selectedScenario.stepDefinitions.when).toContain(new_step);
  //    expect(component.createNewStep).toHaveBeenCalled();
  //    expect(component.clone).toHaveBeenCalled();
  //  });
//
  //  it('should add a then step to the scenario', () => {
  //    let step: StepType = {"_id":"5dce728851e70f2894a170b7","id": 0,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["",""]}
  //    const obj = component.clone( step );
  //    const new_step = {
  //      id: 6,
  //      mid: obj.mid,
  //      pre: obj.pre,
  //      stepType: obj.stepType,
  //      type: obj.type,
  //      values: obj.values
  //   };
  //    spyOn(component, 'clone').and.returnValue(obj);
  //    spyOn(component, 'createNewStep').and.returnValue(new_step);
  //    component.addStepToScenario(1,step);
  //    expect(component.selectedScenario.stepDefinitions.then).toContain(new_step);
  //    
  //    expect(component.createNewStep).toHaveBeenCalled();
  //    expect(component.clone).toHaveBeenCalled();
  //  });
  //})
//
 //
//
  //describe('createNewStep', () => {
  //  let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[{"_id":"5dce728851e70f2894a170ae","id":"","stepType":"example","type":"Add Variable","pre":"","mid":"","values":["BLUBB"]}]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number": 7,"state":"open","title":"Story creation"}];
  //  beforeEach(() => {
  //    component.selectedStory = stories[0];
  //    component.selectedScenario = stories[0].scenarios[0];
  //  });
//
  //  it('should add a when step', () => {
  //    let step: StepType = {"_id":"5dce728851e70f2894a170b0","id": 0,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":[""]}
  //    const obj = component.clone( step );
  //    const new_step = {
  //      id: 6,
  //      label: obj.label,
  //      mid: obj.mid,
  //      pre: obj.pre,
  //      stepType: obj.stepType,
  //      type: obj.type,
  //      values: obj.values
  //   };
  //    spyOn(component, 'getLastIDinStep').and.returnValue(5);
  //    let createdNewStep = component.createNewStep(step, component.selectedScenario.stepDefinitions);
  //    expect(component.getLastIDinStep).toHaveBeenCalled();
  //    expect(new_step).toEqual(createdNewStep);
  //  });
//
  //  it('should add a example step', () => {
  //    let step: StepType = {"_id":"5dce728851e70f2894a170b0","id": 0,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":[""]}
  //    const obj = component.clone( step );
  //    const new_step = {
  //      id: 6,
  //      label: obj.label,
  //      mid: obj.mid,
  //      pre: obj.pre,
  //      stepType: 'example',
  //      type: obj.type,
  //      values: ['value']
  //   };
  //   spyOn(component, 'getLastIDinStep').and.returnValue(5);
  //   let createdNewStep = component.createNewStep(step, component.selectedScenario.stepDefinitions, 'example');
  //   expect(component.getLastIDinStep).toHaveBeenCalled();
  //   expect(new_step).toEqual(createdNewStep);
  //  });
  //});
//
  //describe('getLastIDinStep', () => {
  //  it('should return the last id in step given', () => {
  //    let stepDefs : StepDefinition = {"given":[],"when":[{"id":1,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":[""]},{"id":2,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":[""]}],"then":[{"id":1,"mid":"","pre":"So I will be navigated to the website:","stepType":"then","type":"Website","values":["<fea>"]}],"example":[{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["fea"]},{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["valueadf"]},{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["value"]}]};
  //    let stepType = 'given'
  //    let returnNumber = 5;
  //    spyOn(component, 'buildID').and.returnValue(returnNumber);
  //    component.getLastIDinStep(stepDefs, stepType);
  //    expect(component.buildID).toHaveBeenCalled();
  //  });
//
  //  it('should return the last id in step when', () => {
  //    let stepDefs : StepDefinition = {"given":[],"when":[{"id":1,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":[""]},{"id":2,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":[""]}],"then":[{"id":1,"mid":"","pre":"So I will be navigated to the website:","stepType":"then","type":"Website","values":["<fea>"]}],"example":[{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["fea"]},{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["valueadf"]},{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["value"]}]};
  //    let stepType = 'when'
//
  //    let returnNumber = 5;
  //    spyOn(component, 'buildID').and.returnValue(returnNumber);
  //    component.getLastIDinStep(stepDefs, stepType);
  //    expect(component.buildID).toHaveBeenCalled();
  //  });
//
  //  it('should return the last id in step then', () => {
  //    let stepDefs : StepDefinition = {"given":[],"when":[{"id":1,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":[""]},{"id":2,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":[""]}],"then":[{"id":1,"mid":"","pre":"So I will be navigated to the website:","stepType":"then","type":"Website","values":["<fea>"]}],"example":[{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["fea"]},{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["valueadf"]},{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["value"]}]};
  //    let stepType = 'then'
//
  //    let returnNumber = 5;
  //    spyOn(component, 'buildID').and.returnValue(returnNumber);
  //    component.getLastIDinStep(stepDefs, stepType);
  //    expect(component.buildID).toHaveBeenCalled();
  //  });
//
  //  it('should return the last id in step example', () => {
  //    let stepDefs : StepDefinition = {"given":[],"when":[{"id":1,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":[""]},{"id":2,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":[""]}],"then":[{"id":1,"mid":"","pre":"So I will be navigated to the website:","stepType":"then","type":"Website","values":["<fea>"]}],"example":[{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["fea"]},{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["valueadf"]},{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["value"]}]};
  //    let stepType = 'example'
//
  //    let returnNumber = 5;
  //    spyOn(component, 'buildID').and.returnValue(returnNumber);
  //    component.getLastIDinStep(stepDefs, stepType);
  //    expect(component.buildID).toHaveBeenCalled();
  //  });
  //});
//
  //describe('buildID', () => {
  //  it('should return 0', () => {
  //    let stepType = [];
  //    let id = component.buildID(stepType);
  //    expect(id).toBe(0);
  //  })
  //  
  //  it('should return buildID', () => {
  //    let stepType = [{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["User"],"selection":["Guest","User"]},{"id":2,"mid":"","pre":"I am on the website:","stepType":"given","type":"Website","values":["r"]},{"id":3,"mid":"","pre":"I am on the website:","stepType":"given","type":"Website","values":["r"]}]
  //    let id = component.buildID(stepType);
  //    expect(id).toBe(3);
  //  })
  //})
//
  //
//
  //describe('removeStepFromScenario', () => {
  //  beforeEach(() => {
  //    let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number": 7,"state":"open","title":"Story creation"}];
  //    component.selectedStory = stories[0];
  //    component.selectedScenario = stories[0].scenarios[0];
  //  })
//
  //  it('remove step of scenario given', () => {
  //    let stepDefType = 'given';
  //    expect(component.selectedScenario.stepDefinitions.given.length).toBe(1);
  //    component.removeStepFromScenario(stepDefType, 0);
  //    expect(component.selectedScenario.stepDefinitions.given.length).toBe(0);
  //  })
//
  //  it('remove step of scenario when', () => {
  //    let stepDefType = 'when';
  //    expect(component.selectedScenario.stepDefinitions.when.length).toBe(2);
  //    component.removeStepFromScenario(stepDefType, 0);
  //    expect(component.selectedScenario.stepDefinitions.when.length).toBe(1);
  //  })
//
  //  it('remove step of scenario then', () => {
  //    let stepDefType = 'then';
  //    expect(component.selectedScenario.stepDefinitions.then.length).toBe(1);
  //    component.removeStepFromScenario(stepDefType, 0);
  //    expect(component.selectedScenario.stepDefinitions.then.length).toBe(0);
  //  })
//
  //  it('remove step of scenario example', () => {
  //    let stepDefType = 'example';
  //    spyOn(component.exampleChild, 'updateTable');
  //    expect(component.selectedScenario.stepDefinitions.example.length).toBe(0);
  //    component.removeStepFromScenario(stepDefType, 0);
  //    expect(component.selectedScenario.stepDefinitions.example.length).toBe(1);
  //    expect(component.exampleChild.updateTable).toHaveBeenCalled();
  //  })
  //});
//
  //describe('addToValues', () => {
  //  beforeEach(() => {
  //    let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[{"_id":"5dce728851e70f2894a170b0","id":"","stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":[""]}]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[{"values":[]}]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number": 7,"state":"open","title":"Story creation"}];
  //    component.selectedStory = stories[0];
  //    component.selectedScenario = stories[0].scenarios[0];
//
  //  });
//
  //  it('should add hello to given values', () => {
  //    let stepType = 'given'
  //    let step = null;
  //    let stepIndex = 0;
  //    let valueIndex = 0;
  //    let input = 'hello'
  //    spyOn(component, 'checkForExamples');
  //    component.addToValues(input, stepType, step, stepIndex, valueIndex);
  //    expect(component.checkForExamples).toHaveBeenCalled();
  //    expect(component.selectedScenario.stepDefinitions.given[stepIndex].values[valueIndex]).toBe(input);
  //  });
//
  //  it('should add hello to when values', () => {
  //    let stepType = 'when'
  //    let step = null;
  //    let stepIndex = 0;
  //    let valueIndex = 0;
  //    let input = 'hello'
  //    spyOn(component, 'checkForExamples');
  //    component.addToValues(input, stepType, step, stepIndex, valueIndex);
  //    expect(component.checkForExamples).toHaveBeenCalled();
  //    expect(component.selectedScenario.stepDefinitions.when[stepIndex].values[valueIndex]).toBe(input);
  //  });
//
  //  it('should add hello to then values', () => {
  //    let stepType = 'then'
  //    let step = null;
  //    let stepIndex = 0;
  //    let valueIndex = 0;
  //    let input = 'hello'
  //    spyOn(component, 'checkForExamples');
  //    component.addToValues(input, stepType, step, stepIndex, valueIndex);
  //    expect(component.checkForExamples).toHaveBeenCalled();
  //    expect(component.selectedScenario.stepDefinitions.then[stepIndex].values[valueIndex]).toBe(input);
  //  });
//
  //  it('should add hello to example values', () => {
  //    let scenario: Scenario = {"scenario_id":3,"comment":"","name":"Successful Login","stepDefinitions":{"given":[{"id":1,"mid":"","pre":"As a","stepType":"given","type":"Role","values":["Guest"]}],"when":[{"id":1,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":["https://github.com/login?return_to=%2Fjoin%3Fsource%3Dheader-home"]},{"id":2,"mid":"into the field","pre":"I insert","stepType":"when","type":"Field","values":["<userName>","login_field"]},{"id":3,"mid":"into the field","pre":"I insert","stepType":"when","type":"Field","values":["<password>","password"]},{"id":4,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["commit"]}],"then":[{"id":1,"mid":"","pre":"So I will be navigated to the website:","stepType":"then","type":"Website","values":["<website>"]}],"example":[{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["userName","password","website"]},{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["AdorableHamster","cutehamsterlikesnuts2000","https://github.com/"]},{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["NormalHamster","FatHamster123","https://github.com/"]},{"id":6,"mid":"","pre":"","stepType":"example","type":"Add Variable","values":["OldHamster","UglyHamster123","https://github.com/"]}]}};
  //    component.selectedScenario = scenario;
  //    let stepType = 'example'
  //    let step = null;
  //    let stepIndex = 0;
  //    let valueIndex = 0;
  //    let input = 'hello'
  //    spyOn(component, 'checkForExamples');
  //    component.addToValues(input, stepType, step, stepIndex, valueIndex);
  //    expect(component.checkForExamples).toHaveBeenCalled();
  //    expect(component.selectedScenario.stepDefinitions.example[stepIndex].values[valueIndex]).toBe(input);
  //  });
  //});
//
  //describe('checkForExamples', () => {
//
  //  it('should remove Example', () => {
  //    spyOn(component, 'inputRemovedExample').and.returnValue(true);
  //    spyOn(component, 'removeExample');
  //    spyOn(component, 'inputHasExample').and.returnValue(false);
  //    spyOn(component, 'createExample');
  //    component.checkForExamples('', null, null);
//
  //    expect(component.inputRemovedExample).toHaveBeenCalled();
  //    expect(component.removeExample).toHaveBeenCalled();
  //    expect(component.inputHasExample).toHaveBeenCalled();
  //    expect(component.createExample).not.toHaveBeenCalled();
  //  });
//
  //  it('should create Example', () => {
  //    spyOn(component, 'inputRemovedExample').and.returnValue(false);
  //    spyOn(component, 'removeExample');
  //    spyOn(component, 'inputHasExample').and.returnValue(true);
  //    spyOn(component, 'createExample');
  //    component.checkForExamples('', null, null);
//
  //    expect(component.inputRemovedExample).toHaveBeenCalled();
  //    expect(component.removeExample).not.toHaveBeenCalled();
  //    expect(component.inputHasExample).toHaveBeenCalled();
  //    expect(component.createExample).toHaveBeenCalled();
  //  });
//
  //  it('should do nothing', () => {
  //    spyOn(component, 'inputRemovedExample').and.returnValue(false);
  //    spyOn(component, 'removeExample');
  //    spyOn(component, 'inputHasExample').and.returnValue(false);
  //    spyOn(component, 'createExample');
  //    component.checkForExamples('', null, null);
//
  //    expect(component.inputRemovedExample).toHaveBeenCalled();
  //    expect(component.removeExample).not.toHaveBeenCalled();
  //    expect(component.inputHasExample).toHaveBeenCalled();
  //    expect(component.createExample).not.toHaveBeenCalled();
  //  });
//
  //  describe('inputRemovedExample', () => {
  //    it('should return true', () => {
  //      let step: StepType = {
  //        id: 0,
  //        mid: 'string',
  //        pre: 'string',
  //        stepType: 'string',
  //        type: 'string',
  //        values: ['<blubb>']
  //      }
  //      let result = component.inputRemovedExample('test', step, 0);
  //      expect(result).toBe(true);
  //    })
//
  //    it('should return false', () => {
  //      let step: StepType = {
  //        id: 0,
  //        mid: 'string',
  //        pre: 'string',
  //        stepType: 'string',
  //        type: 'string',
  //        values: ['<blubb']
  //      }
  //      let result = component.inputRemovedExample('test', step, 0);
  //      expect(result).toBe(true);
  //    })
//
  //    it('should return false', () => {
  //      let step: StepType = {
  //        id: 0,
  //        mid: 'string',
  //        pre: 'string',
  //        stepType: 'string',
  //        type: 'string',
  //        values: ['blubb>']
  //      }
  //      let result = component.inputRemovedExample('test', step, 0);
  //      expect(result).toBe(true);
  //    })
//
  //    it('should return false', () => {
  //      let step: StepType = {
  //        id: 0,
  //        mid: 'string',
  //        pre: 'string',
  //        stepType: 'string',
  //        type: 'string',
  //        values: ['blubb']
  //      }
  //      let result = component.inputRemovedExample('<test', step, 0);
  //      expect(result).toBe(true);
  //    })
//
  //    it('should return false', () => {
  //      let step: StepType = {
  //        id: 0,
  //        mid: 'string',
  //        pre: 'string',
  //        stepType: 'string',
  //        type: 'string',
  //        values: ['blubb']
  //      }
  //      let result = component.inputRemovedExample('test>', step, 0);
  //      expect(result).toBe(true);
  //    })
//
  //    it('should return false', () => {
  //      let step: StepType = {
  //        id: 0,
  //        mid: 'string',
  //        pre: 'string',
  //        stepType: 'string',
  //        type: 'string',
  //        values: ['blubb']
  //      }
  //      let result = component.inputRemovedExample('test', step, 0);
  //      expect(result).toBe(true);
  //    })
  //  })
//
//
  //  describe('inputHasExample', () => {
  //    let scenario: Scenario = {"scenario_id":3,"comment":"","name":"Successful Login","stepDefinitions":{"given":[{"id":1,"mid":"","pre":"As a","stepType":"given","type":"Role","values":["Guest"]}],"when":[{"id":1,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":["https://github.com/login?return_to=%2Fjoin%3Fsource%3Dheader-home"]},{"id":2,"mid":"into the field","pre":"I insert","stepType":"when","type":"Field","values":["<userName>","login_field"]},{"id":3,"mid":"into the field","pre":"I insert","stepType":"when","type":"Field","values":["<password>","password"]},{"id":4,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["commit"]}],"then":[{"id":1,"mid":"","pre":"So I will be navigated to the website:","stepType":"then","type":"Website","values":["<website>"]}],"example":[{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["userName","password","website"]},{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["AdorableHamster","cutehamsterlikesnuts2000","https://github.com/"]},{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["NormalHamster","FatHamster123","https://github.com/"]},{"id":6,"mid":"","pre":"","stepType":"example","type":"Add Variable","values":["OldHamster","UglyHamster123","https://github.com/"]}]}};
//
  //    beforeEach(() => {
  //      component.selectedScenario = scenario;
  //    })
//
  //    it('should return true', () => {
  //      let input = '<test>'
  //      component.uncutInputs = [];
  //      let result = component.inputHasExample(input);
  //      expect(result).toBe(true);
  //    })
//
//
  //    it('should return false', () => {
  //      let input = 'test'
  //      component.uncutInputs = [];
  //      let result = component.inputHasExample(input);
  //      expect(result).toBe(true);
  //    })
//
  //    it('should return false', () => {
  //      let input = '<test'
  //      component.uncutInputs = [];
  //      let result = component.inputHasExample(input);
  //      expect(result).toBe(true);
  //    })
//
  //    it('should return false', () => {
  //      let input = 'test>'
  //      component.uncutInputs = [];
  //      let result = component.inputHasExample(input);
  //      expect(result).toBe(true);
  //    })
//
  //    it('should return false', () => {
  //      let input = '<test>'
  //      component.uncutInputs = ['<test>'];
  //      let result = component.inputHasExample(input);
  //      expect(result).toBe(true);
  //    })
  //  })
  //})
//
  //describe('createExample', () => {
  //  it('should create examples', () => {
  //    let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[{"_id":"5dce728851e70f2894a170b0","id":"","stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":[""]}]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[{"values":[]}]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number": 7,"state":"open","title":"Story creation"}];
  //    component.selectedStory = stories[0];
  //    component.selectedScenario = stories[0].scenarios[0];
  //    let input = '<test>';
  //    let step: StepType = {"id":5,"mid":"from the drop-down-menue","pre":"I select the option","stepType":"when","type":"Dropdown","values":["","<l>"]};
  //    let valueIndex = 0;
  //    spyOn(component, 'handleExamples');
  //    component.checkForExamples(input, step, valueIndex);
  //    expect(component.handleExamples).toHaveBeenCalled();
  //    expect(component.uncutInputs).toContain(input)
  //  })
  //})
  //  
//describe('removeExample', () => {
  //it('should remove one examples', () => {
  //  let scenario : Scenario = {"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}};
  //  component.selectedScenario = scenario;
  //  let input = 'hallo';
  //  let step = {"id":5,"mid":"from the drop-down-menue","pre":"I select the option","stepType":"given","type":"Dropdown","values":["<l>"]};
  //  let valueIndex = 0;
  //  component.uncutInputs = ['<test>']
  //  expect(component.selectedScenario.stepDefinitions.example.length).toBe(1);
  //  component.checkForExamples(input, step, valueIndex);
  //  expect(component.selectedScenario.stepDefinitions.example.length).toBe(0);
  //  expect(component.uncutInputs).not.toContain(input)
  //});
})//;
//
  //describe('handleExamples', () => {
  //  it('should change example header', () => {
  //    let scenario : Scenario = {"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[{"id":{"$numberInt":"1"},"stepType":"example","type":"Text","pre":"","mid":"","values":["test2","test2"]}]}};
  //    component.selectedScenario = scenario;
  //    let valueIndex = 0
  //    let cutInput = 'test'
  //    let input = '<test>'
  //    spyOn(component, 'handleExamples'). and.returnValue(true);
  //    spyOn(component, 'handleExamples'). and.returnValue(true);
  //    spyOn(component.exampleChild, 'updateTable');
  //    let step: StepType = {"id":5,"mid":"from the drop-down-menue","pre":"I select the option","stepType":"when","type":"Dropdown","values":["","<l>"]};
  //    component.handleExamples(input, cutInput, step ,valueIndex)
  //    expect(this.selectedScenario.stepDefinitions.example[0].values[0]).toEqual(cutInput)
  //    expect(component.exampleHeaderChanged).toHaveBeenCalled();
  //    expect(component.exampleChild.updateTable).toHaveBeenCalled();
//
  //  })
//
  //});
//
  //describe('createFirstExample', () => {
  //  let scenario : Scenario = {"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[{"id":{"$numberInt":"1"},"stepType":"example","type":"Text","pre":"","mid":"","values":["test2","test2"]}]}};
//
  //  beforeEach(() => {
  //    component.selectedScenario = scenario;
  //  })
//
  //  it('executes', () => {
  //    let step: StepType = {"id":5,"mid":"from the drop-down-menue","pre":"I select the option","stepType":"when","type":"Dropdown","values":["","<l>"]};
  //    let cutInput = 'test'
  //    spyOn(component.exampleChild, 'updateTable');
  //    spyOn(component, 'createNewStep');
//
  //    component.createFirstExample(cutInput, step);
  //    expect(component.exampleChild.updateTable).toHaveBeenCalledTimes(2);
  //    expect(component.createNewStep).toHaveBeenCalledTimes(2);
  //    expect(this.selectedScenario.stepDefinitions.example.length).toBe(2)
  //  })
  //})
//
//
  //describe('fillExamples', () => {
  //  let scenario : Scenario = {"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[{"id":{"$numberInt":"1"},"stepType":"example","type":"Text","pre":"","mid":"","values":["test2","test2"]}]}};
//
  //  beforeEach(() => {
  //    component.selectedScenario = scenario;
  //  })
//
  //  it('executes', () => {
  //    let step: StepType = {"id":5,"mid":"from the drop-down-menue","pre":"I select the option","stepType":"when","type":"Dropdown","values":["","<l>"]};
  //    let cutInput = 'test'
  //    spyOn(component, 'createNewStep');
//
  //    component.fillExamples(cutInput, step);
  //    expect(component.createNewStep).toHaveBeenCalledTimes(1);
  //    expect(this.selectedScenario.stepDefinitions.example[0].values.length).toBe(2)
  //  })
  //})
//
//
  //describe('exampleHeaderChanged', () => {
  //  let scenario : Scenario = {"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[{"id":{"$numberInt":"1"},"stepType":"example","type":"Text","pre":"","mid":"","values":["test2","test2"]}]}};
//
  //  beforeEach(() => {
  //    component.selectedScenario = scenario;
  //  })
//
  //  it('returns true', () => {
  //    let input = '<hallo>'
  //    let valueIndex = 0;
  //    let step: StepType = {
  //      id: 0,
  //      mid: 'string',
  //      pre: 'string',
  //      stepType: 'string',
  //      type: 'string',
  //      values: ['<blubb>']
  //    }
  //    let result = component.exampleHeaderChanged(input, step, valueIndex);
  //    expect(result).toBe(true);
  //  })
//
  //  it('returns false', () => {
  //    let input = 'hallo'
  //    let valueIndex = 0;
  //    let step: StepType = {
  //      id: 0,
  //      mid: 'string',
  //      pre: 'string',
  //      stepType: 'string',
  //      type: 'string',
  //      values: ['<blubb>']
  //    }
  //    let result = component.exampleHeaderChanged(input, step, valueIndex);
  //    expect(result).toBe(false);
  //  })
//
  //  it('returns false', () => {
  //    let input = '<hallo>'
  //    let valueIndex = 0;
  //    let step: StepType = {
  //      id: 0,
  //      mid: 'string',
  //      pre: 'string',
  //      stepType: 'string',
  //      type: 'string',
  //      values: ['blubb']
  //    }
  //    let result = component.exampleHeaderChanged(input, step, valueIndex);
  //    expect(result).toBe(false);
  //  })
  //})
//
//
//
  //describe('renameScenario', () => {
  //  let scenario: Scenario = {"scenario_id":3,"comment":"","name":"Successful Login","stepDefinitions":{"given":[{"id":1,"mid":"","pre":"As a","stepType":"given","type":"Role","values":["Guest"]}],"when":[{"id":1,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":["https://github.com/login?return_to=%2Fjoin%3Fsource%3Dheader-home"]},{"id":2,"mid":"into the field","pre":"I insert","stepType":"when","type":"Field","values":["<userName>","login_field"]},{"id":3,"mid":"into the field","pre":"I insert","stepType":"when","type":"Field","values":["<password>","password"]},{"id":4,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["commit"]}],"then":[{"id":1,"mid":"","pre":"So I will be navigated to the website:","stepType":"then","type":"Website","values":["<website>"]}],"example":[{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["userName","password","website"]},{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["AdorableHamster","cutehamsterlikesnuts2000","https://github.com/"]},{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["NormalHamster","FatHamster123","https://github.com/"]},{"id":6,"mid":"","pre":"","stepType":"example","type":"Add Variable","values":["OldHamster","UglyHamster123","https://github.com/"]}]}};
//
  //  beforeEach(() => {
  //    component.selectedScenario = scenario;
  //  })
  //  it('should name the Scenario Donald', () => {
  //    let name = 'Donald';
  //    expect(component.selectedScenario.name).toBe('Successful Login')
  //    component.renameScenario(null, name);
  //    expect(component.selectedScenario.name).toBe(name);
  //  });
//
  //  it('should not rename with null or undefined', () => {
  //    let name = undefined;
  //    expect(component.selectedScenario.name).toBe('Donald')
  //    component.renameScenario(null, name);
  //    expect(component.selectedScenario.name).toBe('Donald');
  //  });
  //})
//
  //describe('selectScenario', () => {
  //  it('should select the Scenario', () => {
  //    let scenario: Scenario = {"scenario_id":3,"comment":"","name":"Successful Login","stepDefinitions":{"given":[{"id":1,"mid":"","pre":"As a","stepType":"given","type":"Role","values":["Guest"]}],"when":[{"id":1,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":["https://github.com/login?return_to=%2Fjoin%3Fsource%3Dheader-home"]},{"id":2,"mid":"into the field","pre":"I insert","stepType":"when","type":"Field","values":["<userName>","login_field"]},{"id":3,"mid":"into the field","pre":"I insert","stepType":"when","type":"Field","values":["<password>","password"]},{"id":4,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["commit"]}],"then":[{"id":1,"mid":"","pre":"So I will be navigated to the website:","stepType":"then","type":"Website","values":["<website>"]}],"example":[{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["userName","password","website"]},{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["AdorableHamster","cutehamsterlikesnuts2000","https://github.com/"]},{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["NormalHamster","FatHamster123","https://github.com/"]},{"id":6,"mid":"","pre":"","stepType":"example","type":"Add Variable","values":["OldHamster","UglyHamster123","https://github.com/"]}]}};
  //    spyOn(component, 'checkArrowLeft').and.returnValue(true);
  //    spyOn(component, 'checkArrowRight').and.returnValue(true);
//
  //    component.selectScenario(scenario);
  //    expect(component.selectedScenario).toBe(scenario);
  //    expect(component.checkArrowLeft).toHaveBeenCalled();
  //    expect(component.checkArrowRight).toHaveBeenCalled();
//
  //  });
  //});
//
//
//
  //describe('checkArrowLeft', () => {
  //  let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[{"_id":"5dce728851e70f2894a170b0","id":"","stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":[]}]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["<Guest>"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[{"id":6,"mid":"","pre":"","stepType":"example","type":"Add Variable","values":["OldHamster"]}]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[{"values":[]}]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number": 7,"state":"open","title":"Story creation"}];
//
  //  it('should return false', () => {
  //    component.selectedStory = stories[0];
  //    component.selectedScenario = stories[0].scenarios[1];
  //    let left = component.checkArrowLeft();
  //    expect(left).toBe(false);
  //  });
//
  //  it('should return true', () => {
  //    component.selectedStory = stories[0];
  //    component.selectedScenario = stories[0].scenarios[0];
  //    let left = component.checkArrowLeft();
  //    expect(left).toBe(true);
  //  });
  //});
//
  //describe('checkArrowRight', () => {
  //  let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[{"_id":"5dce728851e70f2894a170b0","id":"","stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":[]}]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["<Guest>"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[{"id":6,"mid":"","pre":"","stepType":"example","type":"Add Variable","values":["OldHamster"]}]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[{"values":[]}]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number": 7,"state":"open","title":"Story creation"}];
//
  //  it('should return true', () => {
  //    component.selectedStory = stories[0];
  //    component.selectedScenario = stories[0].scenarios[1];
  //    let right = component.checkArrowRight();
  //    expect(right).toBe(true);
  //  });
//
  //  it('should return false', () => {
  //    component.selectedStory = stories[0];
  //    component.selectedScenario = stories[0].scenarios[0];
  //    let right = component.checkArrowRight();
  //    expect(right).toBe(false);
  //  });
  //});
//
  //describe('scenarioShiftLeft', () => {
  //  let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[{"_id":"5dce728851e70f2894a170b0","id":"","stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":[]}]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["<Guest>"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[{"id":6,"mid":"","pre":"","stepType":"example","type":"Add Variable","values":["OldHamster"]}]}},{"scenario_id":3,"name":"failed Story creation","comment":"","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[{"values":[]}]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number": 7,"state":"open","title":"Story creation"}];
//
  //  it('should shift left', () => {
  //    component.selectedStory = stories[0];
  //    component.selectedScenario = stories[0].scenarios[1];
  //    spyOn(component, 'selectScenario');
  //    component.scenarioShiftLeft();
  //    expect(component.selectScenario).toHaveBeenCalled();
  //  });
//
  //  it('should not shift left', () => {
  //    component.selectedStory = stories[0];
  //    component.selectedScenario = stories[0].scenarios[0];
  //    spyOn(component, 'selectScenario');
  //    component.scenarioShiftLeft();
  //    expect(component.selectScenario).not.toHaveBeenCalled();
  //  });
  //});
//
  //describe('scenarioShiftRight', () => {
  //  let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[{"_id":"5dce728851e70f2894a170b0","id":"","stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":[]}]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["<Guest>"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[{"id":6,"mid":"","pre":"","stepType":"example","type":"Add Variable","values":["OldHamster"]}]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[{"values":[]}]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number": 7,"state":"open","title":"Story creation"}];
//
  //  it('should shift right', () => {
  //    component.selectedStory = stories[0];
  //    component.selectedScenario = stories[0].scenarios[0];
  //    spyOn(component, 'selectScenario');
  //    component.scenarioShiftRight();
  //    expect(component.selectScenario).toHaveBeenCalled();
  //  });
//
  //  it('should not shift right', () => {
  //    component.selectedStory = stories[0];
  //    component.selectedScenario = stories[0].scenarios[1];
  //    spyOn(component, 'selectScenario');
  //    component.scenarioShiftRight();
  //    expect(component.selectScenario).not.toHaveBeenCalled();
  //  });
  //});

  //describe('runTestScenario', () => {
  //
  //  it('emit runTestScenarioEvent run tests', () => {
  //    spyOn(component.runTestScenarioEvent, 'emit');
  //    component.runTestScenario(1,1);
  //    expect(component.runTestScenarioEvent.emit).toHaveBeenCalledWith({storyId: 1, scenarioId: 1});
    //
  //  });
  //});
  //
  //describe('undefined_definition', () => {
  //
  //});




//});
