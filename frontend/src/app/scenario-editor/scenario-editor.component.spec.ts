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

  //it('should create url received', () => {
  //  expect(component).toBeTruthy();
  //  if(component.apiService.urlReceived){
  //    spy = spyOn(component.apiService, 'getBackendInfo');
  //    expect(spy).toHaveBeenCalled();
  //  } else{
  //    spy = spyOn(component, 'loadStepTypes');
  //    expect(spy).toHaveBeenCalled();
  //  }
  //});

  describe('setStories', () => {
    it('should set stories', () => {
      let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number":{"$numberInt":"7"},"state":"open","title":"Story creation"}];
      component.setStories(stories);
      expect(component.stories).toBe(stories);
    });
  })

  describe('removeRowIndex', () => {
    it('should remove Row Index', () => {
      let scenario : Scenario = {"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}};
      //spyOn(component.exampleChild, 'updateTable');
      spyOn(component, 'removeStepToScenario');
      component.selectedScenario = scenario;
      fixture.componentInstance.removeRowIndex(1);
      //expect(component.exampleChild.updateTable).toHaveBeenCalled();
      expect(component.removeStepToScenario).toHaveBeenCalled();
    });
  })
  describe('set newSelectedStory', () => {
    it('should set newSelectedStory', () => {
      let story: Story = {"story_id": 123,"background":{"stepDefinitions":{"when":[]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"name":"failed Story creation","comment":"","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number":{"$numberInt":"7"},"state":"open","title":"Story creation"};
      fixture.componentInstance.newSelectedStory = story;
      expect(component.selectedStory).toBe(story);
    });
  })

  describe('set newSelectedScenario', () => {
    it('should set newSelectedScenario without selectScenario', () => {
      let scenario : Scenario = {"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}};
      component.stories = undefined;
      spyOn(component, 'selectScenario');
      fixture.componentInstance.newSelectedScenario = scenario;
      expect(component.selectedScenario).toBe(scenario);
      expect(component.selectScenario).not.toHaveBeenCalled();
    });
  
    it('should set newSelectedScenario with selectScenario', () => {
      let scenario : Scenario = {"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}};
      let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number":{"$numberInt":"7"},"state":"open","title":"Story creation"}];
      let story: Story = {"story_id": 123,"background":{"stepDefinitions":{"when":[]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number":{"$numberInt":"7"},"state":"open","title":"Story creation"};
      component.selectedStory = story;
      component.stories = stories;
      spyOn(component, 'selectScenario');
      fixture.componentInstance.newSelectedScenario = scenario;
      expect(component.selectedScenario).toBe(scenario);
      expect(component.selectScenario).toHaveBeenCalled();
    });
  })

  describe('backgroundList', () => {
    it('should return backgroundList', () => {
      let stepDefinitions: StepDefinitionBackground = {"when":[{"_id":'5dce728851e70f2894a170b4',"id":"", "stepType":"when", "type" :"HoverOverAndSelect", "pre":"I hover over the element", "mid":"and select the option","values":["",""]}]};
      let when = component.backgroundList(stepDefinitions)
      expect(when).toBe(stepDefinitions.when);
    });
  });
 
  describe('stepsList', () => {
    it('should return stepsList', () => {
      let stepDefs : StepDefinition = {"given":[],"when":[{"id":1,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":[""]},{"id":2,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":[""]}],"then":[{"id":1,"mid":"","pre":"So I will be navigated to the website:","stepType":"then","type":"Website","values":["<fea>"]}],"example":[{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["fea"]},{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["valueadf"]},{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["value"]}]};
      let given, when, then, example;
  
      given = component.stepsList(stepDefs, 0);
      expect(given).toBe(stepDefs.given);
  
      when = component.stepsList(stepDefs, 1);
      expect(when).toBe(stepDefs.when);
  
      then = component.stepsList(stepDefs, 2);
      expect(then).toBe(stepDefs.then);
  
      example = component.stepsList(stepDefs, 3);
      expect(example).toBe(stepDefs.example);
    });
  });
  
  describe('keysList', () => {
    it('should return keysList', () => {
      let stepDefs : StepDefinition = {"given":[],"when":[{"id":1,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":[""]},{"id":2,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":[""]}],"then":[{"id":1,"mid":"","pre":"So I will be navigated to the website:","stepType":"then","type":"Website","values":["<fea>"]}],"example":[{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["fea"]},{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["valueadf"]},{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["value"]}]};
      let keys;
      keys = component.keysList(null);
      expect(keys).toBe('');
  
      keys = component.keysList(stepDefs);
      expect(keys).toContain('given');
      expect(keys).toContain('when');
      expect(keys).toContain('then');
      expect(keys).toContain('example');
      expect(keys.length).toBe(4);
    });
  })

  describe('loadStepTypes', () => {
    it('should load the step types', () => {
      let resp: StepType[] = [{"_id":"5d765314aea0c94708a6e0a1","id":"",
    "stepType":"given","type":"Role","pre":"As a","mid":"","values":[""],
    "selection":["Guest","User"]},
    {"_id":"5d765314aea0c94708a6e0a2","id":"","stepType":"given","type":"Website",
    "pre":"I am on the website:","mid":"","values":[""]},
    {"_id":"5d765314aea0c94708a6e0a3","id":"","stepType":"example",
    "type":"Add Variable","pre":"","mid":"","values":[""]},
    {"_id":"5d765314aea0c94708a6e0a4","id":"","stepType":"when","type":"Website",
    "pre":"I go to the website:","mid":"","values":[""]},
    {"_id":"5d765314aea0c94708a6e0a5","id":"","stepType":"when","type":"Button",
    "pre":"I click the button:","mid":"","values":[""]},
    {"_id":"5d765314aea0c94708a6e0a6","id":"","stepType":"when","type":"Field",
    "pre":"I insert","mid":"into the field","values":["",""]},
    {"_id":"5d765314aea0c94708a6e0a7","id":"","stepType":"when","type":"Radio",
    "pre":"I select ","mid":"from the selection","values":["",""]},
    {"_id":"5d765314aea0c94708a6e0a8","id":"","stepType":"when","type":"Dropdown",
    "pre":"I select the option","mid":"from the drop-down-menue","values":["",""]},
    {"_id":"5d765314aea0c94708a6e0a9","id":"","stepType":"when",
    "type":"HoverOverAndSelect","pre":"I hover over the element",
    "mid":"and select the option","values":["",""]},
    {"_id":"5d765314aea0c94708a6e0aa","id":"","stepType":"when","type":"Checkbox",
    "pre":"I select from the","mid":"multiple selection, the values","values":["",""]},
    {"_id":"5d765314aea0c94708a6e0ab","id":"","stepType":"then","type":"Website",
    "pre":"So I will be navigated to the website:","mid":"","values":[""]},
    {"_id":"5d765314aea0c94708a6e0ac","id":"","stepType":"then","type":"Text",
    "pre":"So I can see the text","mid":"in the textbox:","values":["",""]}];
      spyOn(component.apiService, 'getStepTypes').and.returnValue(of(resp));
      component.loadStepTypes();
      expect(component.apiService.getStepTypes).toHaveBeenCalled();
      expect(component.originalStepTypes).toBe(resp);
    });
  });

  describe('backgroundNameChange', () => {
    it('should set selectedStory background name', () => {
      let name = 'TestBackground';
      let story: Story = {"story_id": 123,"background":{"stepDefinitions":{"when":[]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number":{"$numberInt":"7"},"state":"open","title":"Story creation"};
      component.selectedStory = story;
      component.backgroundNameChange(name);
      expect(component.selectedStory.background.name).toBe(name);
    });
  })

  describe('updateBackground', () => {
    it('should update the background', () => {
      let storyID = 5;
      let story: Story = {"story_id": 123,"background":{"stepDefinitions":{"when":[]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number":{"$numberInt":"7"},"state":"open","title":"Story creation"};
      component.selectedStory = story;
      spyOn(component.apiService, 'updateBackground').and.returnValue(of(''));
      component.updateBackground(storyID);
      expect(component.apiService.updateBackground).toHaveBeenCalled();
    });
  })

  describe('updateScenario', () => {
    it('should update the Scenario', () => {
      let storyID = 5;
      spyOn(component.apiService, 'updateScenario').and.returnValue(of(''));
      component.updateScenario(storyID);
      expect(component.apiService.updateScenario).toHaveBeenCalled();
    });
  })

  describe('addScenarioFromStory', () => {
    it('should add a Scenario and select this scenario', () => {
      let storyID = 5;
      let resp: Scenario = {"name": "New Scenario","comment":"", "scenario_id": 2, "stepDefinitions": {"given": [], "when": [], "then": [], "example": []}};
      let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number":{"$numberInt":"7"},"state":"open","title":"Story creation"}];
      component.stories = stories;
      component.selectedStory = stories[0];
      spyOn(component.apiService, 'addScenario').and.returnValue(of(resp));
      spyOn(component, 'selectScenario');

      component.addScenarioFromStory(storyID);
      expect(component.stories[component.stories.indexOf(component.selectedStory)].scenarios).toContain(resp);
      expect(component.apiService.addScenario).toHaveBeenCalled();
      expect(component.selectScenario).toHaveBeenCalled();
    });
  })

  describe('deleteBackground', () => {
    it('should delete the background', () => {
      let emptyBackground = {name, stepDefinitions: {when: []}};
      let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number":{"$numberInt":"7"},"state":"open","title":"Story creation"}];
      component.stories = stories;
      component.selectedStory = stories[0];
      spyOn(component.apiService, 'deleteBackground').and.returnValue(of(''));
      component.deleteBackground();
      expect(component.showBackground).toBeFalsy();
      expect(component.stories[component.stories.indexOf(component.selectedStory)].background).toEqual(emptyBackground);
      expect(component.apiService.deleteBackground).toHaveBeenCalled();
    });
  })

  describe('deleteScenario', () => {
    it('should delete the Scenario', () => {
      let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[]}},"scenarios":[{"scenario_id":1,"name":"successful Story creation","comment":"","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number":{"$numberInt":"7"},"state":"open","title":"Story creation"}];
      component.stories = stories;
      component.selectedStory = stories[0];
      component.selectedScenario = stories[0].scenarios[0];
      let indexStory: number = component.stories.indexOf(component.selectedStory);
      let indexScenario: number = component.stories[indexStory].scenarios.indexOf(component.selectedScenario);
      let deletedScenario = component.stories[indexStory].scenarios[indexScenario];
      
      spyOn(component.apiService, 'deleteScenario').and.returnValue(of(''));
      component.deleteScenario();
      expect(component.showEditor).toBeFalsy();

      expect(component.stories[component.stories.indexOf(component.selectedStory)].scenarios).not.toContain(deletedScenario);
      expect(indexScenario).not.toBe(-1);
      expect(component.apiService.deleteScenario).toHaveBeenCalled();
    });
  })

  describe('openDescription', () => {
    it('should set true showDescription to !showDescription', () => {
      component.showDescription = true;
      component.openDescription();
      expect(component.showDescription).toBeFalsy();
    });

    it('should set false showDescription to !showDescription', () => {
      component.showDescription = false;
      component.openDescription();
      expect(component.showDescription).toBeTruthy();
    });
  })

  describe('openBackground', () => {
    it('should set true showBackground to !showBackground', () => {
      component.showBackground = true;
      component.openBackground();
      expect(component.showBackground).toBeFalsy();
    });

    it('should set false showBackground to !showBackground', () => {
      component.showBackground = false;
      component.openBackground();
      expect(component.showBackground).toBeTruthy();
    });
  })

  describe('addStepToScenario', () => {
    let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[]}},"scenarios":[{"scenario_id":1,"name":"successful Story creation","comment":"","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[{"_id":"5dce728851e70f2894a170ae","id":"","stepType":"example","type":"Add Variable","pre":"","mid":"","values":["BLUBB"]}]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number":{"$numberInt":"7"},"state":"open","title":"Story creation"}];
    beforeEach(() => {
      component.stories = stories;
      component.selectedStory = stories[0];
      component.selectedScenario = stories[0].scenarios[0];
      
    });

    it('should add a given step to the scenario', () => {
      let step: StepType = {"_id":"5dce728851e70f2894a170ad","id":"","stepType":"given","type":"Website","pre":"I am on the website:","mid":"","values":[""]}
      const obj = component.clone( step );
      const new_step = {
        id: 6,
        mid: obj.mid,
        pre: obj.pre,
        stepType: obj.stepType,
        type: obj.type,
        values: obj.values
     };
      spyOn(component, 'clone').and.returnValue(obj);
      spyOn(component, 'getLastIDinStep').and.returnValue(5);

      component.addStepToScenario(1,step);
      expect(component.selectedScenario.stepDefinitions.given).toContain(new_step);
      expect(component.getLastIDinStep).toHaveBeenCalled();
      expect(component.clone).toHaveBeenCalled();
    });

    it('should add a when step to the scenario', () => {
      let step: StepType = {"_id":"5dce728851e70f2894a170b0","id":"","stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":[""]}
      const obj = component.clone( step );
      const new_step = {
        id: 6,
        mid: obj.mid,
        pre: obj.pre,
        stepType: obj.stepType,
        type: obj.type,
        values: obj.values
     };
      spyOn(component, 'clone').and.returnValue(obj);
      spyOn(component, 'getLastIDinStep').and.returnValue(5);
      component.addStepToScenario(1,step);
      expect(component.selectedScenario.stepDefinitions.when).toContain(new_step);
      expect(component.getLastIDinStep).toHaveBeenCalled();
      expect(component.clone).toHaveBeenCalled();
    });

    it('should add a then step to the scenario', () => {
      let step: StepType = {"_id":"5dce728851e70f2894a170b7","id":"","stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["",""]}
      const obj = component.clone( step );
      const new_step = {
        id: 6,
        mid: obj.mid,
        pre: obj.pre,
        stepType: obj.stepType,
        type: obj.type,
        values: obj.values
     };
      spyOn(component, 'clone').and.returnValue(obj);
      spyOn(component, 'getLastIDinStep').and.returnValue(5);
      component.addStepToScenario(1,step);
      expect(component.selectedScenario.stepDefinitions.then).toContain(new_step);
      
      expect(component.getLastIDinStep).toHaveBeenCalled();
      expect(component.clone).toHaveBeenCalled();
    });

  //  it('should add a example step to the scenario', () => {
  //    component.selectedScenario = scenario;
//
  //    let step: StepType = {"_id":"5dce728851e70f2894a170ae","id":"","stepType":"example","type":"Add Variable","pre":"","mid":"","values":[""]}
  //    const obj = component.clone( step );
  //    const new_step = {
  //      id: 6,
  //      mid: obj.mid,
  //      pre: obj.pre,
  //      stepType: 'example',
  //      type: obj.type,
  //      values: ['value']
  //   };
  //    spyOn(component, 'clone').and.returnValue(obj);
  //    spyOn(component, 'getLastIDinStep').and.returnValue(5);
  //    spyOn(component, 'addStep');
  //    //spyOn(component.exampleChild, 'updateTable').and.callThrough();
//
  //    // TODO test
  //    //component.addStepToScenario(1,step);
  //    expect(component.selectedScenario.stepDefinitions.example).toContain(new_step);
  //    
  //    expect(component.getLastIDinStep).toHaveBeenCalled();
  //    expect(component.clone).toHaveBeenCalled();
  //    expect(component.addStep).toHaveBeenCalled();
  //    //expect(fixture.componentInstance.exampleChild.updateTable).toHaveBeenCalled();
//
//
  //  });
  })

  describe('addStepToBackground', () => {
    let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[{"_id":"5dce728851e70f2894a170ae","id":"","stepType":"example","type":"Add Variable","pre":"","mid":"","values":["BLUBB"]}]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number":{"$numberInt":"7"},"state":"open","title":"Story creation"}];
    beforeEach(() => {
      component.stories = stories;
      component.selectedStory = stories[0];
      component.selectedScenario = stories[0].scenarios[0];
    });

    it('should add a when step to the background', () => {
      let step: StepType = {"_id":"5dce728851e70f2894a170b0","id":"","stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":[""]}
      const obj = component.clone( step );
      const new_step = {
        id: 6,
        label: obj.label,
        mid: obj.mid,
        pre: obj.pre,
        stepType: obj.stepType,
        type: obj.type,
        values: obj.values
     };
      spyOn(component, 'clone').and.returnValue(obj);
      spyOn(component, 'getLastIDinStep').and.returnValue(5);
      component.addStepToBackground(1,step);
      expect(component.selectedStory.background.stepDefinitions.when).toContain(new_step);
      expect(component.getLastIDinStep).toHaveBeenCalled();
      expect(component.clone).toHaveBeenCalled();
    });
  });

  describe('addStep', () => {
    let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[{"_id":"5dce728851e70f2894a170ae","id":"","stepType":"example","type":"Add Variable","pre":"","mid":"","values":["BLUBB"]}]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number":{"$numberInt":"7"},"state":"open","title":"Story creation"}];
    beforeEach(() => {
      component.stories = stories;
      component.selectedStory = stories[0];
      component.selectedScenario = stories[0].scenarios[0];
    });

    it('should add a when step to the example', () => {
      let step: StepType = {"_id":"5dce728851e70f2894a170b0","id":"","stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":[""]}
      const obj = component.clone( step );
      const new_step = {
        id: 6,
        label: obj.label,
        mid: obj.mid,
        pre: obj.pre,
        stepType: 'example',
        type: obj.type,
        values: ['value']
     };
      spyOn(component, 'getLastIDinStep').and.returnValue(5);
      component.addStep(step);
      expect(component.selectedScenario.stepDefinitions.example).toContain(new_step);
      expect(component.getLastIDinStep).toHaveBeenCalled();
    });
  });

  describe('getLastIDinStep', () => {
    it('should return the last id in step given', () => {
      let stepDefs : StepDefinition = {"given":[],"when":[{"id":1,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":[""]},{"id":2,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":[""]}],"then":[{"id":1,"mid":"","pre":"So I will be navigated to the website:","stepType":"then","type":"Website","values":["<fea>"]}],"example":[{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["fea"]},{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["valueadf"]},{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["value"]}]};
      let stepType = 'given'
      let returnNumber = 5;
      spyOn(component, 'buildID').and.returnValue(returnNumber);
      component.getLastIDinStep(stepDefs, stepType);
      expect(component.buildID).toHaveBeenCalled();
    });

    it('should return the last id in step when', () => {
      let stepDefs : StepDefinition = {"given":[],"when":[{"id":1,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":[""]},{"id":2,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":[""]}],"then":[{"id":1,"mid":"","pre":"So I will be navigated to the website:","stepType":"then","type":"Website","values":["<fea>"]}],"example":[{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["fea"]},{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["valueadf"]},{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["value"]}]};
      let stepType = 'when'

      let returnNumber = 5;
      spyOn(component, 'buildID').and.returnValue(returnNumber);
      component.getLastIDinStep(stepDefs, stepType);
      expect(component.buildID).toHaveBeenCalled();
    });

    it('should return the last id in step then', () => {
      let stepDefs : StepDefinition = {"given":[],"when":[{"id":1,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":[""]},{"id":2,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":[""]}],"then":[{"id":1,"mid":"","pre":"So I will be navigated to the website:","stepType":"then","type":"Website","values":["<fea>"]}],"example":[{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["fea"]},{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["valueadf"]},{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["value"]}]};
      let stepType = 'then'

      let returnNumber = 5;
      spyOn(component, 'buildID').and.returnValue(returnNumber);
      component.getLastIDinStep(stepDefs, stepType);
      expect(component.buildID).toHaveBeenCalled();
    });

    it('should return the last id in step example', () => {
      let stepDefs : StepDefinition = {"given":[],"when":[{"id":1,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":[""]},{"id":2,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":[""]}],"then":[{"id":1,"mid":"","pre":"So I will be navigated to the website:","stepType":"then","type":"Website","values":["<fea>"]}],"example":[{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["fea"]},{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["valueadf"]},{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["value"]}]};
      let stepType = 'example'

      let returnNumber = 5;
      spyOn(component, 'buildID').and.returnValue(returnNumber);
      component.getLastIDinStep(stepDefs, stepType);
      expect(component.buildID).toHaveBeenCalled();
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

  describe('removeStepToBackround', () => {
    it('should remove the step of the background', () => {
      let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[{"_id":"5dce728851e70f2894a170b0","id":"","stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":[""]}]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number":{"$numberInt":"7"},"state":"open","title":"Story creation"}];
      component.stories = stories;
      component.selectedStory = stories[0];
      expect(component.selectedStory.background.stepDefinitions.when.length).toBe(1);
      component.removeStepToBackground(null, 0);
      expect(component.selectedStory.background.stepDefinitions.when.length).toBe(0);
    })

    it('should remove nothing', () => {
      let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number":{"$numberInt":"7"},"state":"open","title":"Story creation"}];
      component.stories = stories;
      component.selectedStory = stories[0];
      expect(component.selectedStory.background.stepDefinitions.when.length).toBe(0);
      component.removeStepToBackground(null, 0);
      expect(component.selectedStory.background.stepDefinitions.when.length).toBe(0);
    })
  })

  describe('removeStepToScenario', () => {
    beforeEach(() => {
      let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number":{"$numberInt":"7"},"state":"open","title":"Story creation"}];
      component.stories = stories;
      component.selectedStory = stories[0];
      component.selectedScenario = stories[0].scenarios[0];
    })

    it('remove step of scenario given', () => {
      let stepDefType = 'given';
      expect(component.selectedScenario.stepDefinitions.given.length).toBe(1);
      component.removeStepToScenario(stepDefType, 0);
      expect(component.selectedScenario.stepDefinitions.given.length).toBe(0);
    })

    it('remove step of scenario when', () => {
      let stepDefType = 'when';
      expect(component.selectedScenario.stepDefinitions.when.length).toBe(2);
      component.removeStepToScenario(stepDefType, 0);
      expect(component.selectedScenario.stepDefinitions.when.length).toBe(1);
    })

    it('remove step of scenario then', () => {
      let stepDefType = 'then';
      expect(component.selectedScenario.stepDefinitions.then.length).toBe(1);
      component.removeStepToScenario(stepDefType, 0);
      expect(component.selectedScenario.stepDefinitions.then.length).toBe(0);
    })

    //it('remove step of scenario example', () => {
    //  let stepDefType = 'example';
    //  expect(component.selectedScenario.stepDefinitions.example.length).toBe(0);
    //  component.removeStepToScenario(stepDefType, 0);
    //  expect(component.selectedScenario.stepDefinitions.example.length).toBe(1);
    //})
  });

  describe('addToValuesBackground', () => {
    it('should add hello to background values', () => {
      let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[{"_id":"5dce728851e70f2894a170b0","id":"","stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":[""]}]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number":{"$numberInt":"7"},"state":"open","title":"Story creation"}];
      component.stories = stories;
      component.selectedStory = stories[0];
      let stepIndex = 0;
      let valueIndex = 0;
      let input = 'hello'

      component.addToValuesBackground(input, stepIndex, valueIndex);
      expect(component.selectedStory.background.stepDefinitions.when[stepIndex].values[valueIndex]).toBe(input);

    });
  });

  describe('addToValues', () => {
    beforeEach(() => {
      let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[{"_id":"5dce728851e70f2894a170b0","id":"","stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":[""]}]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[{"values":[]}]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number":{"$numberInt":"7"},"state":"open","title":"Story creation"}];
      component.stories = stories;
      component.selectedStory = stories[0];
      component.selectedScenario = stories[0].scenarios[0];

    });

    it('should add hello to given values', () => {
      let stepType = 'given'
      let step = '';
      let stepIndex = 0;
      let valueIndex = 0;
      let input = 'hello'
      spyOn(component, 'checkForExamples');
      component.addToValues(input, stepType, step, stepIndex, valueIndex);
      expect(component.checkForExamples).toHaveBeenCalled();
      expect(component.selectedScenario.stepDefinitions.given[stepIndex].values[valueIndex]).toBe(input);
    });

    it('should add hello to when values', () => {
      let stepType = 'when'
      let step = '';
      let stepIndex = 0;
      let valueIndex = 0;
      let input = 'hello'
      spyOn(component, 'checkForExamples');
      component.addToValues(input, stepType, step, stepIndex, valueIndex);
      expect(component.checkForExamples).toHaveBeenCalled();
      expect(component.selectedScenario.stepDefinitions.when[stepIndex].values[valueIndex]).toBe(input);
    });

    it('should add hello to then values', () => {
      let stepType = 'then'
      let step = '';
      let stepIndex = 0;
      let valueIndex = 0;
      let input = 'hello'
      spyOn(component, 'checkForExamples');
      component.addToValues(input, stepType, step, stepIndex, valueIndex);
      expect(component.checkForExamples).toHaveBeenCalled();
      expect(component.selectedScenario.stepDefinitions.then[stepIndex].values[valueIndex]).toBe(input);
    });

    it('should add hello to example values', () => {
      let scenario: Scenario = {"scenario_id":3,"comment":"","name":"Successful Login","stepDefinitions":{"given":[{"id":1,"mid":"","pre":"As a","stepType":"given","type":"Role","values":["Guest"]}],"when":[{"id":1,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":["https://github.com/login?return_to=%2Fjoin%3Fsource%3Dheader-home"]},{"id":2,"mid":"into the field","pre":"I insert","stepType":"when","type":"Field","values":["<userName>","login_field"]},{"id":3,"mid":"into the field","pre":"I insert","stepType":"when","type":"Field","values":["<password>","password"]},{"id":4,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["commit"]}],"then":[{"id":1,"mid":"","pre":"So I will be navigated to the website:","stepType":"then","type":"Website","values":["<website>"]}],"example":[{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["userName","password","website"]},{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["AdorableHamster","cutehamsterlikesnuts2000","https://github.com/"]},{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["NormalHamster","FatHamster123","https://github.com/"]},{"id":6,"mid":"","pre":"","stepType":"example","type":"Add Variable","values":["OldHamster","UglyHamster123","https://github.com/"]}]}};
      component.selectedScenario = scenario;
      let stepType = 'example'
      let step = '';
      let stepIndex = 0;
      let valueIndex = 0;
      let input = 'hello'
      spyOn(component, 'checkForExamples');
      component.addToValues(input, stepType, step, stepIndex, valueIndex);
      expect(component.checkForExamples).toHaveBeenCalled();
      expect(component.selectedScenario.stepDefinitions.example[stepIndex].values[valueIndex]).toBe(input);
    });
  });

  describe('checkForExamples', () => {

    beforeEach(() => {

    })

    it('should create examples', () => {
      let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[{"_id":"5dce728851e70f2894a170b0","id":"","stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":[""]}]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[{"values":[]}]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number":{"$numberInt":"7"},"state":"open","title":"Story creation"}];
      component.stories = stories;
      component.selectedStory = stories[0];
      component.selectedScenario = stories[0].scenarios[0];
      let input = '<test>';
      let step = {"id":5,"mid":"from the drop-down-menue","pre":"I select the option","stepType":"when","type":"Dropdown","values":["","<l>"]};
      let valueIndex = 0;
      spyOn(component, 'handleExamples');
      component.checkForExamples(input, step, valueIndex);
      expect(component.handleExamples).toHaveBeenCalled();
    })

    it('should remove one examples', () => {
      let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[{"_id":"5dce728851e70f2894a170b0","id":"","stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":[]}]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["<Guest>"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[{"id":6,"mid":"","pre":"","stepType":"example","type":"Add Variable","values":["OldHamster"]}]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[{"values":[]}]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number":{"$numberInt":"7"},"state":"open","title":"Story creation"}];
      component.stories = stories;
      component.selectedStory = stories[0];
      component.selectedScenario = stories[0].scenarios[0];
      let input = 'hallo';
      let step = {"id":5,"mid":"from the drop-down-menue","pre":"I select the option","stepType":"given","type":"Dropdown","values":["<l>"]};
      let valueIndex = 0;
      expect(component.selectedScenario.stepDefinitions.example.length).toBe(1);
      component.checkForExamples(input, step, valueIndex);
      expect(component.selectedScenario.stepDefinitions.example.length).toBe(0);
    });
  });

  //describe('handleExamples', () => {
  //  it('should ')
//
  //});

  describe('renameScenario', () => {
    let scenario: Scenario = {"scenario_id":3,"comment":"","name":"Successful Login","stepDefinitions":{"given":[{"id":1,"mid":"","pre":"As a","stepType":"given","type":"Role","values":["Guest"]}],"when":[{"id":1,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":["https://github.com/login?return_to=%2Fjoin%3Fsource%3Dheader-home"]},{"id":2,"mid":"into the field","pre":"I insert","stepType":"when","type":"Field","values":["<userName>","login_field"]},{"id":3,"mid":"into the field","pre":"I insert","stepType":"when","type":"Field","values":["<password>","password"]},{"id":4,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["commit"]}],"then":[{"id":1,"mid":"","pre":"So I will be navigated to the website:","stepType":"then","type":"Website","values":["<website>"]}],"example":[{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["userName","password","website"]},{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["AdorableHamster","cutehamsterlikesnuts2000","https://github.com/"]},{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["NormalHamster","FatHamster123","https://github.com/"]},{"id":6,"mid":"","pre":"","stepType":"example","type":"Add Variable","values":["OldHamster","UglyHamster123","https://github.com/"]}]}};

    beforeEach(() => {
      component.selectedScenario = scenario;
    })
    it('should name the Scenario Donald', () => {
      let name = 'Donald';
      expect(component.selectedScenario.name).toBe('Successful Login')
      component.renameScenario(null, name);
      expect(component.selectedScenario.name).toBe(name);
    });

    it('should not rename with null or undefined', () => {
      let name = undefined;
      expect(component.selectedScenario.name).toBe('Donald')
      component.renameScenario(null, name);
      expect(component.selectedScenario.name).toBe('Donald');
    });
  })

  describe('selectScenario', () => {
    it('should select the Scenario', () => {
      let scenario: Scenario = {"scenario_id":3,"comment":"","name":"Successful Login","stepDefinitions":{"given":[{"id":1,"mid":"","pre":"As a","stepType":"given","type":"Role","values":["Guest"]}],"when":[{"id":1,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":["https://github.com/login?return_to=%2Fjoin%3Fsource%3Dheader-home"]},{"id":2,"mid":"into the field","pre":"I insert","stepType":"when","type":"Field","values":["<userName>","login_field"]},{"id":3,"mid":"into the field","pre":"I insert","stepType":"when","type":"Field","values":["<password>","password"]},{"id":4,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["commit"]}],"then":[{"id":1,"mid":"","pre":"So I will be navigated to the website:","stepType":"then","type":"Website","values":["<website>"]}],"example":[{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["userName","password","website"]},{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["AdorableHamster","cutehamsterlikesnuts2000","https://github.com/"]},{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["NormalHamster","FatHamster123","https://github.com/"]},{"id":6,"mid":"","pre":"","stepType":"example","type":"Add Variable","values":["OldHamster","UglyHamster123","https://github.com/"]}]}};
      spyOn(component, 'checkArrowLeft').and.returnValue(true);
      spyOn(component, 'checkArrowRight').and.returnValue(true);

      component.selectScenario(null, scenario);
      expect(component.selectedScenario).toBe(scenario);
      expect(component.showResults).toBe(false);
      expect(component.showEditor).toBe(true);
      expect(component.testDone).toBe(false);
      expect(component.checkArrowLeft).toHaveBeenCalled();
      expect(component.checkArrowRight).toHaveBeenCalled();

    });
  });

  describe('selectStoryScenario', () => {
    it('should select the Story', () => {
      let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[{"_id":"5dce728851e70f2894a170b0","id":"","stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":[]}]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["<Guest>"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[{"id":6,"mid":"","pre":"","stepType":"example","type":"Add Variable","values":["OldHamster"]}]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[{"values":[]}]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number":{"$numberInt":"7"},"state":"open","title":"Story creation"}];
      component.stories = stories;
      spyOn(component, 'selectScenario');

      component.selectStoryScenario(stories[0]);
      expect(component.selectedStory).toBe(stories[0]);
      expect(component.showResults).toBe(false);
      expect(component.showEditor).toBe(true);
      expect(component.selectScenario).toHaveBeenCalled();

    });
  });

  describe('checkArrowLeft', () => {
    let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[{"_id":"5dce728851e70f2894a170b0","id":"","stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":[]}]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["<Guest>"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[{"id":6,"mid":"","pre":"","stepType":"example","type":"Add Variable","values":["OldHamster"]}]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[{"values":[]}]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number":{"$numberInt":"7"},"state":"open","title":"Story creation"}];

    beforeEach(() => {
      component.stories = stories;
    });
    it('should return false', () => {
      component.selectedStory = stories[0];
      component.selectedScenario = stories[0].scenarios[1];
      let left = component.checkArrowLeft();
      expect(left).toBe(false);
    });

    it('should return true', () => {
      component.selectedStory = stories[0];
      component.selectedScenario = stories[0].scenarios[0];
      let left = component.checkArrowLeft();
      expect(left).toBe(true);
    });
  });

  describe('checkArrowRight', () => {
    let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[{"_id":"5dce728851e70f2894a170b0","id":"","stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":[]}]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["<Guest>"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[{"id":6,"mid":"","pre":"","stepType":"example","type":"Add Variable","values":["OldHamster"]}]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[{"values":[]}]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number":{"$numberInt":"7"},"state":"open","title":"Story creation"}];

    beforeEach(() => {
      component.stories = stories;
    });
    it('should return true', () => {
      component.selectedStory = stories[0];
      component.selectedScenario = stories[0].scenarios[1];
      let right = component.checkArrowRight();
      expect(right).toBe(true);
    });

    it('should return false', () => {
      component.selectedStory = stories[0];
      component.selectedScenario = stories[0].scenarios[0];
      let right = component.checkArrowRight();
      expect(right).toBe(false);
    });
  });

  describe('scenarioShiftLeft', () => {
    let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[{"_id":"5dce728851e70f2894a170b0","id":"","stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":[]}]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["<Guest>"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[{"id":6,"mid":"","pre":"","stepType":"example","type":"Add Variable","values":["OldHamster"]}]}},{"scenario_id":3,"name":"failed Story creation","comment":"","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[{"values":[]}]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number":{"$numberInt":"7"},"state":"open","title":"Story creation"}];

    beforeEach(() => {
      component.stories = stories;
    });
    it('should shift left', () => {
      component.selectedStory = stories[0];
      component.selectedScenario = stories[0].scenarios[1];
      spyOn(component, 'selectScenario');
      component.scenarioShiftLeft();
      expect(component.selectScenario).toHaveBeenCalled();
    });

    it('should not shift left', () => {
      component.selectedStory = stories[0];
      component.selectedScenario = stories[0].scenarios[0];
      spyOn(component, 'selectScenario');
      component.scenarioShiftLeft();
      expect(component.selectScenario).not.toHaveBeenCalled();
    });
  });

  describe('scenarioShiftRight', () => {
    let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[{"_id":"5dce728851e70f2894a170b0","id":"","stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":[]}]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["<Guest>"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[{"id":6,"mid":"","pre":"","stepType":"example","type":"Add Variable","values":["OldHamster"]}]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[{"values":[]}]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number":{"$numberInt":"7"},"state":"open","title":"Story creation"}];

    beforeEach(() => {
      component.stories = stories;
    });
    it('should shift right', () => {
      component.selectedStory = stories[0];
      component.selectedScenario = stories[0].scenarios[0];
      spyOn(component, 'selectScenario');
      component.scenarioShiftRight();
      expect(component.selectScenario).toHaveBeenCalled();
    });

    it('should not shift right', () => {
      component.selectedStory = stories[0];
      component.selectedScenario = stories[0].scenarios[1];
      spyOn(component, 'selectScenario');
      component.scenarioShiftRight();
      expect(component.selectScenario).not.toHaveBeenCalled();
    });
  });

  //describe('runTests', () => {
  //  let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[{"_id":"5dce728851e70f2894a170b0","id":"","stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":[]}]}},"scenarios":[{"scenario_id":1,"name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["<Guest>"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[{"id":6,"mid":"","pre":"","stepType":"example","type":"Add Variable","values":["OldHamster"]}]}},{"scenario_id":3,"name":"failed Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[{"values":[]}]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number":{"$numberInt":"7"},"state":"open","title":"Story creation"}];
//
  //  beforeEach(() => {
  //    component.stories = stories;
  //  });
  //  it('should run tests', () => {
  //    component.selectedStory = stories[0];
  //    component.selectedScenario = stories[0].scenarios[0];
  //    spyOn(component.apiService, 'runTests').and.returnValue(of({}));
  //    component.runTests(1,2,null);
  //    expect(component.testDone).toBe(true);
  //    expect(component.showResults).toBe(true);
  //    expect(component.testRunning).toBe(false);
//
  //    expect(component.apiService.runTests).toHaveBeenCalled();
  //  });
  //});

  describe('hideResults', () => {
    it('should turn show results to true', () => {
      component.showResults = false;
      component.hideResults();
      expect(component.showResults).toBe(true);
    })

    it('should turn show results to false', () => {
      component.showResults = true;
      component.hideResults();
      expect(component.showResults).toBe(false);
    })
  })


});
