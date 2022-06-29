import { DragDropModule } from '@angular/cdk/drag-drop';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import {ComponentFixture, fakeAsync, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { By } from '@angular/platform-browser';
import { ToastrModule } from 'ngx-toastr';
import { ResizeInputDirective } from '../directives/resize-input.directive';
import { ExampleTableComponent } from '../example-table/example-table.component';
import { ScenarioEditorComponent } from './scenario-editor.component';
import {Scenario} from '../model/Scenario'
import {StepDefinition} from '../model/StepDefinition'
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { StepType } from '../model/StepType';

const scenarios:Scenario[] = [{scenario_id: 2, name: 'my first scenario', stepDefinitions: {"when":[{"_id":'5dce728851e70f2894a170b4',"id": 6, "stepType":"when", "type" :"HoverOverAndSelect", "pre":"I hover over the element", "mid":"and select the option","values":["",""], "post":""}], "given":[{"_id":'5dce728851e70f2894a170b4',"id": 6, "stepType":"when", "type" :"HoverOverAndSelect", "pre":"I hover over the element", "mid":"and select the option","values":["",""], "post":""}],"then":[], "example": []},
                            comment: 'write some words about this scenario', lastTestPassed: false,
                          saved: true, daisyAutoLogout: true, stepWaitTime: 200, browser: 'chrome'}]


describe('ScenarioEditorComponent', () => {
  let component: ScenarioEditorComponent;
  let fixture: ComponentFixture<ScenarioEditorComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, FormsModule, ReactiveFormsModule, DragDropModule, MatTableModule, ToastrModule.forRoot()],
      declarations: [ ScenarioEditorComponent, ResizeInputDirective],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ScenarioEditorComponent);
    component = fixture.componentInstance;
    component.selectedScenario = scenarios[0];
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('addStepToScenario', () => {
    beforeEach(() => {
      component.selectedScenario = scenarios[0];
    });
   
    it('should add a when step', fakeAsync(() => {
      let step: StepType = {"_id":"5dce728851e70f2894a170b0","id": 0,"stepType":"when","type":"Button","pre":"I click the button:","mid":"", "post": "","values":[""]}
      jest.spyOn(component, 'createNewStep');
      let newStep = component.createNewStep( step, component.selectedScenario.stepDefinitions);
      component.addStepToScenario(step, component.selectedScenario.stepDefinitions);
      expect(component.createNewStep).toHaveBeenCalled();
      expect(component.selectedScenario.stepDefinitions.when).toContainEqual(newStep);
    }));

  });

});