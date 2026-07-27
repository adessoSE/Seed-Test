import { DragDropModule } from '@angular/cdk/drag-drop';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import {ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ResizeInputDirective } from '../directives/resize-input.directive';
import { ScenarioEditorComponent } from './scenario-editor.component';
import { BaseEditorComponent } from '../base-editor/base-editor.component';
import { Scenario } from '@shared/models/Scenario';
import { Story } from '@shared/models/Story';
import { NO_ERRORS_SCHEMA } from '@angular/core';


const scenarios:Scenario[] = [{scenario_id: 2, name: 'my first scenario', stepDefinitions: {'when':[{'_id':'5dce728851e70f2894a170b4','id': 6, 'stepType':'when', 'type' :'HoverOverAndSelect', 'pre':'I hover over the element', 'mid':'and select the option','values':['',''], 'post':'', 'isExample':[]}], 'given':[{'_id':'5dce728851e70f2894a170b4','id': 6, 'stepType':'when', 'type' :'HoverOverAndSelect', 'pre':'I hover over the element', 'mid':'and select the option','values':['',''], 'post':'', 'isExample':[]}],'then':[], 'example': []},
	comment: 'write some words about this scenario', lastTestPassed: false,
	saved: true, stepWaitTime: 200, browser: 'chrome'}];


describe('ScenarioEditorComponent', () => {
	let component: ScenarioEditorComponent;
	let fixture: ComponentFixture<ScenarioEditorComponent>;

	beforeEach(waitForAsync(() => {
		TestBed.configureTestingModule({
    imports: [HttpClientTestingModule, FormsModule, ReactiveFormsModule, DragDropModule, MatTableModule, MatSnackBarModule, ScenarioEditorComponent, ResizeInputDirective],
    schemas: [NO_ERRORS_SCHEMA]
})
			.overrideComponent(BaseEditorComponent, { set: { template: '', imports: [] } })
			.compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(ScenarioEditorComponent);
		component = fixture.componentInstance;
		component.selectedScenario = scenarios[0];
		fixture.componentRef.setInput('selectedStory', {
			story_id: 1, title: 'Test Story', body: '', storySource: 'github',
			background: { name: '', stepDefinitions: { when: [] } },
			scenarios, state: 'open', assignee: '', assignee_avatar_url: '', repo_type: 'github'
		} as Story);
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

});