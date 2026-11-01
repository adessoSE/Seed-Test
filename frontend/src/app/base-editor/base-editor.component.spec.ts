import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { Scenario } from '@seed-test/shared/models/Scenario';
import { StepType } from '@seed-test/shared/models/StepType';
import { Story } from '@seed-test/shared/models/Story';
import { BaseEditorComponent } from './base-editor.component';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { StepDefinition } from '@seed-test/shared/models/StepDefinition';
import { vi } from 'vitest';
import { throwError } from 'rxjs';
import { BlockService } from '../Services/block.service';
import { Block } from '@seed-test/shared/models/Block';
import { NotificationService } from '../Services/notification.service';
import { MultipleScenario } from '@seed-test/shared/models/MuiltipleScenario';


const stepBackgroundDefinitions: StepDefinition = {'given': [], 'when':[{'_id':'5dce728851e70f2894a170b4','id': 6, 'stepType':'when', 'type' :'HoverOverAndSelect', 'pre':'I hover over the element', 'mid':'and select the option','values':['',''], 'post':'', 'isExample':[]}], 'then': [], 'example':[]};

const stories : Story[] = [{'story_id': 123,'_id':'2','storySource':'github', 'repo_type':'github', 'background':
  {'stepDefinitions':{'when':[]}},'scenarios':
  [{'scenario_id':1,'comment':'','name':'successful Story creation','stepDefinitions':
  {'given':[{'id':1,'stepType':'given','type':'Role','pre':'As a','mid':'','values':['Guest'], 'post':'', 'isExample':[]}],
  	'when':[{'id':1,'stepType':'when','type':'Website','pre':'I am on the website:','mid':'',
  		'values':['www.cucumber.com'],'post':'', 'isExample':[]},{'id':2,'stepType':'when','type':'Button',
  		'pre':'I click the button:','mid':'','values':['Create Story'],'post':'','isExample':[]}],
  	'then':[{'id':2,'stepType':'then','type':'Text','pre':'So I can see the text',
  		'mid':'in the textbox:','values':['New Story created','Success'], 'post': '', 'isExample':[]}],
  	'example':[]}},{'scenario_id':3,'comment':'','name':'failed Story creation',
  	'stepDefinitions':{'given':[{'id':1,'stepType':'given','type':'Role','pre':'As a','mid':'',
  		'values':['Guest'],'post':'', 'isExample':[]}],'when':[{'id':1,'stepType':'when','type':'Website',
  		'pre':'I am on the website:','mid':'','values':['www.cucumber.com'],'post':'', 'isExample':[]},
  	{'id':2,'stepType':'when','type':'Button','pre':'I click the button:','mid':'',
  		'values':['Create Story'],'post':'', 'isExample':[]}],'then':[{'id':2,'stepType':'then','type':'Text',
  		'pre':'So I can see the text','mid':'in the textbox:','values':['Could not create Story','Error'], 
  		'post':'', 'isExample':[]}],'example':[{'_id':'5dce728851e70f2894a170ae','id':1,'stepType':'example',
  		'type':'Add Variable','pre':'','mid':'','values':['BLUBB'], 'post': '', 'isExample':[]}]}}],
'assignee':'cniebergall','assignee_avatar_url':'https://avatars1.githubusercontent.com/u/45001224?v=4',
'body':'As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n','issue_number': 7,'state':'open','title':'Story creation'},
{'_id': 'a','story_id': 123, 'storySource': 'db','repo_type':'db','background':{'stepDefinitions':
  {'when':[]}},'scenarios':[{'scenario_id':1,'comment':'','name':'successful Story creation','stepDefinitions':
  {'given':[{'id':1,'stepType':'given','type':'Role','pre':'As a','mid':'','values':['Guest'], 'post': '', 'isExample':[]}],
  	'when':[{'id':1,'stepType':'when','type':'Website','pre':'I am on the website:','mid':'','values':['www.cucumber.com'], 'post': '', 'isExample':[]},{'id':2,'stepType':'when','type':'Button','pre':'I click the button:','mid':'','values':['Create Story'], 'post': '', 'isExample':[]}],'then':[{'id':2,'stepType':'then','type':'Text','pre':'So I can see the text','mid':'in the textbox:','values':['New Story created','Success'], 'post': '', 'isExample':[]}],
  	'example':[]}},{'scenario_id':3,'name':'failed Story creation','comment':'','stepDefinitions':{'given':[{'id':1,'stepType':'given','type':'Role','pre':'As a','mid':'','values':['Guest'], 'post': '', 'isExample':[]}],
	'when':[{'id':1,'stepType':'when','type':'Website','pre':'I am on the website:','mid':'','values':['www.cucumber.com'], 'post': '', 'isExample':[]},{'id':2,'stepType':'when','type':'Button','pre':'I click the button:','mid':'','values':['Create Story'], 'post': '', 'isExample':[]}],
	'then':[{'id':2,'stepType':'then','type':'Text','pre':'So I can see the text','mid':'in the textbox:','values':['Could not create Story','Error'], 'post':'', 'isExample':[]}],'example':[]}}],'assignee':'cniebergall','assignee_avatar_url':'https://avatars1.githubusercontent.com/u/45001224?v=4','body':'As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n','issue_number': 7,'state':'open','title':'Story creation'}];

