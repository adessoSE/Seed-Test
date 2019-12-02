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

describe('ParentComponent', () => {
  let component: ParentComponent;
  let fixture: ComponentFixture<ParentComponent>;
  let story: Story;
  let scenario: Scenario;
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, DragDropModule, HttpClientTestingModule, FormsModule, ReactiveFormsModule, MatTableModule],
      declarations: [ EditableComponent, ParentComponent, StoriesBarComponent, ScenarioEditorComponent, ExampleTableComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ParentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    story = {issue_number: 123 , story_id: '1231', title:'123', 
    body: "Als Premium Kunde erhalte ich freien Versand, wenn ich 5 Bücher bestelle", 
    state: "open", assignee: "adessoCucumber", 
    assignee_avatar_url: "https://avatars0.githubusercontent.com/u/50622173?v=4",
    background: {name: 'testBackground2', stepDefinitions: {when: 'testWhen2'}}, 
    scenarios: [{scenario_id: 789, name: 'scenarioName2', 
    stepDefinitions: {given:[], when: [], then: [], example: []}}]}
    scenario = {scenario_id: 789, name: 'scenarioName2', stepDefinitions: {given:[], when: [], then: [], example: []}};
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('setSelectedStory', () => {
    expect(component.selectedStory).toBe(undefined);
    component.setSelectedStory(story);

    expect(component.selectedStory).toBe(story);
  })

  it('setSelectedScenario', () => {
    expect(component.selectedScenario).toBe(undefined);
    component.setSelectedScenario(scenario);

    expect(component.selectedScenario).toBe(scenario);
  })

});
