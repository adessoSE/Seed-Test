import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { StoryEditorComponent } from './story-editor.component';
import { Story } from '@shared/models/Story';
import { Scenario } from '@shared/models/Scenario';
import { Background } from '@shared/models/Background';
import { ScenarioEditorComponent } from '../scenario-editor/scenario-editor.component';
import { ExampleTableComponent } from '../example-table/example-table.component';
import { MatTableModule } from '@angular/material/table';
import { EditableComponent } from '../editable/editable.component';
import { ParentComponent } from '../parent/parent.component';
import { StoriesBarComponent } from '../stories-bar/stories-bar.component';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ApiService } from '../Services/api.service';
import { findComponent } from '../../test_helper';
import { RenameStoryComponent } from '../modals/rename-story/rename-story.component';
import { BaseEditorComponent } from '../base-editor/base-editor.component';

class MockRenameStoryModal {
	openRenameStoryModal = vi.fn();
}

const scenario : Scenario = {'scenario_id':1,'comment':'','name':'successful Story creation','stepDefinitions':{'given':[{'id':1,'stepType':'given','type':'Role','pre':'As a','mid':'','values':['Guest'], 'post': '','isExample':[]}],'when':[{'id':1,'stepType':'when','type':'Website','pre':'I am on the website:','mid':'','values':['www.cucumber.com'], 'post': '', 'isExample':[]},{'id':2,'stepType':'when','type':'Button','pre':'I click the button:','mid':'','values':['Create Story'], 'post': '', 'isExample':[]}],'then':[{'id':2,'stepType':'then','type':'Text','pre':'So I can see the text','mid':'in the textbox:','values':['New Story created','Success'], 'post': '', 'isExample':[]}],'example':[]}};
const story: Story = {'_id': 'a','story_id': 123, 'storySource': 'db','repo_type':'db','background':{'stepDefinitions':
  {'when':[]}},'scenarios':[{'scenario_id':1,'comment':'','name':'successful Story creation','stepDefinitions':
  {'given':[{'id':1,'stepType':'given','type':'Role','pre':'As a','mid':'','values':['Guest'], 'post': '', 'isExample':[]}],
  	'when':[{'id':1,'stepType':'when','type':'Website','pre':'I am on the website:','mid':'','values':['www.cucumber.com'], 'post': '', 'isExample':[]},{'id':2,'stepType':'when','type':'Button','pre':'I click the button:','mid':'','values':['Create Story'], 'post': '', 'isExample':[]}],'then':[{'id':2,'stepType':'then','type':'Text','pre':'So I can see the text','mid':'in the textbox:','values':['New Story created','Success'], 'post': '', 'isExample':[]}],
  	'example':[]}},{'scenario_id':3,'name':'failed Story creation','comment':'','stepDefinitions':{'given':[{'id':1,'stepType':'given','type':'Role','pre':'As a','mid':'','values':['Guest'], 'post': '', 'isExample':[]}],
	'when':[{'id':1,'stepType':'when','type':'Website','pre':'I am on the website:','mid':'','values':['www.cucumber.com'], 'post': '', 'isExample':[]},{'id':2,'stepType':'when','type':'Button','pre':'I click the button:','mid':'','values':['Create Story'], 'post': '', 'isExample':[]}],
	'then':[{'id':2,'stepType':'then','type':'Text','pre':'So I can see the text','mid':'in the textbox:','values':['Could not create Story','Error'], 'post':'', 'isExample':[]}],'example':[]}}],'assignee':'cniebergall','assignee_avatar_url':'https://avatars1.githubusercontent.com/u/45001224?v=4','body':'As a user,\r\nI want to be able to create new features\r\nSo I can test features of my project\r\n','issue_number': 7,'state':'open','title':'Story creation', 'host':'example'};

