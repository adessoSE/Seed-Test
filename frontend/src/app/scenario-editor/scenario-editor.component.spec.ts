import { async, ComponentFixture, TestBed } from '@angular/core/testing';

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
  })
});
