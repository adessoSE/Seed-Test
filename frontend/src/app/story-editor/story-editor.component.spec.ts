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
import { StoriesBarComponent } from '../stories-bar/stories-bar.component';
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

let scenario : Scenario = {"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"], "post": "","isExample":[]}],"when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"], "post": "", "isExample":[]},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"], "post": "", "isExample":[]}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"], "post": "", "isExample":[]}],"example":[]}};
  let story: Story = {"_id": "a","story_id": 123, "storySource": "db","background":{"stepDefinitions":
  {"when":[]}},"scenarios":[{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":
  {"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"], "post": "", "isExample":[]}],
  "when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"], "post": "", "isExample":[]},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"], "post": "", "isExample":[]}],"then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["New Story created","Success"], "post": "", "isExample":[]}],
  "example":[]}},{"scenario_id":3,"name":"failed Story creation","comment":"","stepDefinitions":{"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"], "post": "", "isExample":[]}],
  "when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"","values":["www.cucumber.com"], "post": "", "isExample":[]},{"id":2,"stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":["Create Story"], "post": "", "isExample":[]}],
  "then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"], "post":"", "isExample":[]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number": 7,"state":"open","title":"Story creation"};
  
  let stories : Story[]= [{"story_id": 123,"_id":2,"storySource":"github", "background":
  {"stepDefinitions":{"when":[]}},"scenarios":
  [{"scenario_id":1,"comment":"","name":"successful Story creation","stepDefinitions":
  {"given":[{"id":1,"stepType":"given","type":"Role","pre":"As a","mid":"","values":["Guest"], "post":"", "isExample":[] }],
  "when":[{"id":1,"stepType":"when","type":"Website","pre":"I am on the website:","mid":"",
  "values":["www.cucumber.com"],"post":"", "isExample":[]},{"id":2,"stepType":"when","type":"Button",
  "pre":"I click the button:","mid":"","values":["Create Story"],"post":"", "isExample":[]}],
  "then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text",
  "mid":"in the textbox:","values":["New Story created","Success"], "post": "","isExample":[]}],
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
  "then":[{"id":2,"stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["Could not create Story","Error"], "post":"","isExample":[]}],"example":[]}}],"assignee":"cniebergall","assignee_avatar_url":"https://avatars1.githubusercontent.com/u/45001224?v=4","body":"As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n","issue_number": 7,"state":"open","title":"Story creation"}];

  
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

  /* describe('backgroundNameChange', () => {
    it('should set selectedStory background name', () => {
      let name = 'TestBackground';
      component.selectedStory = story;
      component.backgroundNameChange(name);
      expect(component.selectedStory.background.name).toBe(name);
    });
  }) */

  describe('updateBackground', () => {
    it('should update the background', () => {
      component.selectedStory = story;
      jest.spyOn(component.backgroundService, 'updateBackground');
      component.updateBackground();
      expect(component.backgroundService.updateBackground).toHaveBeenCalled();
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
      jest.spyOn(component.scenaroiService, 'deleteScenario');
      jest.spyOn(component, 'scenarioDeleted');
      //expect(component.stories).toContain(scenario);
      component.deleteScenario(component.selectedStory.scenarios[0]);
      fixture.detectChanges();
      expect(component.scenaroiService.deleteScenario).toHaveBeenCalled();
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
      jest.spyOn(component.storyService, 'runTests');
      component.storyService.runTests(component.selectedStory._id, component.selectedStory.storySource, scenarioId, {}).subscribe((resp)=> {
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
      jest.spyOn(component.scenaroiService, 'addScenario');
      component.scenaroiService.addScenario(component.selectedStory._id, component.selectedStory.storySource, scenarioName).subscribe((resp)=> {
        expect(component.scenaroiService.addScenario).toHaveBeenCalled();
        expect(component.selectedStory.scenarios.length).toBe(scenariosAmount + 1);
      });
    });

    it('should call selectScenario', waitForAsync(() => {
      let scenarioName = "my new name";
      component.selectedStory = story;
      let scenariosAmount = component.selectedStory.scenarios.length;
      fixture.detectChanges();
      jest.spyOn(component, 'selectScenario');
      component.scenaroiService.addScenario(component.selectedStory._id, component.selectedStory.storySource, scenarioName).subscribe((resp)=> {
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
      jest.spyOn(component.storyService.renameStoryEvent, 'emit');
      component.storyService.renameStoryEmit(newStoryTitle, newStoryDescription);
      expect(component.storyService.renameStoryEvent.emit).toHaveBeenCalled();
      expect(component.storyService.renameStoryEvent.emit).toHaveBeenCalledTimes(1);
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


