import { HttpClientTestingModule } from '@angular/common/http/testing';
import { waitForAsync, ComponentFixture, TestBed, fakeAsync, inject, async, tick } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { ToastrModule } from 'ngx-toastr';
import { StoryEditorComponent } from './story-editor.component';
import { StepDefinitionBackground } from '../model/StepDefinitionBackground';
import { Story } from '../model/Story';
import { StepType } from '../model/StepType';
import { Scenario } from '../model/Scenario';
import { ScenarioEditorComponent } from '../scenario-editor/scenario-editor.component';
import { ExampleTableComponent } from '../example-table/example-table.component';
import { MatTableModule } from '@angular/material/table';
import { EditableComponent } from '../editable/editable.component';
import { ParentComponent } from '../parent/parent.component';
import { StoriesBarComponent } from '../stories-bar/stories-bar.component';;
import { StepDefinition } from '../model/StepDefinition';
import { Component, Injectable, NO_ERRORS_SCHEMA, ViewChild } from '@angular/core';
import { ApiService } from '../Services/api.service';
import { findComponent } from 'src/test_helper';
import { RenameStoryComponent } from '../modals/rename-story/rename-story.component';
import { MAT_SELECT_SCROLL_STRATEGY_PROVIDER } from '@angular/material/select';

@Injectable()
class FakeService {
  constructor() {}
  deleteScenario(storyId, storySource, scenarios) {};
}

@Component({
  template: `
    <ng-template #renameStoryModal>The modal window is open!</ng-template>
  `,
})

class MockRenameStoryModal {
  @ViewChild('renameStoryModal') renameStoryCompRef: MockRenameStoryModal;

  openRenameStoryModal = jest.fn();

}

let scenario : Scenario = {"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"], "post": ""}],"when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"], "post": ""},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"], "post": ""}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"], "post": ""}],"example":[]}};
  let story: Story = {"_id": "a","story_id": 123, "storySource": "db","background":{"stepDefinitions":
  {"when":[]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":
  {"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"], "post": ""}],
  "when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"], "post": ""},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"], "post": ""}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"], "post": ""}],
  "example":[]}},{"scenario_id":3,"name":"failed Story creation","comment":"","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"], "post": ""}],
  "when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"], "post": ""},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"], "post": ""}],
  "then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"], "post":""}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number": 7,"state":"open","title":"Story creation"};
  let stepDefinitions: StepDefinitionBackground = {"when":[{"_id":'5dce728851e70f2894a170b4',"id": 6, "stepType":"when", "type" :"HoverOverAndSelect", "pre":"I hover over the element", "mid":"and select the option","values":["",""], "post":""}]};
  let stories : Story[]= [{"story_id": 123,"_id":2,"storySource":"github", "background":
  {"stepDefinitions":{"when":[]}},"scenarios":
  [{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":
  {"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"], "post":""}],
  "when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"",
  "values":["www.cucumber.com"],"post":""},{"id":2,"stepType":"when","type":"Button",
  "pre":"I click the button:","mid":"","values":["Create Story"],"post":""}],
  "then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text",
  "mid":"in the textbox:","values":["New Story created","Success"], "post": ""}],
  "example":[]}},{"scenario_id":3,"comment":"","name":"failed Story creation",
  "stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"",
  "values":["Guest"],"post":""}],"when":[{"id":1,"stepType":"when","type":"Website",
  "pre":"I am on the website:","mid":"","values":["www.cucumber.com"],"post":""},
  {"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"",
  "values":["Create Story"],"post":""}],"then":[{"id":2,"stepType":"then","type":"Text",
  "pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"], 
  "post":""}],"example":[{"_id":"5dce728851e70f2894a170ae","id":1,"stepType":"example",
  "type":"Add Variable","pre":"","mid":"","values":["BLUBB"], "post": ""}]}}],
  "assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4",
  "body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number": 7,"state":"open","title":"Story creation"},
  {"_id": "a","story_id": 123, "storySource": "db","background":{"stepDefinitions":
  {"when":[]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":
  {"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"], "post": ""}],
  "when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"], "post": ""},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"], "post": ""}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"], "post": ""}],
  "example":[]}},{"scenario_id":3,"name":"failed Story creation","comment":"","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"], "post": ""}],
  "when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"], "post": ""},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"], "post": ""}],
  "then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"], "post":""}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number": 7,"state":"open","title":"Story creation"}];

  
