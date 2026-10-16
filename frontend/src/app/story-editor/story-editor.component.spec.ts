import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { StoryEditorComponent } from './story-editor.component';
import { Story } from '@seed-test/shared/models/Story';
import { Scenario } from '@seed-test/shared/models/Scenario';
import { Background } from '@seed-test/shared/models/Background';
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
			expect(component.selectedScenario()).toBe(story.scenarios[1]);
			expect(component.selectScenario).toHaveBeenCalledWith(story.scenarios[1]);
		});

		it('should set newSelectedScenario with selectScenario', () => {
			component.selectedStory.set(story);
			vi.spyOn(component, 'selectScenario');
			fixture.componentRef.setInput('newSelectedScenario', scenario);
			// Flush effects without full change detection to avoid NG0100
			TestBed.flushEffects();
			expect(component.selectedScenario()).toBe(scenario);
			expect(component.selectScenario).toHaveBeenCalled();
		});
	});

	describe('selection without a parent scenario', () => {
		it('should keep a newly added scenario selected when the story signal changes afterwards', () => {
			// Parent holds no scenario (newSelectedScenario stays unset): effect 16 takes the auto-select branch
			component.selectedStory.set(story);
			TestBed.flushEffects();
			const added = { ...structuredClone(story.scenarios[0]), scenario_id: 99, name: 'Added' };

			// Same sequence as addScenario(): select the new scenario, then replace the story's scenarios
			component.selectScenario(added);
			component.selectedStory.update(s => s ? { ...s, scenarios: [...s.scenarios, added] } : s);
			TestBed.flushEffects();

			expect(component.selectedScenario()?.scenario_id).toBe(99);
		});

		it('keeps the remaining scenario selected after the selected one is deleted, even when the story changes later', () => {
			// Regression: effect 16's auto-select branch tracked selectedStory, so a later story change reset the selection to scenarios[0]
			const base = structuredClone(story.scenarios[0]);
			const scenarios = [1, 3, 4].map(id => ({ ...base, scenario_id: id, name: `Scenario ${id}` }));
			const multi: Story = { ...structuredClone(story), scenarios };
			vi.spyOn(component.scenarioService, 'deleteScenario').mockReturnValue(of(multi));
			vi.spyOn(component.notify, 'success').mockImplementation(() => undefined);
			component.selectedStory.set(multi);
			component.selectScenario(scenarios[0]);

			component.deleteScenario(scenarios[0], false);
			// The last remaining scenario (id 4) is selected, not the first one (id 3)
			expect(component.selectedScenario()?.scenario_id).toBe(4);

			component.selectedStory.update(s => s ? { ...s, title: 'Renamed' } : s);
			TestBed.flushEffects();
			expect(component.selectedScenario()?.scenario_id).toBe(4);
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
		it('notifies the user and keeps the background when the delete request fails', () => {
			component.stories.set(stories);
			component.selectedStory.set(stories[0]);
			const backgroundBefore = component.selectedStory()?.background;
			vi.spyOn(component.backgroundService, 'deleteBackground').mockReturnValue(throwError(() => new Error('server down')));
			vi.spyOn(component.notify, 'error').mockImplementation(() => undefined);

			component.deleteBackground();

			// Regression: the subscribe had no error handler, so a failed delete was silent and the background looked deleted
			expect(component.notify.error).toHaveBeenCalledWith('Could not delete background.');
			expect(component.selectedStory()?.background).toEqual(backgroundBefore);
		});
	});

	describe('checkAiAvailability', () => {
		it('treats a failed availability check as unavailable without an error toast', () => {
			vi.spyOn(component.projectService, 'checkAiAvailability').mockReturnValue(throwError(() => new Error('server down')));
			vi.spyOn(component.notify, 'error').mockImplementation(() => undefined);
			component.isAiAvailable.set(true);

			component.ngOnInit();

			// AI is optional, so a failing check must not show an error toast; it only hides the AI features
			expect(component.isAiAvailable()).toBe(false);
			expect(component.notify.error).not.toHaveBeenCalled();
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
			const selStory1 = component.selectedStory()!;
			component.deleteScenario(selStory1.scenarios[0], false);
			fixture.detectChanges();
			expect(component.scenarioService.deleteScenario).toHaveBeenCalled();
		});

		it('notifies the user and keeps the scenario when the delete request fails', () => {
			component.stories.set(stories);
			component.selectedStory.set(stories[0]);
			vi.spyOn(component.scenarioService, 'deleteScenario').mockReturnValue(throwError(() => new Error('server down')));
			vi.spyOn(component.notify, 'error').mockImplementation(() => undefined);
			vi.spyOn(component, 'scenarioDeleted');

			component.deleteScenario(stories[0].scenarios[0], false);

			// Regression: the subscribe had no error handler, so a failed delete was silent and the scenario stayed listed.
			expect(component.notify.error).toHaveBeenCalled();
			expect(component.scenarioDeleted).not.toHaveBeenCalled();
		});

		it('shows a success toast, not an error toast, when the scenario was deleted', () => {
			component.stories.set(stories);
			component.selectedStory.set(stories[0]);
			vi.spyOn(component.scenarioService, 'deleteScenario').mockReturnValue(of(stories[0]));
			vi.spyOn(component.notify, 'success').mockImplementation(() => undefined);
			vi.spyOn(component.notify, 'error').mockImplementation(() => undefined);

			component.deleteScenario(stories[0].scenarios[0], false);

			// An error toast after a successful delete reads as a failed delete, so success must use the success toast.
			expect(component.notify.success).toHaveBeenCalledWith('', 'Scenario deleted');
			expect(component.notify.error).not.toHaveBeenCalled();
		});
	});


	describe('saveReport / unsaveReport error handling', () => {
		// Regression: the error branch only showed a toast and never settled the promise, so any caller
		// awaiting it would hang forever. The promise must settle on failure too.
		it('settles the saveReport promise when the request fails', async () => {
			vi.spyOn(component.reportService, 'saveReport').mockReturnValue(throwError(() => new Error('server down')));
			vi.spyOn(component.notify, 'error').mockImplementation(() => undefined);

			await component.saveReport('rep-1');

			expect(component.notify.error).toHaveBeenCalledWith('Could not update report.');
		});
	});

	describe('stories request unauthorized (401)', () => {
		it('clears the cached repository list before redirecting to login', () => {
			const clearSpy = vi.spyOn(component.projectService, 'clearRepositories').mockImplementation(() => undefined);
			const navigateSpy = vi.spyOn(component.router, 'navigate').mockResolvedValue(true);

			component.apiService.storiesErrorTrigger.update(n => n + 1);
			TestBed.flushEffects();

			// Regression: without the reset, the next user in the same SPA session saw the previous user's project list.
			expect(clearSpy).toHaveBeenCalled();
			expect(navigateSpy).toHaveBeenCalledWith(['/login']);
		});
	});

	describe('scenarioDeleted', () => {
		it('should delete the Scenario', () => {
			component.stories.set(stories);
			component.selectedStory.set(stories[0]);
			component.selectedScenario.set(stories[0].scenarios[0]);
			const story = component.selectedStory()!;
			const indexScenario: number = story.scenarios.indexOf(component.selectedScenario()!);
			const deletedScenario = story.scenarios[indexScenario];

			component.scenarioDeleted(deletedScenario.scenario_id);
			// After deleting one of two scenarios, selectScenario is called on the remaining one, setting showEditor = true
			expect(component.showEditor()).toBeTruthy();

			// Check selectedStory signal directly (not via stories array) since scenarioDeleted
			// now uses selectedStory.update() creating a new story reference
			expect(component.selectedStory()!.scenarios).not.toContain(deletedScenario);
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
			const selStory2 = component.selectedStory()!;
			component.storyService.runTests(selStory2._id!, scenarioId, {}).subscribe((_resp)=> {
				expect(component.htmlReport).toBe(html);
				expect(component.testDone()).toBeTruthy();
				expect(component.showResults()).toBeTruthy();
				expect(component.testRunning()).toBeFalsy();
			});
		});
	});

	/**
	 * Regression: a story run never told the stories bar its new status, so the status filter kept the old value.
	 */
	describe('story run status', () => {
		/** runTests reads the scroll target and the report iframe from the DOM; adds the missing ones and returns them for removal */
		function addRunDomNodes(): HTMLElement[] {
			return ['loading', 'testFrame']
				.filter(id => !document.getElementById(id))
				.map(id => document.body.appendChild(Object.assign(document.createElement(id === 'testFrame' ? 'iframe' : 'div'), { id })));
		}

		/** Minimal run response; the story run path only reads report.status and the story-level lists */
		function runResponse(status: boolean, storyStatuses?: { storyId: string; status: boolean; scenarioStatuses: [] }[]) {
			return { htmlFile: '', reportId: 'r1', report: { status, storiesTested: [], scenarioStatuses: [], storyStatuses } };
		}

		beforeEach(() => {
			// JSDOM has no scrollIntoView; runTests scrolls the loading element into view, so stub it for this describe only
			Element.prototype.scrollIntoView = vi.fn();
			vi.spyOn(component, 'testRunParams').mockReturnValue({ browser: null, emulator: null, width: undefined, height: undefined, stepWaitTime: undefined, repository: undefined, repositoryId: undefined, source: undefined, oneDriver: undefined, testRunner: '' });
			vi.spyOn(component.notify, 'info').mockImplementation(() => undefined);
			component.selectedStory.set(structuredClone(story));
		});

		afterEach(async () => {
			// testRunResponse schedules iframe.scrollIntoView in a 10 ms timer; let it fire while the stub is still installed
			await new Promise(resolve => setTimeout(resolve, 20));
			delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
		});

		it('emits the story status after a story run completes', async () => {
			const added = addRunDomNodes();
			const emit = vi.spyOn(component.scenarioService, 'storyStatusChangeEmit');
			vi.spyOn(component.storyService, 'runTests').mockReturnValue(of(runResponse(true)) as never);
			try {
				await component.runTests(null);
			} finally {
				added.forEach(node => node.remove());
			}
			expect(emit).toHaveBeenCalledWith('a', true);
		});

		it('emits the story status of the tested story after a story run with pre-conditions', async () => {
			const added = addRunDomNodes();
			component.preConditionResults = [{}];
			vi.spyOn(component, 'createTempGroup').mockResolvedValue({} as never);
			const emit = vi.spyOn(component.scenarioService, 'storyStatusChangeEmit');
			vi.spyOn(component.groupService, 'runTempGroup').mockReturnValue(of(runResponse(true, [
				{ storyId: 'z', status: true, scenarioStatuses: [] },
				{ storyId: 'a', status: false, scenarioStatuses: [] }
			])) as never);
			try {
				await component.runTests(null);
			} finally {
				added.forEach(node => node.remove());
			}
			expect(emit).toHaveBeenCalledWith('a', false);
			expect(emit).not.toHaveBeenCalledWith('z', expect.anything());
		});

		it('does not change the story status after a single-scenario run', async () => {
			const added = addRunDomNodes();
			const emit = vi.spyOn(component.scenarioService, 'storyStatusChangeEmit');
			vi.spyOn(component.storyService, 'runTests').mockReturnValue(of(runResponse(false)) as never);
			try {
				await component.runTests(1);
			} finally {
				added.forEach(node => node.remove());
			}
			expect(emit).not.toHaveBeenCalled();
		});
	});

	describe('addScenario', () => {
		it('should add Scenario', () => {
			const scenarioName = 'my new name';
			component.selectedStory.set(stories[0]);
			const scenariosAmount = component.selectedStory()!.scenarios.length;
			vi.spyOn(component.scenarioService, 'addScenario');
			const selStory3 = component.selectedStory()!;
			component.scenarioService.addScenario(selStory3._id!, scenarioName).subscribe((_resp)=> {
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
			const selStory4 = component.selectedStory()!;
			component.scenarioService.addScenario(selStory4._id!, scenarioName).subscribe((_resp)=> {
				expect(component.selectScenario).toHaveBeenCalled();
				expect(component.selectedStory()?.scenarios.length).toEqual(scenariosAmount + 1);
			});
		});


	});


	describe('selectScenario', () => {
		it('should select the Scenario', () => {
			component.selectScenario(scenario);
			expect(component.selectedScenario()).toBe(scenario);
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
		it('hands the new title and description to renameStory', () => {
			const renameStory = vi.spyOn(component, 'renameStory').mockImplementation(() => undefined);
			const newStoryTitle = 'This is my new story title';
			const newStoryDescription = 'I let here a brief description';
			component.storyService.renameStoryEmit(newStoryTitle, newStoryDescription);
			TestBed.flushEffects();
			expect(renameStory).toHaveBeenCalledTimes(1);
			expect(renameStory).toHaveBeenCalledWith(newStoryTitle, newStoryDescription);
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
			// Use signal update instead of direct mutation to trigger OnPush CD
			component.selectedStory.update(s => s ? { ...s, scenarios: [...s.scenarios, newScenario] } : s);

			expect(component.selectedStory()?.scenarios.length).toBe(initialLen + 1);
			expect(component.selectedScenario()).toBe(newScenario);
			expect(component.showEditor()).toBeTruthy();
		});

		it('should remove scenario from list via scenarioDeleted', () => {
			component.selectedStory.set(stories[0]);
			component.stories.set(stories);
			component.selectedScenario.set(stories[0].scenarios[0]);
			const initialLen = stories[0].scenarios.length;

			component.scenarioDeleted(stories[0].scenarios[0].scenario_id);

			// Check updated signal value (not the original object) since scenarioDeleted now
			// uses selectedStory.update() instead of in-place splice to trigger OnPush CD
			expect(component.selectedStory()!.scenarios.length).toBe(initialLen - 1);
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

			expect(component.selectedScenario()).toBe(testScenario);
			expect(component.showEditor()).toBeTruthy();
			expect(component.showResults()).toBeFalsy();
			expect(component.testDone()).toBeFalsy();
		});

		it('should hide editor when scenario is null', () => {
			component.selectScenario(null);

			expect(component.selectedScenario()).toBeNull();
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

		it('should keep the requested scenario when newSelectedScenario is set alongside newSelectedStory', () => {
			// Deep link /story/<id>/2: both inputs change in the same CD pass
			const twoScenarioStory: Story = {
				...structuredClone(story),
				scenarios: [
					{ ...structuredClone(story.scenarios[0]), scenario_id: 1 },
					{ ...structuredClone(story.scenarios[0]), scenario_id: 2 }
				]
			};
			fixture.componentRef.setInput('newSelectedScenario', twoScenarioStory.scenarios[1]);
			fixture.componentRef.setInput('newSelectedStory', twoScenarioStory);
			TestBed.flushEffects();

			expect(component.selectedScenario()?.scenario_id).toBe(2);
		});

		it('should fall back to the first scenario when newSelectedScenario belongs to another story', () => {
			const twoScenarioStory: Story = {
				...structuredClone(story),
				scenarios: [
					{ ...structuredClone(story.scenarios[0]), scenario_id: 1 },
					{ ...structuredClone(story.scenarios[0]), scenario_id: 2 }
				]
			};
			const foreignScenario = { ...structuredClone(story.scenarios[0]), scenario_id: 99 };
			fixture.componentRef.setInput('newSelectedScenario', foreignScenario);
			fixture.componentRef.setInput('newSelectedStory', twoScenarioStory);
			TestBed.flushEffects();

			expect(component.selectedScenario()?.scenario_id).toBe(1);
		});
	});

	describe('behavioral: DOM rendering after signal changes', () => {
		it('should show editor section when showEditor signal is true', () => {
			component.stories.set(stories);
			component.selectedStory.set(stories[0]);
			component.showEditor.set(true);
			component.selectedScenario.set(stories[0].scenarios[0]);
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
			component.selectedScenario.set(singleScenarioStory.scenarios[0]);
			component.stories.set([singleScenarioStory]);

			component.scenarioDeleted(100);

			// Flush effects since scenarioDeleted now uses selectedStory.update()
			// which triggers the newSelectedStoryEffect to re-run and call selectScenario(null)
			TestBed.flushEffects();

			// Check updated signal value (not the original object) since scenarioDeleted now
			// uses selectedStory.update() instead of in-place splice
			expect(component.selectedStory()!.scenarios.length).toBe(0);
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
			component.selectedScenario.set(fakeScenario);

			expect(() => component.scenarioDeleted(fakeScenario.scenario_id)).not.toThrow();
		});
	});

	/**
	 * Regression: action triggers were payload signals that were never reset, and the
	 * effects consuming them also tracked selectedStory/selectedScenario. Every selection
	 * change therefore replayed the last action (cascading scenario deletes, repeated runs).
	 */
	describe('regression: action signals must not replay on selection changes', () => {
		/** Makes the confirm dialog answer "delete" (or any other result) */
		function answerDialogWith(result: string) {
			vi.spyOn(component.dialog, 'open').mockReturnValue({
				afterClosed: () => of(result)
			} as unknown as ReturnType<MatDialog['open']>);
		}

		it('deletes exactly one scenario per delete request, even after the selection moves on', () => {
			const http = TestBed.inject(HttpTestingController);
			const editable = structuredClone(story);
			editable.scenarios.push({ ...structuredClone(story.scenarios[0]), scenario_id: 5, name: 'third scenario' });
			component.selectedStory.set(editable);
			component.selectScenario(editable.scenarios[0]);
			answerDialogWith('delete');

			component.showDeleteScenarioToast(editable.scenarios[0]);
			TestBed.flushEffects();

			const deletes = http.match(req => req.method === 'DELETE');
			expect(deletes).toHaveLength(1);
			expect(deletes[0].request.url).toContain('/story/scenario/a/1');
			deletes[0].flush({ ...editable, scenarios: editable.scenarios.slice(1) });
			TestBed.flushEffects();

			// Selection has moved (scenarioDeleted selects the last remaining scenario); a later
			// selection change must not trigger another delete either
			component.selectScenario(component.selectedStory()!.scenarios[0]);
			TestBed.flushEffects();
			expect(http.match(req => req.method === 'DELETE')).toHaveLength(0);
		});

		it('handles a run request once and does not replay it when the selected story changes', () => {
			const runOption = vi.spyOn(component, 'runOption').mockImplementation(() => undefined);
			component.selectedStory.set(structuredClone(story));
			component.apiService.runSaveOption('run');
			TestBed.flushEffects();
			expect(runOption).toHaveBeenCalledTimes(1);

			component.selectedStory.set(structuredClone(stories[0]));
			TestBed.flushEffects();
			expect(runOption).toHaveBeenCalledTimes(1);
		});

		it('does not replay an earlier rename when a new editor is created', () => {
			// Prototype spy: the freshly created editor must reach the same method as the first one
			const renameStory = vi.spyOn(StoryEditorComponent.prototype, 'renameStory').mockImplementation(() => undefined);
			try {
				component.storyService.renameStoryEmit('Old title', 'Old description');
				TestBed.flushEffects();
				expect(renameStory).toHaveBeenCalledTimes(1);

				// Regression: the payload signal was never reset, so a freshly created editor re-applied the old rename on construction
				const fresh = TestBed.createComponent(StoryEditorComponent);
				fresh.componentRef.setInput('isDark', false);
				fresh.detectChanges();
				TestBed.flushEffects();
				expect(renameStory).toHaveBeenCalledTimes(1);

				// Positive control: the new editor does react to requests made after its creation
				component.storyService.renameStoryEmit('New title', 'New description');
				TestBed.flushEffects();
				expect(renameStory).toHaveBeenCalledTimes(3);
			} finally {
				renameStory.mockRestore();
			}
		});

		it('applies every run request of a repeated identical option', () => {
			const runOption = vi.spyOn(component, 'runOption').mockImplementation(() => undefined);
			component.selectedStory.set(structuredClone(story));
			component.apiService.runSaveOption('run');
			TestBed.flushEffects();
			component.apiService.runSaveOption('run');
			TestBed.flushEffects();
			expect(runOption).toHaveBeenCalledTimes(2);
		});

		it('removes the deleted scenario even when another scenario is selected', () => {
			const [first] = story.scenarios;
			const twoScenarios: Story = {
				...structuredClone(story),
				scenarios: [{ ...structuredClone(first), scenario_id: 1 }, { ...structuredClone(first), scenario_id: 2 }]
			};
			component.selectedStory.set(twoScenarios);
			// The user moved to scenario 2 while the delete request for scenario 1 was in flight
			component.selectedScenario.set(twoScenarios.scenarios[1]);

			component.scenarioDeleted(1);

			expect(component.selectedStory()!.scenarios.map(s => s.scenario_id)).toEqual([2]);
			expect(component.selectedScenario()?.scenario_id).toBe(2);
			expect(component.showEditor()).toBeTruthy();
		});

		it('does not reselect the deleted scenario when it was the only one', () => {
			const [first] = story.scenarios;
			const onlyScenario: Story = { ...structuredClone(story), scenarios: [{ ...structuredClone(first), scenario_id: 7 }] };
			component.selectedStory.set(onlyScenario);
			component.selectedScenario.set(onlyScenario.scenarios[0]);

			component.scenarioDeleted(7);

			// Regression: the pre-update list still held the deleted scenario, so it was selected again
			expect(component.selectedStory()!.scenarios).toEqual([]);
			expect(component.selectedScenario()).toBeNull();
			expect(component.showEditor()).toBeFalsy();
		});

		it('asks before running when the selected scenario has unsaved edits', () => {
			component.selectedStory.set({ ...structuredClone(story), background: { ...story.background, saved: true } });
			// The scenario editor child owns the scenario's saved flag
			Object.defineProperty(component, 'scenarioChild', { value: () => ({ selectedScenario: () => ({ saved: false }) }) });
			const open = vi.spyOn(component.dialog, 'open').mockReturnValue({ afterClosed: () => of(undefined) } as unknown as ReturnType<MatDialog['open']>);
			const runTests = vi.spyOn(component.storyService, 'runTests');

			component.runTests(1);

			// The dialog must come first: the backend runs the stored scenario, not the unsaved edits
			expect(open).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
				data: expect.objectContaining({ title: 'Scenario was not saved' })
			}));
			expect(runTests).not.toHaveBeenCalled();
		});

		it('ends the one-run unsaved allowance when the run fails', async () => {
			component.selectedStory.set(structuredClone(story));
			component.runUnsaved = true;
			// The run path scrolls the loading element into view; reuse the rendered one if present
			const existing = document.getElementById('loading');
			const loading = existing ?? document.body.appendChild(Object.assign(document.createElement('div'), { id: 'loading' }));
			loading.scrollIntoView = vi.fn();
			vi.spyOn(component, 'testRunParams').mockReturnValue({ browser: null, emulator: null, width: undefined, height: undefined, stepWaitTime: undefined, repository: undefined, repositoryId: undefined, source: undefined, oneDriver: undefined, testRunner: '' });
			vi.spyOn(component.notify, 'error').mockImplementation(() => undefined);
			const runTests = vi.spyOn(component.storyService, 'runTests').mockReturnValue(throwError(() => new Error('run failed')));

			try {
				await component.runTests(1);
			} finally {
				if (!existing) loading.remove();
			}

			expect(runTests).toHaveBeenCalled();
			// Regression: runUnsaved was only cleared on report completion, so after a failed run every later
			// Run of an unsaved scenario skipped the dialog
			expect(component.runUnsaved).toBe(false);
		});

		it('keeps local story edits when the newSelectedStory input has not changed', () => {
			fixture.componentRef.setInput('newSelectedStory', structuredClone(stories[0]));
			TestBed.flushEffects();

			const edited = { ...component.selectedStory()!, title: 'edited locally' };
			component.selectedStory.set(edited);
			TestBed.flushEffects();
			expect(component.selectedStory()).toBe(edited);
		});
	});
});