const scenarios:Scenario[] = [{scenario_id: 2, name: 'my first scenario', stepDefinitions: {'when':[{'_id':'5dce728851e70f2894a170b4','id': 6, 'stepType':'when', 'type' :'HoverOverAndSelect', 'pre':'I hover over the element', 'mid':'and select the option','values':['',''], 'post':'', 'isExample':[]}], 'given':[{'_id':'5dce728851e70f2894a170b4','id': 6, 'stepType':'when', 'type' :'HoverOverAndSelect', 'pre':'I hover over the element', 'mid':'and select the option','values':['',''], 'post':'', 'isExample':[]}],'then':[], 'example': []},
	comment: 'write some words about this scenario', lastTestPassed: false,
	saved: true, stepWaitTime: 200, browser: 'chrome'}];

describe('BaseEditorComponent', () => {
	let component: BaseEditorComponent;
	let fixture: ComponentFixture<BaseEditorComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [HttpClientTestingModule, MatSnackBarModule, BaseEditorComponent],
			schemas: [NO_ERRORS_SCHEMA]
		})
			.compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(BaseEditorComponent);
		component = fixture.componentInstance;
		// Provide required signal input before first change detection
		fixture.componentRef.setInput('templateName', 'scenario');
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	/* TODO: Resolve StepDef dilemma */
	describe('getStepsList', () => {
		it('should return stepsList', () => {
			const when = component.getStepsList(stepBackgroundDefinitions, 1);
			expect(when).toBe(stepBackgroundDefinitions.when);
		});
	});

	describe('addStep', () => {
		beforeEach(() => {
			component.selectedStory = stories[0];
			component.selectedScenario = stories[0].scenarios[0];
		});

		it('should add a when step to the background', (() => {
			const step: StepType = {'_id':'5dce728851e70f2894a170b0','id': 0,'stepType':'when','type':'Button','pre':'I click the button:','mid':'', 'post': '','values':[''], 'isExample':[]};
			vi.spyOn(component, 'addStep');
			const newStep = component.createNewStep(step, component.selectedStory.background.stepDefinitions);
			component.addStep(step, component.selectedStory, 'background');

			expect(component.selectedStory.background.stepDefinitions.when).toContainEqual(newStep);
			expect(component.addStep).toHaveBeenCalled();
		}));

		it('should add a when step to the background story and leave the scenario steps untouched', async () => {
			const step: StepType = {'_id':'5dce728851e70f2894a170b1','id': 0,'stepType':'when','type':'Button','pre':'I click the button:','mid':'', 'post': '','values':[''], 'isExample':[]};
			// Cloned fixture: the shared stories array must stay unchanged for the removeStep spec
			const story: Story = JSON.parse(JSON.stringify(stories[0]));
			const scenario = story.scenarios[0];
			const backgroundBefore = story.background.stepDefinitions.when.length;
			const scenarioBefore = scenario.stepDefinitions.when.length;
			await component.addStep(step, story, 'background');

			expect(story.background.stepDefinitions.when.length).toBe(backgroundBefore + 1);
			expect(scenario.stepDefinitions.when.length).toBe(scenarioBefore);
		});

		it('should add a then step to the scenario and leave the background untouched', async () => {
			const step: StepType = {'_id':'5dce728851e70f2894a170b2','id': 0,'stepType':'then','type':'Text','pre':'So I can see the text','mid':'in the textbox:', 'post': '','values':[''], 'isExample':[]};
			const story: Story = JSON.parse(JSON.stringify(stories[0]));
			const scenario = story.scenarios[0];
			const thenBefore = scenario.stepDefinitions.then.length;
			const backgroundBefore = story.background.stepDefinitions.when.length;
			await component.addStep(step, scenario, 'scenario');

			expect(scenario.stepDefinitions.then.length).toBe(thenBefore + 1);
			expect(story.background.stepDefinitions.when.length).toBe(backgroundBefore);
		});
	});

	describe('checkOnIteration', () => {
		it('should call checkStep once per example row, skipping the header row', () => {
			fixture.componentRef.setInput('templateName', 'example');
			const checkStepSpy = vi.spyOn(component, 'checkStep').mockImplementation(() => undefined);
			const rows = [{}, {}, {}] as MultipleScenario[];
			component.checkOnIteration(rows, true);

			expect(checkStepSpy).toHaveBeenCalledTimes(2);
			expect(checkStepSpy).toHaveBeenCalledWith(rows[1], true);
			expect(checkStepSpy).toHaveBeenCalledWith(rows[2], true);
		});
	});

	describe('removeStep', () => {
		it('should remove the step of the background', () => {
			component.selectedStory = stories[0];
			// templateName must be 'background' so removeStep enters the background switch case
			fixture.componentRef.setInput('templateName', 'background');
			expect(component.selectedStory.background.stepDefinitions.when.length).toBe(1);
			component.selectedStory.background.stepDefinitions['when'][0].checked = true;
			component.removeStep();
			expect(component.selectedStory.background.stepDefinitions.when.length).toBe(0);
		});
	});

	describe('addToValues', () => {
		it('should add hello to background values', () => {
			const stories : Story[] = [{'story_id': 123, '_id':'1', 'storySource': 'github','repo_type':'github','background':{'stepDefinitions':{'when':[{'_id':'5dce728851e70f2894a170b0','id':1,'stepType':'when','type':'Button','pre':'I click the button:','mid':'','values':[''],'post': '', 'isExample':[]}]}},'scenarios':[{'scenario_id':1,'comment':'','name':'successful Story creation','stepDefinitions':{'given':[{'id':1,'stepType':'given','type':'Role','pre':'As a','mid':'','values':['Guest'],'post': '', 'isExample':[]}],'when':[{'id':1,'stepType':'when','type':'Website','pre':'I am on the website:','mid':'','values':['www.cucumber.com'], 'post':'', 'isExample':[]},{'id':2,'stepType':'when','type':'Button','pre':'I click the button:','mid':'','values':['Create Story'],'post':'', 'isExample':[]}],'then':[{'id':2,'stepType':'then','type':'Text','pre':'So I can see the text','mid':'in the textbox:','values':['New Story created','Success'],'post':'', 'isExample':[]}],'example':[]}},{'scenario_id':3,'comment':'','name':'failed Story creation','stepDefinitions':{'given':[{'id':1,'stepType':'given','type':'Role','pre':'As a','mid':'','values':['Guest'],'post':'', 'isExample':[]}],'when':[{'id':1,'stepType':'when','type':'Website','pre':'I am on the website:','mid':'','values':['www.cucumber.com'], 'post':'', 'isExample':[]},{'id':2,'stepType':'when','type':'Button','pre':'I click the button:','mid':'','values':['Create Story'],'post':'', 'isExample':[]}],'then':[{'id':2,'stepType':'then','type':'Text','pre':'So I can see the text','mid':'in the textbox:','values':['Could not create Story','Error'],'post':'', 'isExample':[]}],'example':[]}}],'assignee':'cniebergall','assignee_avatar_url':'https://avatars1.githubusercontent.com/u/45001224?v=4','body':'As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n','issue_number': 7,'state':'open','title':'Story creation'}];
			component.selectedStory = stories[0];
			fixture.componentRef.setInput('templateName', 'background');
			const stepIndex = 0;
			const valueIndex = 0;
			const input = 'hello';
			const stepType = 'when';

			component.addToValues(input, stepIndex, valueIndex, stepType);
			expect(component.templateName()).toBe('background');
			expect(component.selectedStory.background.stepDefinitions.when[stepIndex].values[valueIndex]).toBe(input);
		});
	});

	describe('addStepToScenario', () => {
		beforeEach(() => {
			component.selectedScenario = scenarios[0];
		});
   
		it('should add a when step', (() => {
			const step: StepType = {'_id':'5dce728851e70f2894a170b0','id': 0,'stepType':'when','type':'Button','pre':'I click the button:','mid':'', 'post': '','values':[''], 'isExample':[]};
			vi.spyOn(component, 'createNewStep');
			const newStep = component.createNewStep( step, component.selectedScenario.stepDefinitions);
			component.addStep(step, component.selectedScenario, 'scenario');
			expect(component.createNewStep).toHaveBeenCalled();
			expect(component.selectedScenario.stepDefinitions.when).toContainEqual(newStep);
		}));

	});
	describe('getLastIDinStep', () => {
		it('should return the last id in step given', () => {
			const stepDefs : StepDefinition = {'given':[],'when':[{'id':1,'mid':'','pre':'I go to the website:','stepType':'when','type':'Website','values':[''], 'post':'', 'isExample':[]},
				{'id':2,'mid':'','pre':'I click the button:','stepType':'when','type':'Button','values':[''],'post':'', 'isExample':[]}],
			'then':[{'id':1,'mid':'','pre':'So I will be navigated to the website:','stepType':'then','type':'Website','values':['<fea>'], 'post':'', 'isExample':[]}],
			'example':[{'id':2,'mid':'','pre':'So I will be navigated to the website:','stepType':'example','type':'Website','values':['fea'],'post':'' ,'isExample':[]},
				{'id':2,'mid':'','pre':'So I will be navigated to the website:','stepType':'example','type':'Website','values':['valueadf'],'post':'', 'isExample':[]},
				{'id':2,'mid':'','pre':'So I will be navigated to the website:','stepType':'example','type':'Website','values':['value'],'post':'', 'isExample':[]}]};
      
			const stepType = 'given';
			const returnNumber = 0;
			vi.spyOn(component, 'buildID');
			component.getLastIDinStep(stepDefs , stepType);
			expect(component.buildID).toHaveReturnedWith(returnNumber);
		});

		it('should return the last id in step when', () => {
			const stepDefs : StepDefinition = {'given':[],'when':[{'id':1,'mid':'','pre':'I go to the website:','stepType':'when','type':'Website','values':[''], 'post':'', 'isExample':[]},
				{'id':5,'mid':'','pre':'I click the button:','stepType':'when','type':'Button','values':[''],'post':'', 'isExample':[]}],
			'then':[{'id':1,'mid':'','pre':'So I will be navigated to the website:','stepType':'then','type':'Website','values':['<fea>'], 'post':'', 'isExample':[]}],
			'example':[{'id':2,'mid':'','pre':'So I will be navigated to the website:','stepType':'example','type':'Website','values':['fea'],'post':'', 'isExample':[]},
				{'id':2,'mid':'','pre':'So I will be navigated to the website:','stepType':'example','type':'Website','values':['valueadf'],'post':'', 'isExample':[]},
				{'id':2,'mid':'','pre':'So I will be navigated to the website:','stepType':'example','type':'Website','values':['value'],'post':'', 'isExample':[]}]};
      
			const stepType = 'when';
			const returnNumber = 5;
			vi.spyOn(component, 'buildID');
			component.getLastIDinStep(stepDefs, stepType);
			expect(component.buildID).toHaveReturnedWith(returnNumber);
		});

		it('should return the last id in step then', () => {
			const stepDefs : StepDefinition = {'given':[],'when':[{'id':1,'mid':'','pre':'I go to the website:','stepType':'when','type':'Website','values':[''], 'post':'', 'isExample':[]},
				{'id':2,'mid':'','pre':'I click the button:','stepType':'when','type':'Button','values':[''],'post':'', 'isExample':[]}],
			'then':[{'id':5,'mid':'','pre':'So I will be navigated to the website:','stepType':'then','type':'Website','values':['<fea>'], 'post':'', 'isExample':[]}],
			'example':[{'id':2,'mid':'','pre':'So I will be navigated to the website:','stepType':'example','type':'Website','values':['fea'],'post':'', 'isExample':[]},
				{'id':2,'mid':'','pre':'So I will be navigated to the website:','stepType':'example','type':'Website','values':['valueadf'],'post':'', 'isExample':[]},
				{'id':2,'mid':'','pre':'So I will be navigated to the website:','stepType':'example','type':'Website','values':['value'],'post':'', 'isExample':[]}]};
      
			const stepType = 'then';
			const returnNumber = 5;
			vi.spyOn(component, 'buildID');
			component.getLastIDinStep(stepDefs, stepType);
			expect(component.buildID).toHaveReturnedWith(returnNumber);
		});

		it('should return 0 for step example (case disabled)', () => {
			const stepDefs : StepDefinition = {'given':[],'when':[{'id':1,'mid':'','pre':'I go to the website:','stepType':'when','type':'Website','values':[''], 'post':'', 'isExample':[]},
				{'id':2,'mid':'','pre':'I click the button:','stepType':'when','type':'Button','values':[''],'post':'', 'isExample':[]}],
			'then':[{'id':1,'mid':'','pre':'So I will be navigated to the website:','stepType':'then','type':'Website','values':['<fea>'], 'post':'', 'isExample':[]}],
			'example':[{'id':2,'mid':'','pre':'So I will be navigated to the website:','stepType':'example','type':'Website','values':['fea'],'post':'', 'isExample':[]},
				{'id':2,'mid':'','pre':'So I will be navigated to the website:','stepType':'example','type':'Website','values':['valueadf'],'post':'', 'isExample':[]},
				{'id':5,'mid':'','pre':'So I will be navigated to the website:','stepType':'example','type':'Website','values':['value'],'post':'', 'isExample':[]}]};

			const stepType = 'example';
			// Example case is commented out in getLastIDinStep, so it falls through to default and returns 0
			const result = component.getLastIDinStep(stepDefs, stepType);
			expect(result).toBe(0);
		});
	});

	describe('buildID', () => {
		it('should return 0', () => {
			const stepType: StepType[] = [];
			const id = component.buildID(stepType);
			expect(id).toBe(0);
		});
     
		it('should return buildID', () => {
			const stepType = [{'id':1,'stepType':'given','type':'Role','pre':'As a','mid':'','values':['User'],'selection':['Guest','User']},{'id':2,'mid':'','pre':'I am on the website:','stepType':'given','type':'Website','values':['r']},{'id':3,'mid':'','pre':'I am on the website:','stepType':'given','type':'Website','values':['r']}];
			const id = component.buildID(stepType);
			expect(id).toBe(3);
		});
	});

	describe('behavioral: blocks signal updates', () => {
		it('should initialize blocks signal when ngOnInit fetches blocks', () => {
			expect(component.blocks).toBeDefined();
			expect(component.blocks()).toEqual([]);
		});

		it('should set blocks signal via reloadBlocks', async () => {
			const mockBlocks = [
				{ _id: 'b1', name: 'Login Block', stepDefinitions: { given: [], when: [], then: [] } }
			];
			component.blocks.set(mockBlocks as any);
			expect(component.blocks().length).toBe(1);
			expect(component.blocks()[0].name).toBe('Login Block');
		});
	});

	describe('behavioral: selectedBlock input signal', () => {
		it('should set selectedBlock via input', () => {
			const block = { _id: 'b1', name: 'Test Block', stepDefinitions: { given: [], when: [], then: [] } };
			fixture.componentRef.setInput('selectedBlock', block as any);
			TestBed.flushEffects();
			// selectedBlock is a signal-based input — verify through the component's input signal
			expect((fixture.componentRef.instance as any).selectedBlock()).toBe(block as any);
		});
	});

	describe('behavioral: step selection and editing', () => {
		beforeEach(() => {
			component.selectedStory = JSON.parse(JSON.stringify(stories[0]));
			component.selectedScenario = component.selectedStory.scenarios[0];
			fixture.componentRef.setInput('templateName', 'scenario');
			TestBed.flushEffects();
		});

		it('should check/uncheck a step via checkStep', () => {
			const step = component.selectedScenario.stepDefinitions.when[0];
			expect(step.checked).toBeUndefined();

			component.checkStep(step);
			expect(step.checked).toBeTruthy();

			component.checkStep(step);
			expect(step.checked).toBeFalsy();
		});

		it('should enable action bar when at least one step is checked', () => {
			expect(component.activeActionBar).toBeFalsy();

			const step = component.selectedScenario.stepDefinitions.when[0];
			component.checkStep(step);

			expect(component.activeActionBar).toBeTruthy();
		});

		it('should disable action bar when no steps are checked', () => {
			const step = component.selectedScenario.stepDefinitions.when[0];
			component.checkStep(step);
			expect(component.activeActionBar).toBeTruthy();

			component.checkStep(step);
			expect(component.activeActionBar).toBeFalsy();
		});

		it('should add step to scenario via addStep', () => {
			const step: StepType = {
				'_id': 'test1', 'id': 0, 'stepType': 'when', 'type': 'Button',
				'pre': 'I click the button:', 'mid': '', 'post': '', 'values': [''], 'isExample': []
			};
			const initialLen = stories[0].scenarios[0].stepDefinitions.when.length;

			component.addStep(step, component.selectedScenario, 'scenario');

			expect(component.selectedScenario.stepDefinitions.when.length).toBe(initialLen + 1);
			expect(component.selectedScenario.saved).toBeFalsy();
		});

		it('should remove checked steps via removeStep', () => {
			fixture.componentRef.setInput('templateName', 'scenario');
			component.selectedScenario = stories[0].scenarios[0];
			const initialLen = stories[0].scenarios[0].stepDefinitions.when.length;

			// Check the first when step
			const step = stories[0].scenarios[0].stepDefinitions.when[0];
			step.checked = true;

			component.removeStep();

			expect(stories[0].scenarios[0].stepDefinitions.when.length).toBe(initialLen - 1);
		});
	});

	describe('behavioral: step parameter editing via addToValues', () => {
		beforeEach(() => {
			component.selectedStory = stories[0];
			component.selectedScenario = stories[0].scenarios[0];
		});

		it('should update scenario step values', () => {
			fixture.componentRef.setInput('templateName', 'scenario');
			const stepIndex = 0;
			const valueIndex = 0;
			const newValue = 'www.example.com';
			const stepType = 'when';

			component.addToValues(newValue, stepIndex, valueIndex, stepType);

			expect(component.selectedScenario.stepDefinitions.when[stepIndex].values[valueIndex]).toBe(newValue);
			expect(component.selectedScenario.saved).toBeFalsy();
		});

		it('should update background step values', () => {
			fixture.componentRef.setInput('templateName', 'background');
			// Give the background a when step with a values array
			component.selectedStory = stories[0];
			component.selectedStory.background.stepDefinitions.when.push({
				'_id': 'test', 'id': 1, 'stepType': 'when', 'type': 'Button',
				'pre': 'I click:', 'mid': '', 'post': '', 'values': [''], 'isExample': []
			});
			const stepIndex = component.selectedStory.background.stepDefinitions.when.length - 1;
			const valueIndex = 0;
			const newValue = 'background-value';

			component.addToValues(newValue, stepIndex, valueIndex, '');

			expect(component.selectedStory.background.stepDefinitions.when[stepIndex].values[valueIndex]).toBe(newValue);
		});
	});

	describe('behavioral: newlySelectedScenario input triggers scenario update', () => {
		it('should update selectedScenario when newlySelectedScenario input changes', () => {
			const testScenario: Scenario = {
				scenario_id: 42, name: 'Injected Scenario', comment: '',
				stepDefinitions: { given: [], when: [], then: [], example: [] }
			};

			fixture.componentRef.setInput('newlySelectedScenario', testScenario);
			TestBed.flushEffects();

			expect(component.selectedScenario).toBe(testScenario);
		});
	});

	describe('behavioral: newlySelectedStory input triggers story update', () => {
		it('should update selectedStory when newlySelectedStory input changes', () => {
			fixture.componentRef.setInput('newlySelectedStory', stories[1]);
			TestBed.flushEffects();

			expect(component.selectedStory).toBe(stories[1]);
		});

		it('should leave selectedStory untouched when input is not set', () => {
			const prev = component.selectedStory;
			fixture.componentRef.setInput('newlySelectedStory', undefined);
			TestBed.flushEffects();

			// The effect early-returns on an undefined story input; the old
			// selection must not be cleared by an empty input.
			expect(component.selectedStory).toBe(prev);
		});
	});

	describe('behavioral: block insertion notifies the parent', () => {
		it('emits blockInserted after a block is added to a scenario, so the parent re-sets its signal-held scenario', () => {
			const testScenario: Scenario = {
				scenario_id: 42, name: 'Target', comment: '', saved: true,
				stepDefinitions: { given: [], when: [], then: [], example: [] }
			};
			const block = { _id: 'block-1', name: 'Shared Block', stepDefinitions: { when: [], example: [] } } as unknown as Block;
			let emitted = 0;
			component.blockInserted.subscribe(() => emitted++);

			fixture.componentRef.setInput('newlySelectedScenario', testScenario);
			TestBed.flushEffects();
			TestBed.inject(BlockService).addBlockToScenarioTrigger.emit(['scenario', block, 'When', false]);
			TestBed.flushEffects();

			expect(testScenario.saved).toBe(false);
			expect(emitted).toBe(1);
		});

		it('keeps the user checked steps and the inserted block when the parent re-sets the scenario reference', () => {
			const checkedStep: StepType = {
				_id: 'checked-1', id: 1, stepType: 'given', type: 'Role', pre: 'As a', mid: '',
				values: ['Guest'], post: '', isExample: [], checked: true
			};
			const testScenario: Scenario = {
				scenario_id: 42, name: 'Target', comment: '', saved: true,
				stepDefinitions: { given: [checkedStep], when: [], then: [], example: [] }
			};
			const block = { _id: 'block-1', name: 'Shared Block', stepDefinitions: { when: [], example: [] } } as unknown as Block;

			fixture.componentRef.setInput('newlySelectedScenario', testScenario);
			TestBed.flushEffects();
			TestBed.inject(BlockService).addBlockToScenarioTrigger.emit(['scenario', block, 'When', false]);
			TestBed.flushEffects();

			// Same shape as scenario-editor.markScenarioUnsaved: a new reference that shares the step arrays
			const reSetScenario: Scenario = { ...testScenario, saved: false };
			fixture.componentRef.setInput('newlySelectedScenario', reSetScenario);
			TestBed.flushEffects();

			expect(component.selectedScenario).toBe(reSetScenario);
			expect(component.selectedScenario.stepDefinitions.when.length).toBe(1);
			expect(checkedStep.checked).toBe(true);
			expect(component.selectedScenario.saved).toBe(false);
		});

		it('unchecks steps when a different scenario is selected', () => {
			const checkedStep: StepType = {
				_id: 'checked-2', id: 1, stepType: 'given', type: 'Role', pre: 'As a', mid: '',
				values: ['Guest'], post: '', isExample: [], checked: true
			};
			const firstScenario: Scenario = {
				scenario_id: 42, name: 'First', comment: '', saved: true,
				stepDefinitions: { given: [checkedStep], when: [], then: [], example: [] }
			};
			const otherScenario: Scenario = {
				scenario_id: 42, name: 'Same id in another story', comment: '', saved: true,
				stepDefinitions: { given: [], when: [], then: [], example: [] }
			};

			fixture.componentRef.setInput('newlySelectedScenario', firstScenario);
			TestBed.flushEffects();
			fixture.componentRef.setInput('newlySelectedScenario', otherScenario);
			TestBed.flushEffects();

			expect(checkedStep.checked).toBe(false);
			expect(component.selectedScenario).toBe(otherScenario);
		});
	});

	describe('behavioral: checkAllSteps toggles all steps', () => {
		beforeEach(() => {
			fixture.componentRef.setInput('templateName', 'scenario');
			component.selectedScenario = stories[0].scenarios[0];
		});

		it('should check all steps when called without argument', () => {
			component.checkAllSteps();

			component.selectedScenario.stepDefinitions.when.forEach(s => {
				expect(s.checked).toBeTruthy();
			});
		});

		it('should uncheck all steps when called with false', () => {
			component.selectedScenario.stepDefinitions.when.forEach(s => s.checked = true);
			component.checkAllSteps(false);

			component.selectedScenario.stepDefinitions.when.forEach(s => {
				expect(s.checked).toBeFalsy();
			});
		});
	});

	describe('behavioral: edge cases', () => {
		it('removeStep should be no-op when no steps are checked', () => {
			fixture.componentRef.setInput('templateName', 'scenario');
			component.selectedScenario = stories[0].scenarios[0];
			const initialLen = component.selectedScenario.stepDefinitions.when.length;

			// No step is checked — removeStep should do nothing
			component.removeStep();

			expect(component.selectedScenario.stepDefinitions.when.length).toBe(initialLen);
		});

		it('should throw when addToValues accesses empty stepDefinitions.when', () => {
			fixture.componentRef.setInput('templateName', 'scenario');
			component.selectedStory = stories[0];
			component.selectedScenario = {
				...component.selectedStory.scenarios[0],
				stepDefinitions: { ...component.selectedStory.scenarios[0].stepDefinitions, when: [] }
			};

			expect(() => component.addToValues('test', 0, 0, 'when')).toThrow(TypeError);
		});

		it('should mark scenario unsaved when adding a step', () => {
			fixture.componentRef.setInput('templateName', 'scenario');
			component.selectedStory = JSON.parse(JSON.stringify(stories[0]));
			component.selectedScenario = component.selectedStory.scenarios[0];
			component.selectedScenario.saved = true;

			const step: StepType = {
				'_id': 'new', 'id': 0, 'stepType': 'given', 'type': 'Role',
				'pre': 'As a', 'mid': '', 'post': '', 'values': [], 'isExample': []
			};
			component.addStep(step, component.selectedScenario, 'scenario');

			expect(component.selectedScenario.saved).toBeFalsy();
		});

		it('given step is added to given array not when', () => {
			fixture.componentRef.setInput('templateName', 'scenario');
			component.selectedStory = JSON.parse(JSON.stringify(stories[0]));
			component.selectedScenario = component.selectedStory.scenarios[0];
			const whenLen = component.selectedScenario.stepDefinitions.when.length;
			const givenLen = component.selectedScenario.stepDefinitions.given.length;

			const step: StepType = {
				'_id': 'new', 'id': 0, 'stepType': 'given', 'type': 'Role',
				'pre': 'As a', 'mid': '', 'post': '', 'values': ['User'], 'isExample': []
			};
			component.addStep(step, component.selectedScenario, 'scenario');

			expect(component.selectedScenario.stepDefinitions.given.length).toBe(givenLen + 1);
			expect(component.selectedScenario.stepDefinitions.when.length).toBe(whenLen);
		});

		it('then step is added to then array not when', () => {
			fixture.componentRef.setInput('templateName', 'scenario');
			component.selectedStory = JSON.parse(JSON.stringify(stories[0]));
			component.selectedScenario = component.selectedStory.scenarios[0];
			const whenLen = component.selectedScenario.stepDefinitions.when.length;
			const thenLen = component.selectedScenario.stepDefinitions.then.length;

			const thenStep: StepType = {
				'_id': 'then', 'id': 0, 'stepType': 'then', 'type': 'Text',
				'pre': 'So I see', 'mid': '', 'post': '', 'values': ['Success'], 'isExample': []
			};
			component.addStep(thenStep, component.selectedScenario, 'scenario');

			expect(component.selectedScenario.stepDefinitions.then.length).toBe(thenLen + 1);
			expect(component.selectedScenario.stepDefinitions.when.length).toBe(whenLen);
		});
	});

	describe('getBlocks error handling', () => {
		it('should notify the user when blocks cannot be loaded', () => {
			const blockService = TestBed.inject(BlockService);
			const notify = TestBed.inject(NotificationService);
			vi.spyOn(blockService, 'getBlocks').mockReturnValue(throwError(() => new Error('backend down')));
			const errorSpy = vi.spyOn(notify, 'error');

			component.ngOnInit();

			expect(errorSpy).toHaveBeenCalledWith('Could not load blocks');
		});
	});
	describe('contenteditable step values', () => {
		const wikiUrl = 'https://de.wikipedia.org/wiki/Gleith%C3%B6rnchen';

		/**
		 * Renders a scenario with one 'when' step holding the given value and returns its contenteditable element.
		 * Uses a fresh fixture because the shared one already rendered with no scenario, and an OnPush view is not
		 * re-rendered by a plain property change.
		 */
		function renderSingleStepValue(value: string): HTMLElement {
			const step: StepType = {
				id: 1, stepType: 'when', type: 'Website', pre: 'I am on the website:', mid: '',
				values: [value], post: '', isExample: []
			};
			fixture = TestBed.createComponent(BaseEditorComponent);
			component = fixture.componentInstance;
			component.selectedScenario = {
				scenario_id: 1, name: 'single step', comment: '',
				stepDefinitions: { given: [], when: [step], then: [], example: [] }
			};
			fixture.componentRef.setInput('templateName', 'scenario');
			fixture.detectChanges();
			return fixture.nativeElement.querySelector('[contenteditable="true"]') as HTMLElement;
		}

		it('should render the step value without template whitespace', () => {
			const el = renderSingleStepValue(wikiUrl);

			expect(el.textContent).toBe(wikiUrl);
		});

		it('should store an edit without adding a leading space', () => {
			const el = renderSingleStepValue(wikiUrl);

			el.textContent = el.textContent + 'X';
			el.dispatchEvent(new Event('input'));

			expect(component.selectedScenario.stepDefinitions.when[0].values[0]).toBe(wikiUrl + 'X');
		});

		it('should keep intentional trailing spaces of a stored value', () => {
			const el = renderSingleStepValue('https://example.com  ');

			el.dispatchEvent(new Event('input'));

			expect(component.selectedScenario.stepDefinitions.when[0].values[0]).toBe('https://example.com  ');
		});

		it('should render a value containing markup-like text exactly as stored', () => {
			const value = 'https://example.com/äöü "Quote" <script>alert(1)</script>';
			const el = renderSingleStepValue(value);

			expect(el.textContent).toBe(value);
		});

		it('should store an edit of a markup-like value as the original text plus the typed text', () => {
			const value = 'https://example.com/äöü "Quote" <script>alert(1)</script>';
			const el = renderSingleStepValue(value);

			el.textContent = el.textContent + ' typed';
			el.dispatchEvent(new Event('input'));

			expect(component.selectedScenario.stepDefinitions.when[0].values[0]).toBe(value + ' typed');
		});

		it('should render an example placeholder such as <name> unchanged', () => {
			const el = renderSingleStepValue('I open <name>');

			expect(el.textContent).toBe('I open <name>');
		});
	});
});
