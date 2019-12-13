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
    component.exampleChild = TestBed.createComponent(ExampleTableComponent).componentInstance as ExampleTableComponent;
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

  it('should set stories', () => {
    let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[]}},"scenarios":[{"scenario_id":1,"name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"name":"failed Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number":{"$numberInt":"7"},"state":"open","title":"Story creation"}];
    component.setStories(stories);
    expect(component.stories).toBe(stories);
  });

  it('should remove Row Index', () => {
    let scenario : Scenario = {"scenario_id":1,"name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}};
    //spyOn(component.exampleChild, 'updateTable');
    spyOn(component, 'removeStepToScenario');
    component.selectedScenario = scenario;
    fixture.componentInstance.removeRowIndex(1);
    //expect(component.exampleChild.updateTable).toHaveBeenCalled();
    expect(component.removeStepToScenario).toHaveBeenCalled();
  });

  it('should set newSelectedStory', () => {
    let story: Story = {"story_id": 123,"background":{"stepDefinitions":{"when":[]}},"scenarios":[{"scenario_id":1,"name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"name":"failed Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number":{"$numberInt":"7"},"state":"open","title":"Story creation"};
    fixture.componentInstance.newSelectedStory = story;
    expect(component.selectedStory).toBe(story);
  });

  it('should set newSelectedScenario without selectScenario', () => {
    let scenario : Scenario = {"scenario_id":1,"name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}};
    component.stories = undefined;
    spyOn(component, 'selectScenario');
    fixture.componentInstance.newSelectedScenario = scenario;
    expect(component.selectedScenario).toBe(scenario);
    expect(component.selectScenario).not.toHaveBeenCalled();
  });

  it('should set newSelectedScenario with selectScenario', () => {
    let scenario : Scenario = {"scenario_id":1,"name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}};
    let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[]}},"scenarios":[{"scenario_id":1,"name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"name":"failed Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number":{"$numberInt":"7"},"state":"open","title":"Story creation"}];
    let story: Story = {"story_id": 123,"background":{"stepDefinitions":{"when":[]}},"scenarios":[{"scenario_id":1,"name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"name":"failed Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number":{"$numberInt":"7"},"state":"open","title":"Story creation"};
    component.selectedStory = story;
    component.stories = stories;
    spyOn(component, 'selectScenario');
    fixture.componentInstance.newSelectedScenario = scenario;
    expect(component.selectedScenario).toBe(scenario);
    expect(component.selectScenario).toHaveBeenCalled();
  });

  it('should return backgroundList', () => {
    let stepDefinitions: StepDefinitionBackground = {"when":[{"_id":'5dce728851e70f2894a170b4',"id":"", "stepType":"when", "type" :"HoverOverAndSelect", "pre":"I hover over the element", "mid":"and select the option","values":["",""]}]};
    let when = component.backgroundList(stepDefinitions)
    expect(when).toBe(stepDefinitions.when);
  });

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
      let story: Story = {"story_id": 123,"background":{"stepDefinitions":{"when":[]}},"scenarios":[{"scenario_id":1,"name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"name":"failed Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number":{"$numberInt":"7"},"state":"open","title":"Story creation"};
      component.selectedStory = story;
      component.backgroundNameChange(name);
      expect(component.selectedStory.background.name).toBe(name);
    });
  })

  describe('updateBackground', () => {
    it('should update the background', () => {
      let storyID = 5;
      let story: Story = {"story_id": 123,"background":{"stepDefinitions":{"when":[]}},"scenarios":[{"scenario_id":1,"name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"name":"failed Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number":{"$numberInt":"7"},"state":"open","title":"Story creation"};
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
      let resp: Scenario = {"name": "New Scenario", "scenario_id": 2, "stepDefinitions": {"given": [], "when": [], "then": [], "example": []}};
      let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[]}},"scenarios":[{"scenario_id":1,"name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"name":"failed Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number":{"$numberInt":"7"},"state":"open","title":"Story creation"}];
      let selectedStory: Story = {"story_id": 123,"background":{"stepDefinitions":{"when":[]}},"scenarios":[{"scenario_id":1,"name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"name":"failed Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number":{"$numberInt":"7"},"state":"open","title":"Story creation"};
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
    it('should add the background', () => {
      let emptyBackground = {name, stepDefinitions: {when: []}};
      let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[]}},"scenarios":[{"scenario_id":1,"name":"successful Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"name":"failed Story creation","stepDefinitions":{"given":[{"id":{"$numberInt":"1"},"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":{"$numberInt":"1"},"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":{"$numberInt":"2"},"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":{"$numberInt":"2"},"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number":{"$numberInt":"7"},"state":"open","title":"Story creation"}];
      component.stories = stories;
      component.selectedStory = stories[0];
      spyOn(component.apiService, 'deleteBackground').and.returnValue(of(''));
      component.deleteBackground();
      expect(component.showBackground).toBeFalsy();
      expect(component.stories[component.stories.indexOf(component.selectedStory)].background).toEqual(emptyBackground);
      expect(component.apiService.deleteBackground).toHaveBeenCalled();
    });
  })


});
