import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ToastrModule } from 'ngx-toastr';
import { Scenario } from '../model/Scenario';
import { StepType } from '../model/StepType';
import { Story } from '../model/Story';
import { BaseEditorComponent } from './base-editor.component';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { StepDefinition } from '../model/StepDefinition';


let stepBackgroundDefinitions: StepDefinition = {"given": [], "when":[{"_id":'5dce728851e70f2894a170b4',"id": 6, "stepType":"when", "type" :"HoverOverAndSelect", "pre":"I hover over the element", "mid":"and select the option","values":["",""], "post":"", "isExample":[]}], "then": [], "example":[]};

let stories : Story[]= [{"story_id": 123,"_id":2,"storySource":"github", "background":
  {"stepDefinitions":{"when":[]}},"scenarios":
  [{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":
  {"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"], "post":"", "isExample":[]}],
  "when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"",
  "values":["www.cucumber.com"],"post":"", "isExample":[]},{"id":2,"stepType":"when","type":"Button",
  "pre":"I click the button:","mid":"","values":["Create Story"],"post":"","isExample":[]}],
  "then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text",
  "mid":"in the textbox:","values":["New Story created","Success"], "post": "", "isExample":[]}],
  "example":[]}},{"scenario_id":3,"comment":"","name":"failed Story creation",
  "stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"",
  "values":["Guest"],"post":"", "isExample":[]}],"when":[{"id":1,"stepType":"when","type":"Website",
  "pre":"I am on the website:","mid":"","values":["www.cucumber.com"],"post":"", "isExample":[]},
  {"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"",
  "values":["Create Story"],"post":"", "isExample":[]}],"then":[{"id":2,"stepType":"then","type":"Text",
  "pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"], 
  "post":"", "isExample":[]}],"example":[{"_id":"5dce728851e70f2894a170ae","id":1,"stepType":"example",
  "type":"Add Variable","pre":"","mid":"","values":["BLUBB"], "post": "", "isExample":[]}]}}],
  "assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4",
  "body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number": 7,"state":"open","title":"Story creation"},
  {"_id": "a","story_id": 123, "storySource": "db","background":{"stepDefinitions":
  {"when":[]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":
  {"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"], "post": "", "isExample":[]}],
  "when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"], "post": "", "isExample":[]},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"], "post": "", "isExample":[]}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"], "post": "", "isExample":[]}],
  "example":[]}},{"scenario_id":3,"name":"failed Story creation","comment":"","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"], "post": "", "isExample":[]}],
  "when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"], "post": "", "isExample":[]},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"], "post": "", "isExample":[]}],
  "then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"], "post":"", "isExample":[]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number": 7,"state":"open","title":"Story creation"}];

const scenarios:Scenario[] = [{scenario_id: 2, name: 'my first scenario', stepDefinitions: {"when":[{"_id":'5dce728851e70f2894a170b4',"id": 6, "stepType":"when", "type" :"HoverOverAndSelect", "pre":"I hover over the element", "mid":"and select the option","values":["",""], "post":"", "isExample":[]}], "given":[{"_id":'5dce728851e70f2894a170b4',"id": 6, "stepType":"when", "type" :"HoverOverAndSelect", "pre":"I hover over the element", "mid":"and select the option","values":["",""], "post":"", "isExample":[]}],"then":[], "example": []},
  comment: 'write some words about this scenario', lastTestPassed: false,
  saved: true, daisyAutoLogout: true, stepWaitTime: 200, browser: 'chromium'}]

