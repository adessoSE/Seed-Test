import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { StoriesBarComponent } from './stories-bar.component';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { Story } from '@seed-test/shared/models/Story';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { of } from 'rxjs';
import { GroupService } from '../Services/group.service';
import { NotificationService } from '../Services/notification.service';

describe('StoriesBarComponent', () => {
	let component: StoriesBarComponent;
	let fixture: ComponentFixture<StoriesBarComponent>;
	const storiesForAll: Story[] = [{story_id:502603476,_id:'34',storySource:'github',repo_type:'github',title:'Gratis Versand',
		body:'Als Premium Kunde erhalte ich freien Versand, wenn ich 5 BÜcher bestelle',
		state:'open',issue_number:66,assignee:'adessoCucumber',
		assignee_avatar_url:'https://avatars0.githubusercontent.com/u/50622173?v=4',
		scenarios:[{scenario_id:1,comment:'',name:'Premium Kunde 5 Books',
			stepDefinitions:{given:[{id:1,mid:'',pre:'As a',post:'',stepType:'given',type:'Role',
				values:['Premium Customer'], 'isExample':[]},{id:2,'mid':'',pre:'I am on the website:',post:'',stepType:'given',
				type:'Website',values:['www.onlineshop.de'], 'isExample':[]}],when:[{id:1,mid:'',
				pre:'I click the button:',post:'',stepType:'when',type:'Button',values:['Add 5 Books'], 'isExample':[]},
			{id:2,mid:'',pre:'I click the button:',post:'',stepType:'when',type:'Button',
				values:['Delivery Options'], 'isExample':[]}],then:[{id:1,mid:'in the textbox:',
				pre:'So I can see the text',post:'',stepType:'then',type:'Text',
				values:['Free Delivery','Delivery Costs'], 'isExample':[]}],example:[]}}],
		background:{name:'New Background',stepDefinitions:{when:[]}}},
	{'story_id':501324078,_id:'46',storySource:'db',repo_type:'db',title:'Seed-Test','body':'Test the our own website','state':'open',
		issue_number:55,assignee:'adessoCucumber',
		assignee_avatar_url:'https://avatars0.githubusercontent.com/u/50622173?v=4',
		scenarios:[{scenario_id:1,comment:'',name:'Create Scenario',stepDefinitions:{given:[{id:1,mid:'',
			pre:'I am on the website:',post:'',stepType:'given',type:'Website',
			values:['https://cucumber-app.herokuapp.com/login'], 'isExample':[]}],'when':[{'id':1,'mid':'',
			pre:'I click the button:',post:'',stepType:'when',type:'Button',values:['loginTestButton'], 'isExample':[]},
		{id:2,mid:'',pre:'I click the button:',post:'',stepType:'when',type:'Button',values:['repository_0'], 'isExample':[]},
		{id:3,mid:'',pre:'I click the button:',post:'',stepType:'when',type:'Button',values:['story0'], 'isExample':[]},
		{id:4,mid:'',pre:'I click the button:',post:'',stepType:'when',type:'Button',values:['story_add_scenario0'], 'isExample':[]}],
		then:[{id:1,mid:'',pre:'So I will be navigated to the website:',post:'',stepType:'then',
			type:'Website',values:['https://cucumber-app.herokuapp.com/#'], 'isExample':[]}],example:[]}},
		{scenario_id:2,comment:'',name:'New Scenario',stepDefinitions:{given:[],when:[],then:[],example:[]}}],
		background:{name:'New Background',stepDefinitions:{when:[]}}}];
  
	// Builds a minimal custom (db) story for reorder/renumber tests
	function makeDbStory(id: string, issueNumber: number): Story {
		return {
			story_id: Number(id),
			_id: id,
			storySource: 'db',
			repo_type: 'db',
			title: 'Story ' + id,
			body: 'Body',
			state: 'open',
			issue_number: issueNumber,
			assignee: 'user',
			assignee_avatar_url: '',
			scenarios: [] as any[],
			background: { name: '', stepDefinitions: { when: [] } }
		};
	}

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [HttpClientTestingModule, MatSnackBarModule, StoriesBarComponent],
			schemas: [NO_ERRORS_SCHEMA]
		})
			.compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(StoriesBarComponent);
		component = fixture.componentInstance;
		// Mock storyService.stories() so linkedSignal doesn't throw on undefined during detectChanges
		vi.spyOn(component.storyService, 'stories').mockReturnValue([]);
		// Provide required signal input before first change detection
		fixture.componentRef.setInput('isDark', false);
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
  
	describe('sortedStories', () =>{
		it('should return the stories sorted', async () => {
			const storiesToFilter = storiesForAll;
			component.storyTermChange(storiesToFilter);
			const sorted = storiesToFilter;
			component.stories.set(storiesForAll);
			component.isFilterActive = true;
			component.getSortedStories();
			expect(component.stories()).toEqual(sorted);
		});
	});

	describe('selectScenario', () =>{
		it('should emit the scenario via scenarioChosen', () =>{
			const scenario = {scenario_id:2,comment:'',name:'New Scenario',stepDefinitions:{given:[],when:[],then:[],example:[]}};
			vi.spyOn(component.scenarioChosen, 'emit');
			component.selectScenario(scenario);
			expect(component.scenarioChosen.emit).toHaveBeenCalledWith(scenario);
		});
	});

	describe('selectStory', () =>{

		beforeEach(() =>{
			component.stories.set(storiesForAll);
		});

		afterEach(() =>{
			component.stories.set(undefined as any);
		});

		it('should emit the story via storyChosen', () =>{
			const story = component.stories()[0];
			vi.spyOn(component.storyChosen, 'emit');
			component.selectStory(story);
			expect(component.storyChosen.emit).toHaveBeenCalledWith(story);
		});
	});

	describe('source-aware numbering', () => {
		it('custom story (storySource=db) with no issue_number shows position-based index', () => {
			const customStory: Story = {
				story_id: 1,
				_id: 'c1',
				storySource: 'db',
				repo_type: 'db',
				title: 'Custom Story',
				body: 'Body',
				state: 'open',
				issue_number: undefined,
				assignee: 'user',
				assignee_avatar_url: '',
				scenarios: [] as any[],
				background: { name: '', stepDefinitions: { when: [] } }
			};
			component.stories.set([customStory]);
			component.storyString = undefined as any;
			component.isFilterActive = false;
			expect(component.getIssueNumber(customStory)).toBe(1);
		});

		it('custom story (storySource=db) with persisted issue_number shows that value', () => {
			const customStory: Story = {
				story_id: 1,
				_id: 'c2',
				storySource: 'db',
				repo_type: 'db',
				title: 'Custom Story #2',
				body: 'Body',
				state: 'open',
				issue_number: 3,
				assignee: 'user',
				assignee_avatar_url: '',
				scenarios: [] as any[],
				background: { name: '', stepDefinitions: { when: [] } }
			};
			const otherStory: Story = {
				story_id: 2,
				_id: 'c3',
				storySource: 'db',
				repo_type: 'db',
				title: 'Other Story',
				body: 'Body',
				state: 'open',
				issue_number: 1,
				assignee: 'user',
				assignee_avatar_url: '',
				scenarios: [] as any[],
				background: { name: '', stepDefinitions: { when: [] } }
			};
			component.stories.set([customStory, otherStory]);
			component.storyString = undefined as any;
			component.isFilterActive = false;
			expect(component.getIssueNumber(customStory)).toBe(3);
			expect(component.getIssueNumber(otherStory)).toBe(1);
		});

		it('linked jira story shows its real external issue_number', () => {
			const jiraStory: Story = {
				story_id: 100,
				_id: 'j1',
				storySource: 'jira',
				repo_type: 'jira',
				title: 'Jira Story',
				body: 'Body',
				state: 'open',
				issue_number: 'JRA-42',
				assignee: 'jiraUser',
				assignee_avatar_url: '',
				scenarios: [] as any[],
				background: { name: '', stepDefinitions: { when: [] } }
			};
			component.stories.set([jiraStory]);
			component.storyString = undefined as any;
			component.isFilterActive = false;
			expect(component.getIssueNumber(jiraStory)).toBe(42);
		});

		it('linked github story shows its real external issue_number', () => {
			const githubStory: Story = {
				story_id: 200,
				_id: 'gh1',
				storySource: 'github',
				repo_type: 'github',
				title: 'GitHub Story',
				body: 'Body',
				state: 'open',
				issue_number: 99,
				assignee: 'ghUser',
				assignee_avatar_url: 'https://avatars.githubusercontent.com/u/1',
				scenarios: [] as any[],
				background: { name: '', stepDefinitions: { when: [] } }
			};
			component.stories.set([githubStory]);
			component.storyString = undefined as any;
			component.isFilterActive = false;
			expect(component.getIssueNumber(githubStory)).toBe(99);
		});

		it('mixed list shows custom index and linked keys independently', () => {
			const custom1: Story = {
				story_id: 1,
				_id: 'm1',
				storySource: 'db',
				repo_type: 'db',
				title: 'Custom A',
				body: 'Body',
				state: 'open',
				issue_number: 1,
				assignee: 'user',
				assignee_avatar_url: '',
				scenarios: [] as any[],
				background: { name: '', stepDefinitions: { when: [] } }
			};
			const linked: Story = {
				story_id: 2,
				_id: 'm2',
				storySource: 'github',
				repo_type: 'github',
				title: 'GitHub Link',
				body: 'Body',
				state: 'open',
				issue_number: 42,
				assignee: 'ghUser',
				assignee_avatar_url: 'https://avatars.githubusercontent.com/u/1',
				scenarios: [] as any[],
				background: { name: '', stepDefinitions: { when: [] } }
			};
			const custom2: Story = {
				story_id: 3,
				_id: 'm3',
				storySource: 'db',
				repo_type: 'db',
				title: 'Custom B',
				body: 'Body',
				state: 'open',
				issue_number: undefined,
				assignee: 'user',
				assignee_avatar_url: '',
				scenarios: [] as any[],
				background: { name: '', stepDefinitions: { when: [] } }
			};
			component.stories.set([custom1, linked, custom2]);
			component.storyString = undefined as any;
			component.isFilterActive = false;
			expect(component.getIssueNumber(custom1)).toBe(1);
			expect(component.getIssueNumber(linked)).toBe(42);
			expect(component.getIssueNumber(custom2)).toBe(3);
		});

		it('storyNumbering preserves source-aware numbering in Map', () => {
			const linkedStory: Story = {
				story_id: 1,
				_id: 'sn1',
				storySource: 'jira',
				repo_type: 'jira',
				title: 'JRA Story',
				body: 'Body',
				state: 'open',
				issue_number: 'JRA-7',
				assignee: 'user',
				assignee_avatar_url: '',
				scenarios: [] as any[],
				background: { name: '', stepDefinitions: { when: [] } }
			};
			const customStory: Story = {
				story_id: 2,
				_id: 'sn2',
				storySource: 'db',
				repo_type: 'db',
				title: 'Custom',
				body: 'Body',
				state: 'open',
				issue_number: 2,
				assignee: 'user',
				assignee_avatar_url: '',
				scenarios: [] as any[],
				background: { name: '', stepDefinitions: { when: [] } }
			};
			component.stories.set([linkedStory, customStory]);
			component.storyString = undefined as any;
			component.isFilterActive = false;
			const result = component.storyNumbering();
			expect(result.numbering.get(linkedStory)).toBe(7);
			expect(result.numbering.get(customStory)).toBe(2);
		});

		it('legacy story without storySource treated as custom (position fallback)', () => {
			const legacyStory: Story = {
				story_id: 1,
				_id: 'l1',
				storySource: '' as any,
				repo_type: 'db',
				title: 'Legacy Story',
				body: 'Body',
				state: 'open',
				issue_number: 0,
				assignee: 'user',
				assignee_avatar_url: '',
				scenarios: [] as any[],
				background: { name: '', stepDefinitions: { when: [] } }
			};
			component.stories.set([legacyStory]);
			component.storyString = undefined as any;
			component.isFilterActive = false;
			expect(component.getIssueNumber(legacyStory)).toBe(1);
		});
	});

	describe('empty custom project empty state (Ticket #048)', () => {
		beforeEach(() => {
			// Force a custom (db) source so isCustomStory() resolves true even with zero stories
			localStorage.setItem('source', 'db');
		});

		afterEach(() => {
			localStorage.removeItem('source');
		});

		it('shows the Create First Story CTA when a custom project has no stories', () => {
			component.stories.set([]);
			fixture.detectChanges();
			const button = fixture.debugElement.query(el => el.nativeElement.id === 'createFirstStory');
			expect(button).toBeTruthy();
			expect(button.nativeElement.textContent).toContain('Create First Story');
		});

		it('wires the empty-state CTA to the create-story handler', () => {
			const openSpy = vi.spyOn(component, 'openCreateNewStoryModal');
			component.stories.set([]);
			fixture.detectChanges();
			const button = fixture.debugElement.query(el => el.nativeElement.id === 'createFirstStory');
			button.nativeElement.click();
			expect(openSpy).toHaveBeenCalled();
		});

		it('hides the empty-state CTA once stories exist', () => {
			component.stories.set(storiesForAll);
			fixture.detectChanges();
			const button = fixture.debugElement.query(el => el.nativeElement.id === 'createFirstStory');
			expect(button).toBeFalsy();
		});
	});

	describe('dropStory renumbering (Bug A)', () => {
		beforeEach(() => {
			// Avoid real HTTP on the order-persist call after a drop
			vi.spyOn(component.storyService, 'updateStoryList').mockReturnValue(of({}));
			localStorage.setItem('id', 'repo1');
		});

		afterEach(() => {
			localStorage.removeItem('id');
			vi.restoreAllMocks();
		});

		it('re-enumerates custom (db) issue_number to match the new order without reload', () => {
			const a = makeDbStory('a', 1);
			const b = makeDbStory('b', 2);
			const c = makeDbStory('c', 3);
			component.stories.set([a, b, c]);
			component.storyString = undefined as any;
			component.isFilterActive = false;
			// Drag c (index 2) to the front (index 0)
			component.dropStory({ previousIndex: 2, currentIndex: 0 } as CdkDragDrop<Story[]>);
			expect(component.stories()[0]).toBe(c);
			expect(c.issue_number).toBe(1);
			expect(a.issue_number).toBe(2);
			expect(b.issue_number).toBe(3);
			// Displayed number reflects the new order immediately, matching the backend persist
			expect(component.getIssueNumber(c)).toBe(1);
			expect(component.getIssueNumber(a)).toBe(2);
			expect(component.getIssueNumber(b)).toBe(3);
		});

		it('keeps linked story keys untouched while renumbering custom stories', () => {
			const custom = makeDbStory('d1', 1);
			const linked: Story = {
				story_id: 200,
				_id: 'gh1',
				storySource: 'github',
				repo_type: 'github',
				title: 'GitHub Story',
				body: 'Body',
				state: 'open',
				issue_number: 99,
				assignee: 'ghUser',
				assignee_avatar_url: 'https://avatars.githubusercontent.com/u/1',
				scenarios: [] as any[],
				background: { name: '', stepDefinitions: { when: [] } }
			};
			const custom2 = makeDbStory('d2', 2);
			component.stories.set([custom, linked, custom2]);
			component.storyString = undefined as any;
			component.isFilterActive = false;
			// Drag custom2 (index 2) to the front (index 0)
			component.dropStory({ previousIndex: 2, currentIndex: 0 } as CdkDragDrop<Story[]>);
			expect(component.stories()[0]).toBe(custom2);
			// custom2 becomes number 1, custom becomes number 2 (linked skipped by the counter)
			expect(custom2.issue_number).toBe(1);
			expect(custom.issue_number).toBe(2);
			// Linked github story keeps its external key
			expect(linked.issue_number).toBe(99);
			expect(component.getIssueNumber(linked)).toBe(99);
		});
	});

	describe('scrollToSelectedStory (Bug B)', () => {
		it('targets the element id matching the rendered array index, not issue_number', async () => {
			// Custom stories whose persisted issue_number differs from their array position
			const story1 = makeDbStory('x1', 3);
			const story2 = makeDbStory('x2', 9);
			component.stories.set([story1, story2]);
			component.storyString = undefined as any;
			component.isFilterActive = false;
			fixture.detectChanges();
			component.selectStory(story2);
			// story2 is at array index 1 -> the rendered <a> carries id 'story2' (index-based)
			const targetEl = fixture.debugElement.query(el => el.nativeElement.id === 'story2');
			expect(targetEl).toBeTruthy();
			const scrollSpy = vi.fn();
			(targetEl.nativeElement as Element & { scrollIntoView: unknown }).scrollIntoView = scrollSpy;
			component.scrollToSelectedStory();
			// scrollToSelectedStory defers via setTimeout(0) — flush a macrotask
			await new Promise(resolve => setTimeout(resolve, 0));
			// The lookup must resolve the selected story to its index-based element id
			expect(scrollSpy).toHaveBeenCalled();
		});
	});

	/**
	 * Regression: the status-change payload stayed set and the effect tracked the story list,
	 * so every later list change re-applied the old lastTestPassed value to the new objects.
	 */
	describe('regression: scenario status change must not be re-applied', () => {
		it('applies a status change once, not again when the story list is replaced', () => {
			const before = { _id: 'a', story_id: 1, scenarios: [{ scenario_id: 1, name: 'x', lastTestPassed: undefined }] } as unknown as Story;
			component.stories.set([before]);
			component.scenarioService.scenarioStatusChangeEmit('a', 1, true);
			TestBed.flushEffects();
			expect(before.scenarios[0].lastTestPassed).toBe(true);

			const reloaded = { _id: 'a', story_id: 1, scenarios: [{ scenario_id: 1, name: 'x', lastTestPassed: false }] } as unknown as Story;
			component.stories.set([reloaded]);
			TestBed.flushEffects();
			expect(reloaded.scenarios[0].lastTestPassed).toBe(false);
		});

		it('applies every status change of one run, even when they are emitted in one tick', () => {
			const story = {
				_id: 'a', story_id: 1,
				scenarios: [{ scenario_id: 1, name: 'x', lastTestPassed: undefined }, { scenario_id: 2, name: 'y', lastTestPassed: undefined }]
			} as unknown as Story;
			component.stories.set([story]);

			// A run reports one status per scenario in a loop; a single payload slot kept only the last one
			component.scenarioService.scenarioStatusChangeEmit('a', 1, true);
			component.scenarioService.scenarioStatusChangeEmit('a', 2, false);
			TestBed.flushEffects();

			expect(story.scenarios[0].lastTestPassed).toBe(true);
			expect(story.scenarios[1].lastTestPassed).toBe(false);
		});
	});

	/**
	 * Regression: create/update/delete requests were payload signals reset by the handler only after
	 * a race with re-initialisation, so a repeated identical request was dropped or re-run on construction.
	 */
	describe('story deletion feedback', () => {
		it('shows a success toast, not an error toast, after a story is deleted', () => {
			const story = makeDbStory('7', 1);
			component.stories.set([story]);
			component.selectedStory.set(story);
			const notify = TestBed.inject(NotificationService);
			const success = vi.spyOn(notify, 'success');
			const error = vi.spyOn(notify, 'error');
			vi.spyOn(component.storyService, 'deleteStory').mockReturnValue(of({} as any));
			vi.spyOn(component.groupService, 'getGroups').mockReturnValue(of([]));

			component.deleteStory();

			expect(success).toHaveBeenCalledWith('', 'Story deleted');
			expect(error).not.toHaveBeenCalled();
		});
	});

	describe('regression: group requests run once per request', () => {
		it('runs a repeated identical group creation once per request', () => {
			const create = vi.spyOn(StoriesBarComponent.prototype as unknown as { handleCreateGroup: (p: unknown) => Promise<void> }, 'handleCreateGroup').mockResolvedValue(undefined);
			try {
				const payload = { repositoryContainer: { _id: 'r1', repoName: 'repo', source: 'db' }, group: { title: 'G', member_stories: [], isSequential: false } } as unknown as Parameters<GroupService['createGroupEvent']>[0];
				TestBed.inject(GroupService).createGroupEvent(payload);
				TestBed.flushEffects();
				TestBed.inject(GroupService).createGroupEvent(payload);
				TestBed.flushEffects();
				expect(create).toHaveBeenCalledTimes(2);
			} finally {
				create.mockRestore();
			}
		});

		it('does not replay an earlier group creation in a newly created list', () => {
			const create = vi.spyOn(StoriesBarComponent.prototype as unknown as { handleCreateGroup: (p: unknown) => Promise<void> }, 'handleCreateGroup').mockResolvedValue(undefined);
			try {
				const payload = { repositoryContainer: { _id: 'r1', repoName: 'repo', source: 'db' }, group: { title: 'G', member_stories: [], isSequential: false } } as unknown as Parameters<GroupService['createGroupEvent']>[0];
				TestBed.inject(GroupService).createGroupEvent(payload);
				TestBed.flushEffects();
				expect(create).toHaveBeenCalledTimes(1);

				const fresh = TestBed.createComponent(StoriesBarComponent);
				fresh.componentRef.setInput('isDark', false);
				TestBed.flushEffects();
				expect(create).toHaveBeenCalledTimes(1);

				// Positive control: the new list does react to requests made after its creation
				TestBed.inject(GroupService).createGroupEvent(payload);
				TestBed.flushEffects();
				expect(create).toHaveBeenCalledTimes(3);
			} finally {
				create.mockRestore();
			}
		});
	});
});