describe('StoryEditorComponent', () => {
  let apiService: ApiService;
  let component: StoryEditorComponent;
  let fixture: ComponentFixture<StoryEditorComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, ToastrModule.forRoot(), FormsModule, ReactiveFormsModule, DragDropModule, MatTableModule],
      providers: [ApiService],
      declarations: [ EditableComponent, ScenarioEditorComponent, ExampleTableComponent, ParentComponent, StoryEditorComponent, StoriesBarComponent, RenameStoryComponent],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();
  }));

  beforeEach(inject([ApiService], s => {
    apiService = s;
    fixture = TestBed.createComponent(StoryEditorComponent);
    component = fixture.componentInstance;
    component.selectedStory = story;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('set newSelectedStory', () => {
    it('should set newSelectedStory', () => {
      fixture.componentInstance.newSelectedStory = story;
      expect(component.selectedStory).toBe(story);
    });
  });

  describe('set newSelectedScenario', () => {
    it('should set newSelectedScenario without selectScenario', () => {
      jest.spyOn(component, 'selectScenario');
      fixture.componentInstance.newSelectedScenario = story.scenarios[1];
      expect(component.selectedScenario).toBe(story.scenarios[1]);
      expect(component.selectScenario).toHaveBeenCalledWith(story.scenarios[1]);
    });
  
    it('should set newSelectedScenario with selectScenario', () => {
      component.selectedStory = story;
      jest.spyOn(component, 'selectScenario');
      fixture.componentInstance.newSelectedScenario = scenario;
      expect(component.selectedScenario).toBe(scenario);
      expect(component.selectScenario).toHaveBeenCalled();
    });
  })

  describe('getBackgroundList', () => {
    it('should return backgroundList', () => {
      let when = component.getBackgroundList(stepDefinitions)
      expect(when).toBe(stepDefinitions.when);
    });
  });

  describe('backgroundNameChange', () => {
    it('should set selectedStory background name', () => {
      let name = 'TestBackground';
      component.selectedStory = story;
      component.backgroundNameChange(name);
      expect(component.selectedStory.background.name).toBe(name);
    });
  })

  describe('updateBackground', () => {
    it('should update the background', () => {
      component.selectedStory = story;
      jest.spyOn(component.apiService, 'updateBackground');
      component.updateBackground();
      expect(component.apiService.updateBackground).toHaveBeenCalled();
    });
  });

  describe('deleteBackgroundd', () => {
    it('should delete the background', () => {
      let emptyBackground = {stepDefinitions: {when: []}};
      //let stories : Story[]= [{"story_id": 123,"_id":"dfhu", "storySource":"github","background":{"stepDefinitions":{"when":[]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","post":"","values":["Guest"]}],"when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"", "post": "","values":["www.cucumber.com"]},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"", "post":"","values":["Create Story"]}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","post":"","values":["New Story created","Success"]}],"example":[]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","post":"","values":["Guest"]}],"when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","post":"","values":["www.cucumber.com"]},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","post":"","values":["Create Story"]}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","post":"","values":["Could not create Story","Error"]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number": 7,"state":"open","title":"Story creation"}];
      component.stories = stories;
      component.selectedStory = stories[0];
      
      component.deleteBackground();
      expect(component.showBackground).toBeFalsy();
      expect(component.stories[component.stories.indexOf(component.selectedStory)].background).toEqual(emptyBackground);
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
    beforeEach(() => {
      component.stories = stories;
      component.selectedStory = stories[0];
      component.selectedScenario = stories[0].scenarios[0];
    });

    it('should add a when step to the background', fakeAsync(() => {
      let step: StepType = {"_id":"5dce728851e70f2894a170b0","id": 0,"stepType":"when","type":"Button","pre":"I click the button:","mid":"", "post": "","values":[""]}
      let storyId = "shfisheiu";
      jest.spyOn(component, 'addStepToBackground');
      const newStep = component.createNewStep(step, component.selectedStory.background.stepDefinitions);
      component.addStepToBackground(storyId, step);
      tick();
      expect(component.selectedStory.background.stepDefinitions.when).toContainEqual(newStep);
      expect(component.addStepToBackground).toHaveBeenCalled();
    }));
  });


  describe('getLastIDinStep', () => {
    it('should return the last id in step given', () => {
      let stepDefs : StepDefinition = {"given":[],"when":[{"id":1,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":[""], "post":""},
      {"id":2,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":[""],"post":""}],
      "then":[{"id":1,"mid":"","pre":"So I will be navigated to the website:","stepType":"then","type":"Website","values":["<fea>"], "post":""}],
      "example":[{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["fea"],"post":""},
      {"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["valueadf"],"post":""},
      {"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["value"],"post":""}]};
      
      let stepType = 'given'
      let returnNumber = 0;
      jest.spyOn(component, 'buildID');
      component.getLastIDinStep(stepDefs , stepType);
      expect(component.buildID).toHaveReturnedWith(returnNumber);
    });

    it('should return the last id in step when', () => {
      let stepDefs : StepDefinition = {"given":[],"when":[{"id":1,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":[""], "post":""},
      {"id":5,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":[""],"post":""}],
      "then":[{"id":1,"mid":"","pre":"So I will be navigated to the website:","stepType":"then","type":"Website","values":["<fea>"], "post":""}],
      "example":[{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["fea"],"post":""},
      {"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["valueadf"],"post":""},
      {"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["value"],"post":""}]};
      
      let stepType = 'when'
      let returnNumber = 5;
      jest.spyOn(component, 'buildID');
      component.getLastIDinStep(stepDefs, stepType);
      expect(component.buildID).toHaveReturnedWith(returnNumber);
    });

    it('should return the last id in step then', () => {
      let stepDefs : StepDefinition = {"given":[],"when":[{"id":1,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":[""], "post":""},
      {"id":2,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":[""],"post":""}],
      "then":[{"id":5,"mid":"","pre":"So I will be navigated to the website:","stepType":"then","type":"Website","values":["<fea>"], "post":""}],
      "example":[{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["fea"],"post":""},
      {"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["valueadf"],"post":""},
      {"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["value"],"post":""}]};
      
      let stepType = 'then'
      let returnNumber = 5;
      jest.spyOn(component, 'buildID');
      component.getLastIDinStep(stepDefs, stepType);
      expect(component.buildID).toHaveReturnedWith(returnNumber);
    });

    it('should return the last id in step example', () => {
      let stepDefs : StepDefinition = {"given":[],"when":[{"id":1,"mid":"","pre":"I go to the website:","stepType":"when","type":"Website","values":[""], "post":""},
      {"id":2,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":[""],"post":""}],
      "then":[{"id":1,"mid":"","pre":"So I will be navigated to the website:","stepType":"then","type":"Website","values":["<fea>"], "post":""}],
      "example":[{"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["fea"],"post":""},
      {"id":2,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["valueadf"],"post":""},
      {"id":5,"mid":"","pre":"So I will be navigated to the website:","stepType":"example","type":"Website","values":["value"],"post":""}]};
      
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

  describe('removeStepFromBackround', () => {
    it('should remove the step of the background', () => {
      let story : Story= {"story_id": 123, "_id":1, "storySource": "github","background":{"stepDefinitions":{"when":[{"_id":"5dce728851e70f2894a170b0","id":1,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":[""],"post": ""}]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"post": ""}],"when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"], "post":""},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"],"post":""}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"],"post":""}],"example":[]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"post":""}],"when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"], "post":""},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"],"post":""}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"],"post":""}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number": 7,"state":"open","title":"Story creation"};
      component.stories = stories;
      component.selectedStory = stories[0];
      expect(component.selectedStory.background.stepDefinitions.when.length).toBe(1);
      component.selectedStory.background.stepDefinitions["when"][0].checked = true;
      component.removeStepFromBackground();
      expect(component.selectedStory.background.stepDefinitions.when.length).toBe(0);
    })
  })

  describe('addToValuesBackground', () => {
    it('should add hello to background values', () => {
      let stories : Story[]= [{"story_id": 123, "_id":1, "storySource": "github","background":{"stepDefinitions":{"when":[{"_id":"5dce728851e70f2894a170b0","id":1,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":[""],"post": ""}]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"post": ""}],"when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"], "post":""},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"],"post":""}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"],"post":""}],"example":[]}},{"scenario_id":3,"comment":"","name":"failed Story creation","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"],"post":""}],"when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"], "post":""},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"],"post":""}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"],"post":""}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number": 7,"state":"open","title":"Story creation"}];
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
    it('should send delete request', waitForAsync((done) => {
      component.stories = stories;
      component.selectedStory = stories[0];
      jest.spyOn(component.apiService, 'deleteScenario');
      jest.spyOn(component, 'scenarioDeleted');
      //expect(component.stories).toContain(scenario);
      component.deleteScenario(component.selectedStory.scenarios[0]);
      fixture.detectChanges();
      expect(component.apiService.deleteScenario).toHaveBeenCalled();
    }));
  });


  describe('scenarioDeleted', () => {
    it('should delete the Scenario', () => {
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

  describe('runTests', () => {

    /* it('should call api.runTests', fakeAsync(() => {
      let scenarioId = 1;
      component.scenarioChild = findComponent(fixture, '#scenarioChild');
      //component.selectedScenario = scenario;
      component.selectedStory = story;
      jest.spyOn(component, 'runTests');
      component.runTests(scenarioId);
      expect(component.runTests).toHaveBeenCalled();
      expect(component.apiService.runTests).toHaveBeenCalled();
    })); */ 

    it('should start runTest', () => {
      let scenarioId= 1;
      component.selectedStory = story;
      component.scenarioChild = findComponent(fixture, '#scenarioChild');
      let html = '<h1 #testFrame>Hi</h1>';
      jest.spyOn(component.apiService, 'runTests');
      component.apiService.runTests(component.selectedStory._id, component.selectedStory.storySource, scenarioId, {}).subscribe((resp)=> {
        expect(component.htmlReport).toBe(html);
        expect(component.testDone).toBeTruthy();
        expect(component.showResults).toBeTruthy();
        expect(component.testRunning).toBeFalsy();
      });

      
      
    });
  })

  describe('addScenario', () => {
    it('should add Scenario', () => {
      let scenarioName = "my new name";
      component.selectedStory = stories[0];
      let scenariosAmount = component.selectedStory.scenarios.length;
      jest.spyOn(component.apiService, 'addScenario');
      component.apiService.addScenario(component.selectedStory._id, component.selectedStory.storySource, scenarioName).subscribe((resp)=> {
        expect(component.apiService.addScenario).toHaveBeenCalled();
        expect(component.selectedStory.scenarios.length).toBe(scenariosAmount + 1);
      });
    });

    it('should call selectScenario', waitForAsync(() => {
      let scenarioName = "my new name";
      component.selectedStory = story;
      let scenariosAmount = component.selectedStory.scenarios.length;
      fixture.detectChanges();
      jest.spyOn(component, 'selectScenario');
      component.apiService.addScenario(component.selectedStory._id, component.selectedStory.storySource, scenarioName).subscribe((resp)=> {
        expect(component.selectScenario).toHaveBeenCalled();
        expect(component.selectedStory.scenarios.length).toEqual(scenariosAmount +1);
      });
    }));


  });


  describe('selectScenario', () => {
    it('should select the Scenario', () => {
      component.selectScenario(scenario);
      expect(component.selectedScenario).toBe(scenario);
      expect(component.showResults).toBeFalsy();
      expect(component.showEditor).toBeTruthy();
      expect(component.testDone).toBeFalsy();
    });
  });

  describe('selectStoryScenario', () => {
    it('should select the Story', () => {
      component.stories = stories;
      jest.spyOn(component, 'selectScenario');
      component.selectStoryScenario(stories[0]);
      expect(component.selectedStory).toBe(stories[0]);
      expect(component.showResults).toBeFalsy();
      expect(component.showEditor).toBeTruthy();
      expect(component.selectScenario).toHaveBeenCalled();
    });
  });

  describe('renameStoryEmit', () => {
    it('should emit', () => {
      let newStoryTitle = "This is my new story title";
      let newStoryDescription = "I let here a brief description";
      jest.spyOn(component.apiService.renameStoryEvent, 'emit');
      component.apiService.renameStoryEmit(newStoryTitle, newStoryDescription);
      expect(component.apiService.renameStoryEvent.emit).toHaveBeenCalled();
      expect(component.apiService.renameStoryEvent.emit).toHaveBeenCalledTimes(1);
    });
  });

  describe('renameStoryTitle', () => {
    let mockComp: MockRenameStoryModal;
  
    beforeEach(() => {  
      mockComp = new MockRenameStoryModal();
    });
    it('should call openRenameStoryModal',() => {
      component.stories = stories;
      //component.selectedStory = story;
      jest.spyOn(component, "changeStoryTitle").mockImplementation(mockComp.openRenameStoryModal);
      component.changeStoryTitle();
      expect(mockComp.openRenameStoryModal).toHaveBeenCalled();
      expect(mockComp.openRenameStoryModal).toHaveBeenCalledTimes(1);
    });
  });

}); 