describe('BaseEditorComponent', () => {
  let component: BaseEditorComponent;
  let fixture: ComponentFixture<BaseEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BaseEditorComponent ],
      imports: [ToastrModule.forRoot()],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BaseEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  /* TODO: Resolve StepDef dilemma */
  describe('getStepsList', () => {
    it('should return stepsList', () => {
      let when = component.getStepsList(stepBackgroundDefinitions, 1)
      expect(when).toBe(stepBackgroundDefinitions.when);
    });
  });

  describe('addStep', () => {
    beforeEach(() => {
      component.selectedStory = stories[0];
      component.selectedScenario = stories[0].scenarios[0];
    });

    it('should add a when step to the background', fakeAsync(() => {
      let step: StepType = {"_id":"5dce728851e70f2894a170b0","id": 0,"stepType":"when","type":"Button","pre":"I click the button:","mid":"", "post": "","values":[""], "isExample":[]}
      jest.spyOn(component, 'addStep');
      const newStep = component.createNewStep(step, component.selectedStory.background.stepDefinitions);
      component.addStep(step, component.selectedStory, 'background');
      tick();
      expect(component.selectedStory.background.stepDefinitions.when).toContainEqual(newStep);
      expect(component.addStep).toHaveBeenCalled();
    }));
  });

  describe('removeStep', () => {
    it('should remove the step of the background', () => {
      let story : Story= {"story_id": 123, "_id":1, "storySource": "github","background":{"stepDefinitions":{"when":[{"_id":"5dce728851e70f2894a170b0","id":1,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":[""],"post": "", "isExample":[]}]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"post": "", "isExample":[]}],"when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"], "post":"", "isExample":[]},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"],"post":"", "isExample":[]}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"],"post":"", "isExample":[]}],"example":[]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"post":"", "isExample":[]}],"when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"], "post":"", "isExample":[]},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"],"post":"", "isExample":[]}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"],"post":"", "isExample":[]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number": 7,"state":"open","title":"Story creation"};
      component.selectedStory = stories[0];
      expect(component.selectedStory.background.stepDefinitions.when.length).toBe(1);
      component.selectedStory.background.stepDefinitions["when"][0].checked = true;
      component.removeStep();
      expect(component.selectedStory.background.stepDefinitions.when.length).toBe(0);
    })
  })

  describe('addToValues', () => {
    it('should add hello to background values', () => {
      let stories : Story[]= [{"story_id": 123, "_id":1, "storySource": "github","background":{"stepDefinitions":{"when":[{"_id":"5dce728851e70f2894a170b0","id":1,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":[""],"post": "", "isExample":[]}]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"post": "", "isExample":[]}],"when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"], "post":"", "isExample":[]},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"],"post":"", "isExample":[]}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"],"post":"", "isExample":[]}],"example":[]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"post":"", "isExample":[]}],"when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"], "post":"", "isExample":[]},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"],"post":"", "isExample":[]}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"],"post":"", "isExample":[]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number": 7,"state":"open","title":"Story creation"}];
      component.selectedStory = stories[0];
      component.templateName = 'background';
      let stepIndex = 0;
      let valueIndex = 0;
      let input = 'hello';
      let stepType='when';

      component.addToValues(input, stepIndex, valueIndex, stepType);
      expect(component.templateName).toBe('background');
      expect(component.selectedStory.background.stepDefinitions.when[stepIndex].values[valueIndex]).toBe(input);
    });
  });

  describe('addStepToScenario', () => {
    beforeEach(() => {
      component.selectedScenario = scenarios[0];
    });
   
    it('should add a when step', fakeAsync(() => {
      let step: StepType = {"_id":"5dce728851e70f2894a170b0","id": 0,"stepType":"when","type":"Button","pre":"I click the button:","mid":"", "post": "","values":[""], "isExample":[]}
      jest.spyOn(component, 'createNewStep');
      let newStep = component.createNewStep( step, component.selectedScenario.stepDefinitions);
      component.addStep(step, component.selectedScenario, 'scenario');
      expect(component.createNewStep).toHaveBeenCalled();
      expect(component.selectedScenario.stepDefinitions.when).toContainEqual(newStep);
    }));

  });
  describe('getLastIDinStep', () => {
    it('should return the last id in step given', () => {
      let stepDefs : StepDefinition = {"given":[],"when":[{"id":1,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":[""], "post":"", "isExample":[]},
      {"id":2,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":[""],"post":"", "isExample":[]}],
      "then":[{"id":1,"mid":"","pre":"So I will be navigated to the website:","stepType":"then","type":"Website","values":["<fea>"], "post":"", "isExample":[]}],
      "example":[{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["fea"],"post":"" ,"isExample":[]},
      {"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["valueadf"],"post":"", "isExample":[]},
      {"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["value"],"post":"", "isExample":[]}]};
      
      let stepType = 'given'
      let returnNumber = 0;
      jest.spyOn(component, 'buildID');
      component.getLastIDinStep(stepDefs , stepType);
      expect(component.buildID).toHaveReturnedWith(returnNumber);
    });

    it('should return the last id in step when', () => {
      let stepDefs : StepDefinition = {"given":[],"when":[{"id":1,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":[""], "post":"", "isExample":[]},
      {"id":5,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":[""],"post":"", "isExample":[]}],
      "then":[{"id":1,"mid":"","pre":"So I will be navigated to the website:","stepType":"then","type":"Website","values":["<fea>"], "post":"", "isExample":[]}],
      "example":[{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["fea"],"post":"", "isExample":[]},
      {"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["valueadf"],"post":"", "isExample":[]},
      {"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["value"],"post":"", "isExample":[]}]};
      
      let stepType = 'when'
      let returnNumber = 5;
      jest.spyOn(component, 'buildID');
      component.getLastIDinStep(stepDefs, stepType);
      expect(component.buildID).toHaveReturnedWith(returnNumber);
    });

    it('should return the last id in step then', () => {
      let stepDefs : StepDefinition = {"given":[],"when":[{"id":1,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":[""], "post":"", "isExample":[]},
      {"id":2,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":[""],"post":"", "isExample":[]}],
      "then":[{"id":5,"mid":"","pre":"So I will be navigated to the website:","stepType":"then","type":"Website","values":["<fea>"], "post":"", "isExample":[]}],
      "example":[{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["fea"],"post":"", "isExample":[]},
      {"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["valueadf"],"post":"", "isExample":[]},
      {"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["value"],"post":"", "isExample":[]}]};
      
      let stepType = 'then'
      let returnNumber = 5;
      jest.spyOn(component, 'buildID');
      component.getLastIDinStep(stepDefs, stepType);
      expect(component.buildID).toHaveReturnedWith(returnNumber);
    });

    it('should return the last id in step example', () => {
      let stepDefs : StepDefinition = {"given":[],"when":[{"id":1,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":[""], "post":"", "isExample":[]},
      {"id":2,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":[""],"post":"", "isExample":[]}],
      "then":[{"id":1,"mid":"","pre":"So I will be navigated to the website:","stepType":"then","type":"Website","values":["<fea>"], "post":"", "isExample":[]}],
      "example":[{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["fea"],"post":"", "isExample":[]},
      {"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["valueadf"],"post":"", "isExample":[]},
      {"id":5,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["value"],"post":"", "isExample":[]}]};
      
      let stepType = 'example'
      let returnNumber = 5;
      jest.spyOn(component, 'buildID');
      component.getLastIDinStep(stepDefs, stepType);
      expect(component.buildID).toHaveReturnedWith(returnNumber);
    });
  });

  describe('buildID', () => {
    it('should return 0', () => {
      let stepType = [];
      let id = component.buildID(stepType);
      expect(id).toBe(0);
    })
    
    it('should return buildID', () => {
      let stepType = [{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["User"],"selection":["Guest","User"]},{"id":2,"mid":"","pre":"I am on the website:","stepType":"given","type":"Website","values":["r"]},{"id":3,"mid":"","pre":"I am on the website:","stepType":"given","type":"Website","values":["r"]}]
      let id = component.buildID(stepType);
      expect(id).toBe(3);
    })
  })


});
