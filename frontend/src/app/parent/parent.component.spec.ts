import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ParentComponent } from './parent.component';
import { StoriesBarComponent } from '../stories-bar/stories-bar.component';
import { ScenarioEditorComponent } from '../scenario-editor/scenario-editor.component';
import { ExampleTableComponent } from '../example-table/example-table.component';
import { EditableComponent } from '../editable/editable.component';
import {DragDropModule} from '@angular/cdk/drag-drop';
import {MatTableModule} from '@angular/material';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { componentFactoryName } from '@angular/compiler';
import { Story } from '../model/Story';
import { Scenario } from '../model/Scenario';
import { CDK_DESCRIBEDBY_ID_PREFIX } from '@angular/cdk/a11y';
import { of } from 'rxjs';
import { StoryEditorComponent } from '../story-editor/story-editor.component';
import { SubmitformComponent } from '../submitform/submitform.component';

describe('ParentComponent', () => {
  let component: ParentComponent;
  let fixture: ComponentFixture<ParentComponent>;
  let story: Story;
  let scenario: Scenario;
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, DragDropModule, HttpClientTestingModule, FormsModule, ReactiveFormsModule, MatTableModule],
      declarations: [ EditableComponent, ParentComponent, StoriesBarComponent, ScenarioEditorComponent, ExampleTableComponent, StoryEditorComponent, SubmitformComponent ]
    })
    .compileComponents();
  }));
  
  beforeEach(() => {
    fixture = TestBed.createComponent(ParentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    story = {issue_number: 123 , story_id: 1231, title:'123', 
    body: "Als Premium Kunde erhalte ich freien Versand, wenn ich 5 Bücher bestelle", 
    state: "open", assignee: "adessoCucumber", 
    assignee_avatar_url: "https://avatars0.githubusercontent.com/u/50622173?v=4",
    background: {name: 'testBackground2', stepDefinitions: {when: 'testWhen2'}}, 
    scenarios: [{scenario_id: 789,comment:"", name: 'scenarioName2', 
    stepDefinitions: {given:[], when: [], then: [], example: []}}]}
    scenario = {scenario_id: 789,comment:"", name: 'scenarioName2', stepDefinitions: {given:[], when: [], then: [], example: []}};
  });
  
  it('should create', () => {
    expect(component).toBeTruthy();
  });
  
  describe('setSelectedStory', function(){
    it('should set the story', () => {
      expect(component.selectedStory).toBe(undefined);
      component.setSelectedStory(story);
    
      expect(component.selectedStory).toBe(story);
    });
  });
  
  describe('setSelectedScenario', function(){
    it('should set the scenario', () => {
      expect(component.selectedScenario).toBe(undefined);
      component.setSelectedScenario(scenario);
    
      expect(component.selectedScenario).toBe(scenario);
    });
  });
  
  describe('loadStories', function(){
    beforeEach(function(){
      let repository = 'adessoCucumber/Cucumber';
      localStorage.setItem('repository', repository);
    
    });
  
    afterEach(function(){
      localStorage.removeItem('repository');
    });
  
    it('should set the stories', function(){
      let stories: Story[] = [{"story_id":540215588,"title":"Finden eines Elements über den Hover-Text","body":"HTML-Elemente wie Buttons, Textfelder, etc. via ihrem Hover-Text finden.","state":"open","issue_number":67,"assignee":"dsorna","assignee_avatar_url":"https://avatars3.githubusercontent.com/u/44997601?v=4","scenarios":[{"scenario_id":1,"comment":"","name":"Find Button By Hover-Text","stepDefinitions":{"given":[{"id":1,"mid":"","pre":"I am on the website:","stepType":"given","type":"Website","values":["https://seed-test-frontend.herokuapp.com/"]}],"when":[{"id":1,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["story0"]},{"id":2,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["Runs all scenario tests for the story"]},{"id":3,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["logout"]}],"then":[],"example":[]}},{"scenario_id":2,"comment":"","name":"Fail Finding Button due to wrong Hover-Text","stepDefinitions":{"given":[{"id":1,"mid":"","pre":"I am on the website:","stepType":"given","type":"Website","values":["https://seed-test-frontend.herokuapp.com/#"]}],"when":[{"id":1,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["story0"]},{"id":2,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["TESTRuns all scenario tests for the story"]},{"id":3,"mid":"","pre":"I click the button:","stepType":"when","type":"Button","values":["logout"]}],"then":[],"example":[]}}],"background":null}];
      spyOn(component.apiService, 'getStories').and.returnValue(of(stories))
      component.loadStories();
      expect(component.apiService.getStories).toHaveBeenCalled();
      expect(component.stories).toBe(stories);
    });
  });

});
