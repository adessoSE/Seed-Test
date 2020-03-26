import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { StoryEditorComponent } from './story-editor.component';
import { StepDefinitionBackground } from '../model/StepDefinitionBackground';
import { Story } from '../model/Story';
import { of } from 'rxjs';
import { StepType } from '../model/StepType';
import { Scenario } from '../model/Scenario';
import { ScenarioEditorComponent } from '../scenario-editor/scenario-editor.component';
import { ExampleTableComponent } from '../example-table/example-table.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatTableModule } from '@angular/material';
import { EditableComponent } from '../editable/editable.component';
import { ParentComponent } from '../parent/parent.component';
import { StoriesBarComponent } from '../stories-bar/stories-bar.component';
import { SubmitformComponent } from '../submitform/submitform.component';
import { StepDefinition } from '../model/StepDefinition';

describe('StoryEditorComponent', () => {
  let component: StoryEditorComponent;
  let fixture: ComponentFixture<StoryEditorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, FormsModule, ReactiveFormsModule, DragDropModule, MatTableModule],
      declarations: [ EditableComponent, ScenarioEditorComponent, ExampleTableComponent, ParentComponent, StoryEditorComponent, StoriesBarComponent, SubmitformComponent]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StoryEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });


    
  describe('set newSelectedStory', () => {
    it('should set newSelectedStory', () => {
      let story: Story = {"story_id": 123,"background":{"stepDefinitions":{"when":[]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"name":"failed Story creation","comment":"","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number": 7,"state":"open","title":"Story creation"};
      fixture.componentInstance.newSelectedStory = story;
      expect(component.selectedStory).toBe(story);
    });
  })

  describe('set newSelectedScenario', () => {
    it('should set newSelectedScenario without selectScenario', () => {
      let scenario : Scenario = {"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}};
      spyOn(component, 'selectScenario');
      fixture.componentInstance.newSelectedScenario = scenario;
      expect(component.selectedScenario).toBe(scenario);
      expect(component.selectScenario).not.toHaveBeenCalled();
    });
  
    it('should set newSelectedScenario with selectScenario', () => {
      let scenario : Scenario = {"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}};
      let story: Story = {"story_id": 123,"background":{"stepDefinitions":{"when":[]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number": 7,"state":"open","title":"Story creation"};
      component.selectedStory = story;
      spyOn(component, 'selectScenario');
      fixture.componentInstance.newSelectedScenario = scenario;
      expect(component.selectedScenario).toBe(scenario);
      expect(component.selectScenario).toHaveBeenCalled();
    });
  })

  describe('getBackgroundList', () => {
    it('should return backgroundList', () => {
      let stepDefinitions: StepDefinitionBackground = {"when":[{"_id":'5dce728851e70f2894a170b4',"id":"", "stepType":"when", "type" :"HoverOverAndSelect", "pre":"I hover over the element", "mid":"and select the option","values":["",""]}]};
      let when = component.getBackgroundList(stepDefinitions)
      expect(when).toBe(stepDefinitions.when);
    });
  });

  describe('backgroundNameChange', () => {
    it('should set selectedStory background name', () => {
      let name = 'TestBackground';
      let story: Story = {"story_id": 123,"background":{"stepDefinitions":{"when":[]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number": 7,"state":"open","title":"Story creation"};
      component.selectedStory = story;
      component.backgroundNameChange(name);
      expect(component.selectedStory.background.name).toBe(name);
    });
  })

  describe('updateBackground', () => {
    it('should update the background', () => {
      let storyID = 5;
      let story: Story = {"story_id": 123,"background":{"stepDefinitions":{"when":[]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number": 7,"state":"open","title":"Story creation"};
      component.selectedStory = story;
      spyOn(component.apiService, 'updateBackground').and.returnValue(of(''));
      component.updateBackground(storyID);
      expect(component.apiService.updateBackground).toHaveBeenCalled();
    });
  })

  describe('deleteBackground', () => {
    it('should delete the background', () => {
      let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number": 7,"state":"open","title":"Story creation"}];
      component.stories = stories;
      component.selectedStory = stories[0];
      spyOn(component.apiService, 'deleteBackground').and.returnValue(of(''));
      spyOn(component, 'backgroundDeleted');
      component.deleteBackground();
      expect(component.apiService.deleteBackground).toHaveBeenCalled();
      expect(component.backgroundDeleted).toHaveBeenCalled();
    });
  })

  describe('backgroundDeleted', () => {
    it('should delete the background', () => {
      let emptyBackground = {name, stepDefinitions: {when: []}};
      let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number": 7,"state":"open","title":"Story creation"}];
      component.stories = stories;
      component.selectedStory = stories[0];
      component.backgroundDeleted();
      expect(component.showBackground).toBeFalsy();
      expect(component.stories[component.stories.indexOf(component.selectedStory)].background).toEqual(emptyBackground);
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
  
  describe('addStepToBackground', () => {
    let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[{"_id":"5dce728851e70f2894a170ae","id":1,"stepType":"example","type":"Add Variable","pre":"","mid":"","values":["BLUBB"]}]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number": 7,"state":"open","title":"Story creation"}];
    beforeEach(() => {
      component.stories = stories;
      component.selectedStory = stories[0];
      component.selectedScenario = stories[0].scenarios[0];
    });

    it('should add a when step to the background', () => {
      let step: StepType = {"_id":"5dce728851e70f2894a170b0","id": 0,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":[""]}
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
      expect(JSON.stringify(component.selectedStory.background.stepDefinitions.when)).toContain(JSON.stringify(new_step));
      expect(component.getLastIDinStep).toHaveBeenCalled();
      expect(component.clone).toHaveBeenCalled();
    });
  });

  describe('createNewStep', () => {
    let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[{"_id":"5dce728851e70f2894a170ae","id":1,"stepType":"example","type":"Add Variable","pre":"","mid":"","values":["BLUBB"]}]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number": 7,"state":"open","title":"Story creation"}];
    beforeEach(() => {
      component.selectedStory = stories[0];
      component.selectedScenario = stories[0].scenarios[0];
    });

    it('should add a when step', () => {
      let step: StepType = {"_id":"5dce728851e70f2894a170b0","id": 0,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":[""]}
      const obj = component.clone( step );
      const new_step: StepType = {
        id: 6,
        mid: obj.mid,
        pre: obj.pre,
        stepType: obj.stepType,
        type: obj.type,
        values: obj.values
     };
      spyOn(component, 'getLastIDinStep').and.returnValue(5);
      let createdNewStep = component.createNewStep(step, component.selectedScenario.stepDefinitions);
      expect(component.getLastIDinStep).toHaveBeenCalled();
      expect(new_step).toEqual(createdNewStep);
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

  describe('removeStepFromBackround', () => {
    it('should remove the step of the background', () => {
      let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[{"_id":"5dce728851e70f2894a170b0","id":"","stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":[""]}]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number": 7,"state":"open","title":"Story creation"}];
      component.stories = stories;
      component.selectedStory = stories[0];
      expect(component.selectedStory.background.stepDefinitions.when.length).toBe(1);
      component.removeStepFromBackground(null, 0);
      expect(component.selectedStory.background.stepDefinitions.when.length).toBe(0);
    })

    it('should remove nothing', () => {
      let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number": 7,"state":"open","title":"Story creation"}];
      component.stories = stories;
      component.selectedStory = stories[0];
      expect(component.selectedStory.background.stepDefinitions.when.length).toBe(0);
      component.removeStepFromBackground(null, 0);
      expect(component.selectedStory.background.stepDefinitions.when.length).toBe(0);
    })
  })

  describe('addToValuesBackground', () => {
    it('should add hello to background values', () => {
      let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[{"_id":"5dce728851e70f2894a170b0","id":"","stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":[""]}]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number": 7,"state":"open","title":"Story creation"}];
      component.stories = stories;
      component.selectedStory = stories[0];
      let stepIndex = 0;
      let valueIndex = 0;
      let input = 'hello'

      component.addToValuesBackground(input, stepIndex, valueIndex);
      expect(component.selectedStory.background.stepDefinitions.when[stepIndex].values[valueIndex]).toBe(input);

    });
  });

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

  describe('deleteScenario', () => {
    it('should send delete request', () => {
      let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[]}},"scenarios":[{"scenario_id":1,"name":"successful Story creation","comment":"","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number": 7,"state":"open","title":"Story creation"}];
      component.stories = stories;
      component.selectedStory = stories[0];
      spyOn(component.apiService, 'deleteScenario').and.returnValue(of(''));
      spyOn(component, 'scenarioDeleted');

      component.deleteScenario(null);

      expect(component.apiService.deleteScenario).toHaveBeenCalled();
      expect(component.scenarioDeleted).toHaveBeenCalled();

    });
  })


  describe('scenarioDeleted', () => {
    it('should delete the Scenario', () => {
      let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[]}},"scenarios":[{"scenario_id":1,"name":"successful Story creation","comment":"","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number": 7,"state":"open","title":"Story creation"}];
      component.stories = stories;
      component.selectedStory = stories[0];
      component.selectedScenario = stories[0].scenarios[0];
      let indexScenario: number = component.selectedStory.scenarios.indexOf(component.selectedScenario);
      let deletedScenario = component.selectedStory.scenarios[indexScenario];
      
      component.scenarioDeleted();
      expect(component.showEditor).toBeFalsy();

      expect(component.stories[component.stories.indexOf(component.selectedStory)].scenarios).not.toContain(deletedScenario);
      expect(indexScenario).not.toBe(-1);

    });
  })

  describe('runTestScenario', () => {
    it('should start runTest', () => {
      let ids = {storyId: 1, scenarioId: 1};
      spyOn(component, 'runTests');
      component.runTestScenario(ids);
      expect(component.runTests).toHaveBeenCalled();
    });
  })

  //describe('runTests', () => {
  //  it('should start runTest', () => {
  //    let storyId = 1;
  //    let scenarioId= 1;
  //    let html = '<h1>Hi</h1>';
  //    spyOn(component, 'undefined_definition').and.returnValue([]);
  //    spyOn(component.apiService, 'runTests').and.returnValue(of('<h1>Hi</h1>'));
//
  //    component.runTests(storyId, scenarioId);
//
  //    expect(component.apiService.runTests).toHaveBeenCalled();
  //    //expect(component.undefined_definition).toHaveBeenCalled();
  //    expect(component.htmlReport).toBe(html);
  //    expect(component.testDone).toBeTruthy();
  //    expect(component.showResults).toBeTruthy();
  //    expect(component.testRunning).toBeFalsy();
  //  });
  //})


  //describe('addScenario', () => {
  //  it('should add Scenario', () => {
  //    let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[]}},"scenarios":[{"scenario_id":1,"name":"successful Story creation","comment":"","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number": 7,"state":"open","title":"Story creation"}];
  //    let newScenario: Scenario = {"name": "New Scenario","comment":"", "scenario_id": 2, "stepDefinitions": {"given": [], "when": [], "then": [], "example": []}};
  //    component.stories = stories;
  //    component.selectedStory = stories[0];
  //    let scenariosAmount = component.selectedStory.scenarios.length;
  //    spyOn(component.apiService, 'addScenario').and.returnValue(newScenario);
  //    spyOn(component, 'selectScenario');
//
  //    component.addScenario(stories[0].story_id);
//
  //    expect(component.apiService.addScenario).toHaveBeenCalled();
  //    expect(component.selectScenario).toHaveBeenCalled();
  //    expect(component.selectedStory.scenarios.length).toBe(scenariosAmount + 1)
  //  });
  //})


  describe('selectScenario', () => {
    it('should select the Scenario', () => {
      let scenario: Scenario = {"scenario_id":3,"comment":"","name":"Successful Login","stepDefinitions":{"given":[{"id":1,"mid":"","pre":"As a","stepType":"given","type":"Role","values":["Guest"]}],"when":[{"id":1,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":["https://github.com/login?return_to=%2Fjoin%3Fsource%3Dheader-home"]},{"id":2,"mid":"into the field","pre":"I insert","stepType":"when","type":"Field","values":["<userName>","login_field"]},{"id":3,"mid":"into the field","pre":"I insert","stepType":"when","type":"Field","values":["<password>","password"]},{"id":4,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["commit"]}],"then":[{"id":1,"mid":"","pre":"So I will be navigated to the website:","stepType":"then","type":"Website","values":["<website>"]}],"example":[{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["userName","password","website"]},{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["AdorableHamster","cutehamsterlikesnuts2000","https://github.com/"]},{"id":5,"mid":"into the field","pre":"I insert","stepType":"example","type":"Field","values":["NormalHamster","FatHamster123","https://github.com/"]},{"id":6,"mid":"","pre":"","stepType":"example","type":"Add Variable","values":["OldHamster","UglyHamster123","https://github.com/"]}]}};
      component.selectScenario(scenario);
      expect(component.selectedScenario).toBe(scenario);
      expect(component.showResults).toBe(false);
      expect(component.showEditor).toBe(true);
      expect(component.testDone).toBe(false);
    });
  });

  describe('selectStoryScenario', () => {
    it('should select the Story', () => {
      let stories : Story[]= [{"story_id": 123,"background":{"stepDefinitions":{"when":[{"_id":"5dce728851e70f2894a170b0","id":"","stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":[]}]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["<Guest>"],"selection":["Guest","User"]}],"when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"]}],"example":[{"id":6,"mid":"","pre":"","stepType":"example","type":"Add Variable","values":["OldHamster"]}]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"selection":["Guest","User"]}],"when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"]},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"]}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number": 7,"state":"open","title":"Story creation"}];
      component.stories = stories;
      spyOn(component, 'selectScenario');
      component.selectStoryScenario(stories[0]);
      expect(component.selectedStory).toBe(stories[0]);
      expect(component.showResults).toBe(false);
      expect(component.showEditor).toBe(true);
      expect(component.selectScenario).toHaveBeenCalled();
    });
  });

});