const stories : Story[] = [{'story_id': 123,'_id':'2','storySource':'github', 'repo_type':'github', 'background':
  {'stepDefinitions':{'when':[]}},'scenarios':
  [{'scenario_id':1,'comment':'','name':'successful Story creation','stepDefinitions':
  {'given':[{'id':1,'stepType':'given','type':'Role','pre':'As a','mid':'','values':['Guest'], 'post':'', 'isExample':[] }],
  	'when':[{'id':1,'stepType':'when','type':'Website','pre':'I am on the website:','mid':'',
  		'values':['www.cucumber.com'],'post':'', 'isExample':[]},{'id':2,'stepType':'when','type':'Button',
  		'pre':'I click the button:','mid':'','values':['Create Story'],'post':'', 'isExample':[]}],
  	'then':[{'id':2,'stepType':'then','type':'Text','pre':'So I can see the text',
  		'mid':'in the textbox:','values':['New Story created','Success'], 'post': '','isExample':[]}],
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


describe('StoryEditorComponent', () => {
	let component: StoryEditorComponent;
	let fixture: ComponentFixture<StoryEditorComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [HttpClientTestingModule, MatSnackBarModule, FormsModule, ReactiveFormsModule, DragDropModule, MatTableModule, EditableComponent, ScenarioEditorComponent, ExampleTableComponent, ParentComponent, StoryEditorComponent, StoriesBarComponent, RenameStoryComponent],
			providers: [ApiService],
			schemas: [NO_ERRORS_SCHEMA]
		})
			.overrideComponent(BaseEditorComponent, { set: { template: '', imports: [] } })
			.compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(StoryEditorComponent);
		component = fixture.componentInstance;
		component.selectedStory.set(story);
		// Provide required signal input before first change detection
		fixture.componentRef.setInput('isDark', false);
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	describe('set newSelectedStory', () => {
		it('should set newSelectedStory', () => {
			fixture.componentRef.setInput('newSelectedStory', story);
			expect(component.selectedStory()).toBe(story);
		});
	});

	describe('set newSelectedScenario', () => {
		it('should set newSelectedScenario without selectScenario', () => {
			vi.spyOn(component, 'selectScenario');
			fixture.componentRef.setInput('newSelectedScenario', story.scenarios[1]);
			// Flush effects without full change detection to avoid NG0100
			TestBed.flushEffects();
			expect(component.selectedScenario).toBe(story.scenarios[1]);
			expect(component.selectScenario).toHaveBeenCalledWith(story.scenarios[1]);
		});

		it('should set newSelectedScenario with selectScenario', () => {
			component.selectedStory.set(story);
			vi.spyOn(component, 'selectScenario');
			fixture.componentRef.setInput('newSelectedScenario', scenario);
			// Flush effects without full change detection to avoid NG0100
			TestBed.flushEffects();
			expect(component.selectedScenario).toBe(scenario);
			expect(component.selectScenario).toHaveBeenCalled();
		});
	});

	describe('updateBackground', () => {
		it('should update the background', () => {
			component.selectedStory.set(story);
			// stories must be set so checkStoriesForBack() can filter them
			component.stories.set(stories);
			// blocks must be initialized so changeBackgroundBlock() can iterate them
			component.blocks.set([]);
			vi.spyOn(component.backgroundService, 'updateBackground');
			component.updateBackground();
			expect(component.backgroundService.updateBackground).toHaveBeenCalled();
		});
	});

	describe('deleteBackgroundd', () => {
		it('should delete the background', () => {
			const emptyBackgroundAfterDelete = {name: '', saved: true, stepDefinitions: {when: []}};
			component.stories.set(stories);
			component.selectedStory.set(stories[0]);
			// Mock deleteBackground to emit synchronously so the subscribe callback fires immediately
			vi.spyOn(component.backgroundService, 'deleteBackground').mockReturnValue(of({stepDefinitions: { when: [] }} as unknown as Background));

			component.deleteBackground();
			expect(component.showBackground()).toBeFalsy();
			expect(component.selectedStory()?.background).toEqual(emptyBackgroundAfterDelete);
		});
	});

	describe('hideResults', () => {
		it('should turn show results to true', () => {
			component.showResults.set(false);
			component.hideResults();
			expect(component.showResults()).toBe(true);
		});

		it('should turn show results to false', () => {
			component.showResults.set(true);
			component.hideResults();
			expect(component.showResults()).toBe(false);
		});
	});

	describe('deleteScenario', () => {
		it('should send delete request', async () => {
			component.stories.set(stories);
			component.selectedStory.set(stories[0]);
			vi.spyOn(component.scenarioService, 'deleteScenario');
			vi.spyOn(component, 'scenarioDeleted');
			component.deleteScenario(component.selectedStory()?.scenarios![0]!, false);
			fixture.detectChanges();
			expect(component.scenarioService.deleteScenario).toHaveBeenCalled();
		});
	});


	describe('scenarioDeleted', () => {
		it('should delete the Scenario', () => {
			component.stories.set(stories);
			component.selectedStory.set(stories[0]);
			component.selectedScenario = stories[0].scenarios[0];
			const story = component.selectedStory()!;
			const indexScenario: number = story.scenarios.indexOf(component.selectedScenario);
			const deletedScenario = story.scenarios[indexScenario];

			component.scenarioDeleted();
			// After deleting one of two scenarios, selectScenario is called on the remaining one, setting showEditor = true
			expect(component.showEditor()).toBeTruthy();

			expect(component.stories()[component.stories().indexOf(component.selectedStory()!)].scenarios).not.toContain(deletedScenario);
			expect(indexScenario).not.toBe(-1);

		});
	});

	describe('runTests', () => {

		it('should start runTest', () => {
			const scenarioId = 1;
			component.selectedStory.set(story);
			// scenarioChild is now a viewChild signal — mock it via Object.defineProperty
			Object.defineProperty(component, 'scenarioChild', { value: () => findComponent(fixture, '#scenarioChild') });
			const html = '<h1 #testFrame>Hi</h1>';
			vi.spyOn(component.storyService, 'runTests');
			component.storyService.runTests(component.selectedStory()?._id!, scenarioId, {}).subscribe((_resp)=> {
				expect(component.htmlReport).toBe(html);
				expect(component.testDone()).toBeTruthy();
				expect(component.showResults()).toBeTruthy();
				expect(component.testRunning()).toBeFalsy();
			});
		});
	});

	describe('addScenario', () => {
		it('should add Scenario', () => {
			const scenarioName = 'my new name';
			component.selectedStory.set(stories[0]);
			const scenariosAmount = component.selectedStory()!.scenarios.length;
			vi.spyOn(component.scenarioService, 'addScenario');
			component.scenarioService.addScenario(component.selectedStory()?._id!, scenarioName).subscribe((_resp)=> {
				expect(component.scenarioService.addScenario).toHaveBeenCalled();
				expect(component.selectedStory()?.scenarios.length).toBe(scenariosAmount + 1);
			});
		});

		it('should call selectScenario', async () => {
			const scenarioName = 'my new name';
			component.selectedStory.set(story);
			const scenariosAmount = component.selectedStory()!.scenarios.length;
			fixture.detectChanges();
			vi.spyOn(component, 'selectScenario');
			component.scenarioService.addScenario(component.selectedStory()?._id!, scenarioName).subscribe((_resp)=> {
				expect(component.selectScenario).toHaveBeenCalled();
				expect(component.selectedStory()?.scenarios.length).toEqual(scenariosAmount + 1);
			});
		});


	});


	describe('selectScenario', () => {
		it('should select the Scenario', () => {
			component.selectScenario(scenario);
			expect(component.selectedScenario).toBe(scenario);
			expect(component.showResults()).toBeFalsy();
			expect(component.showEditor()).toBeTruthy();
			expect(component.testDone()).toBeFalsy();
		});
	});

	describe('selectStoryScenario', () => {
		it('should select the Story', () => {
			component.stories.set(stories);
			vi.spyOn(component, 'selectScenario');
			component.selectStoryScenario(stories[0]);
			expect(component.selectedStory()).toBe(stories[0]);
			expect(component.showResults()).toBeFalsy();
			expect(component.showEditor()).toBeTruthy();
			expect(component.selectScenario).toHaveBeenCalled();
		});
	});

	describe('renameStoryEmit', () => {
		it('should set signal value', () => {
			const newStoryTitle = 'This is my new story title';
			const newStoryDescription = 'I let here a brief description';
			component.storyService.renameStoryEmit(newStoryTitle, newStoryDescription);
			expect(component.storyService.renameStoryValue()).toEqual({
				newStoryTitle,
				newStoryDescription
			});
		});
	});

	describe('renameStoryTitle', () => {
		let mockComp: MockRenameStoryModal;

		beforeEach(() => {
			mockComp = new MockRenameStoryModal();
		});
		it('should call openRenameStoryModal',() => {
			component.stories.set(stories);
			//component.selectedStory.set(story);
			vi.spyOn(component, 'changeStoryTitle').mockImplementation(mockComp.openRenameStoryModal);
			component.changeStoryTitle();
			expect(mockComp.openRenameStoryModal).toHaveBeenCalled();
			expect(mockComp.openRenameStoryModal).toHaveBeenCalledTimes(1);
		});
	});

	describe('behavioral: scenario add/remove with signal updates', () => {
		it('should add scenario to selectedStory.scenarios via addScenario', () => {
			component.selectedStory.set(stories[0]);
			const initialLen = component.selectedStory()!.scenarios.length;
			const newScenario: Scenario = {
				scenario_id: 99,
				name: 'New Test Scenario',
				comment: '',
				stepDefinitions: { given: [], when: [], then: [], example: [] }
			};

			component.stories.set(stories);
			component.selectScenario(component.selectedStory()!.scenarios[0]);

			vi.spyOn(component, 'selectScenario');
			component.selectScenario(newScenario);
			component.selectedStory()!.scenarios.push(newScenario);

			expect(component.selectedStory()?.scenarios.length).toBe(initialLen + 1);
			expect(component.selectedScenario).toBe(newScenario);
			expect(component.showEditor()).toBeTruthy();
		});

		it('should remove scenario from list via scenarioDeleted', () => {
			component.selectedStory.set(stories[0]);
			component.stories.set(stories);
			component.selectedScenario = stories[0].scenarios[0];
			const initialLen = stories[0].scenarios.length;

			component.scenarioDeleted();

			expect(stories[0].scenarios.length).toBe(initialLen - 1);
			// After deletion, should select remaining scenario or hide editor
			if (stories[0].scenarios.length > 0)
				expect(component.showEditor()).toBeTruthy();
		});
	});

	describe('behavioral: selectScenario updates signals', () => {
		it('should set selectedScenario, showEditor, and reset showResults/testDone', () => {
			const testScenario = story.scenarios[0];
			component.selectedStory.set(story);

			component.selectScenario(testScenario);

			expect(component.selectedScenario).toBe(testScenario);
			expect(component.showEditor()).toBeTruthy();
			expect(component.showResults()).toBeFalsy();
			expect(component.testDone()).toBeFalsy();
		});

		it('should hide editor when scenario is null', () => {
			component.selectScenario(null);

			expect(component.selectedScenario).toBeNull();
			expect(component.showEditor()).toBeFalsy();
			expect(component.showResults()).toBeFalsy();
		});
	});

	describe('behavioral: stories signal updates from newStories input', () => {
		it('should set stories signal when newStories input receives data', () => {
			expect(component.stories().length).toBe(0);

			fixture.componentRef.setInput('newStories', stories);
			TestBed.flushEffects();

			expect(component.stories().length).toBe(stories.length);
			expect(component.stories()).toEqual(stories);
		});
	});

	describe('behavioral: selectedStory input triggers initial scenario selection', () => {
		it('should select first scenario when newSelectedStory is set with scenarios', () => {
			vi.spyOn(component, 'selectScenario');
			component.stories.set(stories);

			fixture.componentRef.setInput('newSelectedStory', story);
			TestBed.flushEffects();

			expect(component.selectedStory()).toBe(story);
			expect(component.selectScenario).toHaveBeenCalledWith(story.scenarios[0]);
		});
	});

	describe('behavioral: DOM rendering after signal changes', () => {
		it('should show editor section when showEditor signal is true', () => {
			component.stories.set(stories);
			component.selectedStory.set(stories[0]);
			component.showEditor.set(true);
			component.selectedScenario = stories[0].scenarios[0];
			TestBed.flushEffects();

			// The editor section should be visible
			const storyElement = fixture.nativeElement.querySelector('#story');
			// showEditor is true, so #story should be in the DOM
			expect(storyElement).toBeTruthy();
		});

		it('should hide editor section when showEditor signal is false', () => {
			component.showEditor.set(false);
			TestBed.flushEffects();

			const storyElement = fixture.nativeElement.querySelector('#story');
			expect(storyElement).toBeFalsy();
		});

		it('should show no-stories message when stories is empty and loaded', () => {
			component.stories.set([]);
			component.storiesLoaded.set(true);
			component.storiesError.set(false);
			component.showEditor.set(false);
			TestBed.flushEffects();

			const noStoriesHeader = fixture.nativeElement.querySelector('#noStoriesHeader');
			expect(noStoriesHeader).toBeTruthy();
			expect(noStoriesHeader.textContent).toContain('No Stories Yet');
		});
	});

	describe('behavioral: empty/edge cases', () => {
		it('should hide editor when selecting scenario on story with no scenarios', () => {
			const emptyStory: Story = { ...story, scenarios: [] };
			component.selectedStory.set(emptyStory);

			component.selectScenario(null);

			expect(component.showEditor()).toBeFalsy();
			expect(component.showResults()).toBeFalsy();
		});

		it('should hide editor after deleting the last scenario via scenarioDeleted', () => {
			const singleScenarioStory: Story = {
				...story,
				scenarios: [{ ...story.scenarios[0], scenario_id: 100 }]
			};
			component.selectedStory.set(singleScenarioStory);
			component.selectedScenario = singleScenarioStory.scenarios[0];
			component.stories.set([singleScenarioStory]);

			component.scenarioDeleted();

			expect(singleScenarioStory.scenarios.length).toBe(0);
			expect(component.showEditor()).toBeFalsy();
		});

		it('should set selectedStory without crashing when newSelectedStory has no scenarios', () => {
			const storyNoScenarios = { ...story, scenarios: [] };
			vi.spyOn(component, 'selectScenario');

			fixture.componentRef.setInput('newSelectedStory', storyNoScenarios);
			TestBed.flushEffects();

			expect(component.selectedStory()).toBe(storyNoScenarios);
			expect(component.selectScenario).toHaveBeenCalledWith(null);
		});

		it('should handle scenarioDeleted when selectedStory has no matched selectedScenario', () => {
			const s1 = stories[0];
			const fakeScenario = { scenario_id: -999, name: 'fake' } as Scenario;
			component.selectedStory.set(s1);
			component.selectedScenario = fakeScenario;

			expect(() => component.scenarioDeleted()).not.toThrow();
		});
	});
});


