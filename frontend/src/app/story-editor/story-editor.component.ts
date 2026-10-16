import { Router } from '@angular/router';
import { Component, OnInit, AfterViewChecked, ChangeDetectionStrategy, inject, output, input, viewChild, signal, effect, untracked } from '@angular/core';
import { ApiService } from '../Services/api.service';
import { Story } from '@seed-test/shared/models/Story';
import { Scenario } from '@seed-test/shared/models/Scenario';
import { StepType } from '@seed-test/shared/models/StepType';
import { Background } from '@seed-test/shared/models/Background';
import { NotificationService } from '../Services/notification.service';
import { saveAs } from 'file-saver';
import { ThemingService } from '../Services/theming.service';
import { RenameStoryComponent } from '../modals/rename-story/rename-story.component';
import { firstValueFrom } from 'rxjs';
import { CreateScenarioComponent } from '../modals/create-scenario/create-scenario.component';
import { CreateNewStoryComponent } from '../modals/create-new-story/create-new-story.component';
import { RenameBackgroundComponent } from '../modals/rename-background/rename-background.component';
import { BackgroundService } from '../Services/background.service';
import { StoryService } from '../Services/story.service';
import { ScenarioService } from '../Services/scenario.service';
import { XrayService } from '../Services/xray.service';
import { GroupService } from '../Services/group.service';
import { ReportService } from '../Services/report.service';
import { ProjectService } from '../Services/project.service';
import { LoginService } from '../Services/login.service';
import { AiConfig, RepositoryContainer } from '@seed-test/shared/models/RepositoryContainer';
import { SaveBlockFormComponent } from '../modals/save-block-form/save-block-form.component';
import { Block } from '@seed-test/shared/models/Block';
import { StepDefinition } from '@seed-test/shared/models/StepDefinition';
import { BlockService } from '../Services/block.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent, ConfirmDialogData } from '../modals/confirm-dialog/confirm-dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WorkgroupEditComponent } from '../modals/workgroup-edit/workgroup-edit.component';
import { ManagementService } from '../Services/management.service';
import { ExecutionListComponent } from '../modals/execution-list/execution-list.component';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { MatFabButton, MatIconButton } from '@angular/material/button';
import { MatMenuTrigger, MatMenu } from '@angular/material/menu';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatFormField, MatLabel } from '@angular/material/select';
import { MatInput } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatAccordion, MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle, MatExpansionPanelDescription } from '@angular/material/expansion';
import { MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { MatTooltip } from '@angular/material/tooltip';
import { NgStyle, TitleCasePipe, DatePipe } from '@angular/common';
import { BaseEditorComponent } from '../base-editor/base-editor.component';
import { WindowSizeComponent } from '../modals/window-size/window-size.component';
import { CdkCopyToClipboard } from '@angular/cdk/clipboard';
import { ScenarioEditorComponent } from '../scenario-editor/scenario-editor.component';
import { onActionTrigger } from '../Services/action-trigger';

/** Shape of the raw test execution response from the backend */
interface TestRunResponse {
	htmlFile: string;
	reportId: string;
	report: TestReport;
}

/** Shape of the test report within the execution response */
interface TestReport {
	status: boolean;
	storiesTested: { scenarios: Scenario[] }[];
	scenarioStatuses: { scenarioId: number; status: boolean }[];
	/** Present on group reports (pre-condition runs); each entry holds the status the backend persisted for that story */
	storyStatuses?: { storyId: string; status: boolean }[];
}

/**
 * Component for the Story editor
 */
@Component({
	selector: 'app-story-editor',
	templateUrl: './story-editor.component.html',
	styleUrls: [
		'../base-editor/base-editor.component.css',
		'./story-editor.component.css'
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [CdkScrollable, MatFabButton, MatIconButton, MatMenuTrigger, MatIcon, MatProgressSpinner, MatMenu, MatFormField, MatLabel, MatInput, FormsModule, MatAccordion, MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle, MatExpansionPanelDescription, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatTooltip, BaseEditorComponent, NgStyle, WindowSizeComponent, CdkCopyToClipboard, ScenarioEditorComponent, RenameStoryComponent, RenameBackgroundComponent, SaveBlockFormComponent, CreateScenarioComponent, CreateNewStoryComponent, WorkgroupEditComponent, ExecutionListComponent, TitleCasePipe, DatePipe]
})
export class StoryEditorComponent implements OnInit, AfterViewChecked {
	apiService = inject(ApiService);
	notify = inject(NotificationService);
	themeService = inject(ThemingService);
	backgroundService = inject(BackgroundService);
	storyService = inject(StoryService);
	scenarioService = inject(ScenarioService);
	xrayService = inject(XrayService);
	reportService = inject(ReportService);
	router = inject(Router);
	projectService = inject(ProjectService);
	loginService = inject(LoginService);
	blockService = inject(BlockService);
	managmentService = inject(ManagementService);
	dialog = inject(MatDialog);
	private snackBar = inject(MatSnackBar);
	groupService = inject(GroupService);

	/**
   * set new currently selected scenario
   */
	readonly newSelectedScenario = input<Scenario>();

	/**
   * set new stories
   */
	readonly newStories = input<Story[]>();

	/**
   * set new currently selected story
   */
	readonly newSelectedStory = input<Story>();

	/**
   * show loading when tests of groups run
   * hide result of story
   */
	readonly testRunningForGroup = input<boolean>();

	/**
   * Original step types
   */
	readonly originalStepTypes = signal<StepType[]>([]);

	/**
   * List of stories
   */
	readonly stories = signal<Story[]>([]);

	/**
   * List of backgrounds
   */
	backgrounds!: Background[];
	/**
   * List of filtered backgrounds
   */
	filteredBackgrounds!: Background[];

	/**
   * Currently selected story
   */
	readonly selectedStory = signal<Story | undefined>(undefined);

	/**
    * Currently selected scenario (signal for zoneless ChangeDetection reactivity)
    */
	readonly selectedScenario = signal<Scenario | null>(null);

	/**
   * Currently selected repository
   */
	readonly selectedRepository = input.required<RepositoryContainer>();

	/**
   * Current repo Id
   */

	repoId!: string;
	/**
   * If the story editor should be shown
   */
	readonly showEditor = signal(false);
	/**
   * Currently retrieved projects
   */
	repositories!: RepositoryContainer[];

	/**
   * If the results should be shown
   */
	readonly showResults = signal(false);

	/**
   * If the description should be shown
   */
	showDescription = false;

	/**
  * if the Source Steps Panel is open.
  */
	showSourceSteps = false;

	/**
   * If the background should be shown
   */
	readonly showBackground = signal(false);

	/**
   * if the test is done
   */
	readonly testDone = signal(false);

	/**
   * If the test is running
   */
	readonly testRunning = signal(false);
	testRunningGroup!: boolean;

	/**
   * html report of the result
   */
	htmlReport!: BlobPart;

	/**
   * if the stories are loaded
   */
	readonly storiesLoaded = signal(false);
	/**
   * If there is a error in the stories request
   */
	readonly storiesError = signal(false);

	/**
   * If the repository is a custom project
   */
	readonly db = signal(false);

	/**
   * If the test should run without saving the story or scenario
   */
	runUnsaved = false;

	/**
   * id of the story which is currently getting tested
   */
	currentTestStoryId!: number;

	/**
   * id of the scenario which is currently getting tested
   */
	currentTestScenarioId!: number;
	/**
   * Currently retrieved blocks
   */
	readonly blocks = signal<Block[]>([]);
	/**
   * Converted blocks as backgrounds
   */
	blockAsBackground!: Background[];
	/**
   *If the modal Save background as a block open
   */
	openBlockModal: boolean | undefined;
	/**
   * if the background should be saved and then the test run
   */
	saveBackgroundAndRun = false;

	/**
   * if the report is saved
   */
	readonly reportIsSaved = signal(false);
	error!: string;
	/**
   * Object id of the current report
   */
	readonly reportId = signal<string | null>(null);

	/*
   * Report of the test
   */
	testReport!: TestReport;

	/**
   * Name for a new step
   */
	newStepName = 'New Step';

	/**
   * if the Panel is open.
   */
	panelOpenState = false;

	/**
   * Boolean driver indicator
   */
	gecko_enabled: string | null;
	chromium_enabled: string | null;
	edge_enabled: string | null;
	webkit_enabled: string | null;

	/**
   * Global settings indicator
   */
	readonly testRunner = signal<string>('seleniumWebdriver');

	/**
   * Global settings indicator
   */
	readonly globalSettingsActivated = signal(false);

	/**
   * Project configuartion settings
   */

	repoSettings: RepositoryContainer['settings'];

	/*
   * Width of the window size
   */
	width!: number;

	/*
   * Height of the window size
   */
	height!: number;

	/**
   * Email of the user
   */
	email!: string;

	/**
   * User id
   */
	id!: string;

	lastToFocus: string | undefined;

	story!: Story;

	/**
   * Loading status for AI per story
   */
	aiLoadingStories = new Set<string>();

	/**
   * Suggestions for AI per story
   */
	aiSuggestions = new Map<string, { scenarios: Scenario[] }>();

	/**
   * User is reviewing AI generated content
   */
	readonly isReviewingAi = signal(false);

	readonly isAiAvailable = signal(false);

	/**
   * Mapping for Precondition Stories
   */
	preConditionResults: unknown[] = [];

	// Properties to hold the temporary model names from the new UI
	overrideTextModel!: string;
	overrideJsonModel!: string;

	readonly TEMPLATE_NAME = 'background';

	// --- Signal effects replacing EventEmitter subscriptions ---

	/** Effect 1: React to stories being loaded from the service */
	private readonly storiesEffect = effect(() => {
		const stories = this.storyService.stories();
		if (!stories.length) return;
		untracked(() => {
			this.storiesLoaded.set(true);
			this.storiesError.set(false);
			this.showEditor.set(false);
			this.setStories(stories);
			this.db.set(localStorage.getItem('source') === 'db');
		});
	});

	/** Effect 2: React to a story being deleted */
	private readonly deleteStoryEffect = effect(() => {
		const count = this.storyService.deleteStoryTrigger();
		if (count === 0) return;
		untracked(() => {
			this.showEditor.set(false);
			this.storyDeleted();
		});
	});

	/** Effect 3: React to a stories request error (unauthorized) */
	private readonly storiesErrorEffect = effect(() => {
		const count = this.apiService.storiesErrorTrigger();
		if (count === 0) return;
		untracked(() => {
			this.storiesError.set(true);
			this.showEditor.set(false);
			window.localStorage.removeItem('login');
			// Drops the cached project list; otherwise the next user in this SPA session sees the previous user's repositories
			this.projectService.clearRepositories();
			this.router.navigate(['/login']);
		});
	});

	/** Effect 5: React to run/save option selection — queued per request, so a re-created editor does not replay it */
	private readonly runSaveOptionEffect = onActionTrigger(
		this.apiService.runSaveOptionTrigger,
		option => {
			const story = this.selectedStory();
			if (!story) return;
			if (option === 'run') {
				this.runUnsaved = true;
				this.runOption();
			}
			if (option === 'saveRun') {
				this.saveBackgroundAndRun = true;
				this.updateBackground();
			}
		}
	);

	/** Effect 6: React to story rename */
	private readonly renameStoryEffect = onActionTrigger(this.storyService.renameStoryTrigger, changedValues => {
		this.renameStory(
			changedValues.newStoryTitle,
			changedValues.newStoryDescription
		);
	});

	/** Effect 7: React to backend URL becoming available */
	private readonly backendUrlEffect = effect(() => {
		const count = this.apiService.backendUrlReadyTrigger();
		if (count === 0) return;
		untracked(() => {
			this.loadStepTypes();
		});
	});

	/** Effect 8: React to background rename */
	private readonly renameBackgroundEffect = onActionTrigger(this.backgroundService.renameBackgroundTrigger, newName => {
		this.renameBackground(newName);
	});

	/** Effect 9: React to blocks update event — re-fetch blocks from API */
	private readonly updateBlocksEffect = effect(() => {
		const count = this.blockService.updateBlocksTrigger();
		if (count === 0) return;
		untracked(() => this.reloadBlocks());
	});

	/** Fetches blocks from the backend and updates the local signal */
	private async reloadBlocks(): Promise<Block[]> {
		const id = localStorage.getItem('id')!;
		const resp = await firstValueFrom(this.blockService.getBlocks(id));
		this.blocks.set(resp);
		return resp;
	}

	/** Effect 10: React to block reference removal check */
	private readonly checkRefOnRemoveEffect = onActionTrigger(this.blockService.checkRefOnRemoveTrigger, blockReferenceId => {
		this.handleCheckRefOnRemove(blockReferenceId);
	});

	/** Reloads blocks and checks references for the removed block */
	private async handleCheckRefOnRemove(blockReferenceId: string) {
		const blocks = await this.reloadBlocks();
		if (blocks) {
			const referenceBlock = blocks.find(block => block._id == blockReferenceId);
			this.blockService.checkBlockOnReference(blocks, this.stories(), referenceBlock!);
		}
	}

	/** Effect 11: React to entire reference block deletion — unpack steps in all relevant stories */
	private readonly deleteReferenceEffect = onActionTrigger(this.blockService.deleteReferenceTrigger, block => {
		this.blockService.deleteBlockReference(block, this.stories());
	});

	/** Effect 12: React to block unpacking */
	private readonly unpackBlockEffect = onActionTrigger(this.blockService.unpackBlockTrigger, obj => {
		this.handleUnpackBlock(obj);
	});

	/** Unpacks block from scenario and checks remaining references */
	private async handleUnpackBlock(obj: { block: Block; stepReference: StepType }) {
		const scenario = this.selectedScenario();
		if (!scenario) return;
		this.blockService.unpackScenarioWithBlock(
			obj.block,
			scenario,
			obj.stepReference
		);
		const blocks = await this.reloadBlocks();
		this.blockService.checkBlockOnReference(blocks, this.stories(), obj.block);
		// Update scenario through signal instead of in-place mutation
		// to trigger OnPush change detection after modifying a signal-held object
		this.selectedScenario.set({ ...scenario, saved: false });
	}

	/** Effect 13: React to reference block name update */
	private readonly updateNameRefEffect = onActionTrigger(this.blockService.updateNameRefTrigger, block => {
		this.blockService.updateNameReference(block, this.stories());
	});

	/** Effect 14: React to background changes being applied (centrally or to current) */
	private readonly applyChangesBackgroundEffect = onActionTrigger(this.backgroundService.applyChangesBackgroundTrigger, option => {
		// Selection is read inside the handler, which runs untracked: a selection change never re-applies a past option
		const story = this.selectedStory();
		if (!story) return;
		if (option == 'toCurrentBackground') {
			this.notify.info(
				'Please enter a new Background name to save your changes'
			);
			this.changeBackgroundTitle();
		} else if (option == 'centrally')
			this.applyChangesToBackgrounds(story.background);
	});

	/** Effect 15: React to steps being converted to a block reference */
	private readonly convertToReferenceEffect = onActionTrigger(this.blockService.convertToReferenceTrigger, block => {
		// Selection is read inside the handler, which runs untracked: a selection change never converts steps again
		const story = this.selectedStory();
		if (!story) return;
		const scenario = this.selectedScenario();
		if (scenario)
			this.blockService.convertSelectedStepsToRef(
				block,
				scenario
			);
	});

	/** Effect 16: React to new selected scenario input
	 * Handles scenario selection when the input changes.
	 * Also handles auto-selection after story switch — if newSelectedScenario
	 * is null/undefined (cleared by setSelectedStory in parent), auto-select
	 * the first scenario from the currently selected story.
	 */
	private readonly newSelectedScenarioEffect = effect(() => {
		const scenario = this.newSelectedScenario();
		// Don't return early — when scenario is null/undefined after a story
		// switch, we auto-select the first scenario of the new story below.
		if (scenario) {
			if (this.isReviewingAi())
				this.exitAiReviewMode();

			this.selectScenario(scenario);
		} else
			// CASE: newSelectedScenario is null/undefined after story switch.
			// Auto-select the first scenario of the new story.
			// Untracked: reading selectedStory() here would re-run this effect on every story
			// update (add/delete scenario) and overwrite the new selection with scenarios[0].
			untracked(() => {
				const story = this.selectedStory();
				if (story && story.scenarios && story.scenarios.length > 0)
					this.selectScenario(story.scenarios[0]);
				else if (story)
					this.selectScenario(null);
			});
	});

	/** Effect 17: React to new stories input */
	private readonly newStoriesEffect = effect(() => {
		const stories = this.newStories();
		if (!stories) return;
		this.stories.set(stories);
	});

	/** Effect 18: React to new selected story input
	 * When parent changes newSelectedStory, this effect syncs to local selectedStory signal
	 * and auto-selects the first scenario of the new story.
	 * Only the input is tracked: if the selection signals were read here, every later
	 * selectedStory.set() (e.g. an edit) would re-run this effect and revert the story to the input.
	 */
	private readonly newSelectedStoryEffect = effect(() => {
		const story = this.newSelectedStory();
		if (!story) return;
		untracked(() => {
			this.selectedStory.set(story);
			this.initializeIsExampleForStory(story);
			this.isReviewingAi.set(false);

			if (story.aiSuggestion)
				this.aiSuggestions.set(story._id!, story.aiSuggestion as { scenarios: Scenario[] });
			else
				this.aiSuggestions.delete(story._id!);

			if (story.preConditions)
				this.preConditionResults = this.xrayService.getPreconditionStories(
					story.preConditions
				);

			if (story.scenarios && story.scenarios.length > 0) {
				// CASE 1: Deep link (/story/<id>/<scenarioId>) — parent passes the requested scenario too.
				// Effect 16 already selected it in this same CD pass; scenarios[0] here would overwrite it.
				// CASE 2: No requested scenario, or it is not part of this story — first scenario.
				const requested = this.newSelectedScenario();
				const match = requested ? story.scenarios.find(s => s.scenario_id === requested.scenario_id) : undefined;
				this.selectScenario(match ?? story.scenarios[0]);
			} else
				// Editor hiding is happening in selectScenario
				this.selectScenario(null);
		});
	});

	/** Effect 19: React to test running for group input */
	private readonly testRunningForGroupEffect = effect(() => {
		const groupRunning = this.testRunningForGroup();
		if (groupRunning === undefined) return;
		untracked(() => {
			this.testRunningGroup = groupRunning;
			this.showResults.set(false);
		});
	});

	readonly isDark = input.required<boolean>();

	/**
   * View child of the scenario editor
   */
	readonly scenarioChild = viewChild<ScenarioEditorComponent>('scenarioChild');
	/**
   * View child of the modals component
   */
	readonly renameStoryModal = viewChild.required<RenameStoryComponent>('renameStoryModal');
	readonly createNewStoryModal = viewChild.required<CreateNewStoryComponent>('createNewStory');
	readonly createScenarioModal = viewChild.required<CreateScenarioComponent>('createNewScenario');
	readonly renameBackgroundModal = viewChild.required<RenameBackgroundComponent>('renameBackgroundModal');
	readonly workgroupEditModal = viewChild.required<WorkgroupEditComponent>('workgroupEditModal');
	readonly executionListModal = viewChild.required<ExecutionListComponent>('executionListModal');

	readonly deleteStoryEvent = output<Story>();

	readonly storyChosen = output<Story>();

	// Event emitter to lock stories bar during review mode
	readonly reviewModeChanged = output<boolean>();

	/**
   * Event emitter to show or hide global TestResult
   */
	readonly report = output<boolean>();

	/**
   * Stories bar component
   */
	constructor() {
		// Backend info already initialized by APP_INITIALIZER — load step types if url is ready
		if (this.apiService.urlReceived) 
			this.loadStepTypes();
    
		const storedStory = this.selectedStory();
		if (storedStory) {
			this.storiesLoaded.set(true);
			this.storiesError.set(false);
		}
		this.gecko_enabled = localStorage.getItem('gecko_enabled');
		this.chromium_enabled = localStorage.getItem('chromium_enabled');
		this.edge_enabled = localStorage.getItem('edge_enabled');
		this.webkit_enabled = localStorage.getItem('webkit_enabled');

		// Load emulator device lists from localStorage (populated by /backendInfo endpoint)
		// Guard against null (key not set) and "" (empty list) — both should result in []
		const parseEmulatorList = (key: string): string[] => {
			const val = localStorage.getItem(key);
			return (!val || val === '') ? [] : val.split(',');
		};
		this.gecko_emulators = parseEmulatorList('gecko_emulators');
		this.chromium_emulators = parseEmulatorList('chromium_emulators');
		this.edge_emulators = parseEmulatorList('edge_emulators');
		this.playwright_emulators = parseEmulatorList('playwright_emulators');
		this.setUserData();
		this.checkGlobalSettings();
	}

	handleSizeChange(event: { width: number; height: number }) {
		const story = this.selectedStory();
		if (!story) return;
		const scenario = this.selectedScenario();
		// Update scenario through signal instead of in-place mutation
		// to trigger OnPush change detection after modifying width/height/saved
		if (scenario) {
			const newScenario: Scenario = {
				...scenario,
				width: event.width,
				height: event.height,
				...(this.width !== event.width || this.height !== event.height
					? { saved: false }
					: {})
			};
			this.selectedScenario.set(newScenario);
		}
	}

	ngAfterViewChecked() {
		// WHY: Left as ngAfterViewChecked (not moved to computed/effect) because it performs
		// imperative side effects — scrolling the loading screen into view and resetting
		// openBlockModal — that cannot be expressed declaratively. The heavy reconciliation
		// (backgrounds/blockAsBackground arrays) is guarded by a triple condition
		// (storedStory + stories.length + blocks.length) so it only runs once after first
		// load. Converting to a computed would require wrapping these DOM ops in effects
		// and risking reentrancy — not worth the complexity for a ~1x-per-load path.
		// NOTE: No in-place mutations of signal-held objects here; background is initialized
		// via the signal.update() below and storeCurrentBackground reads
		// (does not mutate) the background reference.
		this.openBlockModal = undefined;
		const storedStory = this.selectedStory();
		/**
      * when loading for group is displayed scroll to it
      */
		if (this.testRunningGroup === true) {
			const loadingScreen = document.getElementById('loading');
			loadingScreen!.scrollIntoView();
		}
		if (storedStory && this.stories().length && this.blocks().length) {
			// CASE: Story has no background — replace via signal update so consumers are notified
			if (!storedStory.background) 
				this.selectedStory.update((s) =>
					s ? { ...s, background: { name: '', stepDefinitions: { when: [] }, saved: true } } : s
				);
			else 
				this.storeCurrentBackground(storedStory.background);
			
			this.storeCurrentBackground(this.selectedStory()!.background);
			this.backgrounds = this.stories()
				.filter((s) => s !== null)
				.map((s) => s.background);
			this.blockAsBackground = [];
			const backgroundBlocks = this.blocks().filter((b) => b.isBackground);
			for (const b of backgroundBlocks) {
				const newBlock = {
					name: b.name,
					stepDefinitions: { ...b.stepDefinitions }
				};
				this.blockAsBackground.push(newBlock);
			}
			this.backgrounds = this.backgrounds.concat(this.blockAsBackground);
		}
	}
	/**
   * Initializes HTTP subscribes (EventEmitter subscribes replaced by class-level effects)
   */
	ngOnInit() {
		this.projectService.checkAiAvailability().subscribe({
			next: (available) => {
				this.isAiAvailable.set(available);
			},
			// AI is optional: a failed availability check must stay silent and only mean "unavailable"
			error: () => this.isAiAvailable.set(false)
		});

		// in event that stories are already loaded
		if (this.stories().length > 0)
			this.storiesLoaded.set(true);

		// get blocks
		const id = localStorage.getItem('id');
		if (!id) return;
		this.blockService.getBlocks(id).subscribe({
			next: (resp) => {
				this.blocks.set(resp);
			},
			error: () => this.notify.error('Could not load blocks.')
		});
	}

	/**
    * Runs the test without saving it
    */
	runOption() {
		const story = this.selectedStory();
		if (!story) return;
		const tmpBackgroundSaved = story.background.saved;
		// Update background through signal instead of in-place mutation
		// to trigger OnPush change detection after modifying nested signal-held object
		this.selectedStory.update((s) =>
			s ? { ...s, background: { ...s.background, saved: true } } : s
		);
		this.runTests(this.currentTestScenarioId);
		// Restore background.saved through signal update (not in-place)
		this.selectedStory.update((s) =>
			s ? { ...s, background: { ...s.background, saved: tmpBackgroundSaved } } : s
		);
	}

	/**
   * sets the stories
   * @param stories
   */
	setStories(stories: Story[]) {
		this.stories.set(stories);
	}

	/**
   * Select a new currently used scenario
   * @param scenario The scenario to select.
   */
	selectNewScenario(scenario: Scenario) {
		// Use signal.set() for zoneless ChangeDetection reactivity
		this.selectedScenario.set(scenario);
	}

	/**
    * Opens the create new story modal from the empty-state CTA.
    */
	openCreateNewStoryModal() {
		this.createNewStoryModal().openCreateNewStoryModal(this.stories());
	}

	/**
    * Navigates to the previous scenario in the currently active list (original or AI).
    */
	navigateScenarioLeft() {
		const story = this.selectedStory();
		if (!story) return;
		const scenario = this.selectedScenario();
		if (!scenario) return;
		const currentList = this.isReviewingAi()
			? this.aiSuggestions.get(story._id!)?.scenarios
			: story.scenarios;
		if (!currentList) return;

		const currentIndex = currentList.findIndex(
			(s: Scenario) => s.scenario_id === scenario.scenario_id
		);
		if (currentIndex > 0)
			this.selectNewScenario(currentList[currentIndex - 1]);
    
	}

	/**
    * Navigates to the next scenario in the currently active list (original or AI).
    */
	navigateScenarioRight() {
		const story = this.selectedStory();
		if (!story) return;
		const scenario = this.selectedScenario();
		if (!scenario) return;
		const currentList = this.isReviewingAi()
			? this.aiSuggestions.get(story._id!)?.scenarios
			: story.scenarios;
		if (!currentList) return;

		const currentIndex = currentList.findIndex(
			(s: Scenario) => s.scenario_id === scenario.scenario_id
		);
		if (currentIndex < currentList.length - 1)
			this.selectNewScenario(currentList[currentIndex + 1]);
    
	}

	/**
   * Change the active view of a story
   */
	changeActiveView(viewName: string) {
		this.storyService.changeStoryViewEvent(viewName);
	}

	/**
   * load the step types
   */
	loadStepTypes() {
		this.storyService.getStepTypes().subscribe({
			next: (resp: StepType[]) => {
				this.originalStepTypes.set(resp);
			},
			error: () => this.notify.error('Could not load step types.')
		});
	}

	setOneDriver() {
		const story = this.selectedStory();
		if (!story) return;
		this.storyService
			.changeOneDriver(story.oneDriver!, story._id!)
			.subscribe({
				next: (resp) => {
					this.selectedStory.set(resp as Story);
				},
				error: () => this.notify.error('Could not change OneDriver setting.')
			});
	}

	/**
   * Opens the delete scenario toast
   * @param scenario
   */
	showDeleteScenarioToast($event: Scenario) {
		if ($event.testKey) {
			// XrayToast — scenario with xRay test key gets 3-button dialog
			const ref = this.dialog.open(ConfirmDialogComponent, {
				data: {
					title: 'Delete Scenario?',
					message: 'Are you sure you want to delete this scenario? It cannot be restored.',
					buttons: [
						{ label: 'Delete', value: 'delete', color: 'warn' },
						{ label: 'Delete with xRay', value: 'delete-xray', color: 'warn' },
						{ label: 'Cancel', value: 'cancel' }
					]
				} as ConfirmDialogData
			});
			ref.afterClosed().subscribe(result => {
				if (result === 'delete') this.deleteSelectedScenario(false);
				else if (result === 'delete-xray') this.deleteSelectedScenario(true);
			});
		} else {
			// DeleteToast — standard 2-button delete confirmation
			const ref = this.dialog.open(ConfirmDialogComponent, {
				data: {
					title: 'Delete Scenario?',
					message: 'Are you sure you want to delete this scenario? It cannot be restored.',
					buttons: [
						{ label: 'Delete', value: 'delete', color: 'warn' },
						{ label: 'Cancel', value: 'cancel' }
					]
				} as ConfirmDialogData
			});
			ref.afterClosed().subscribe(result => {
				if (result === 'delete') this.deleteSelectedScenario(false);
			});
		}
	}

	/**
   * Deletes the currently selected scenario after the user confirmed the dialog.
   * Called directly, not through a signal: an effect that tracked the selection cascaded,
   * because scenarioDeleted() changes the selection and the effect then deleted the next scenario.
   * @param xrayEnabled also delete the linked xRay test
   */
	private deleteSelectedScenario(xrayEnabled: boolean) {
		const scenario = this.selectedScenario();
		if (scenario) this.deleteScenario(scenario, xrayEnabled);
	}

	/**
   * Deletes scenario
   * @param scenario
   */
	deleteScenario(scenario: Scenario, xrayEnabled: boolean) {
		const story = this.selectedStory();
		if (!story) return;
		this.scenarioService
			.deleteScenario(story._id!, scenario, xrayEnabled)
			// Pass the id captured at click time: the selection may have moved while the request was in flight
			.subscribe((_) => {
				this.scenarioDeleted(scenario.scenario_id);
				this.notify.success('', 'Scenario deleted');
			}, () => {
				// Without this, a failed delete was silent and the scenario stayed listed
				this.notify.error('', 'Scenario could not be deleted');
			});
	}

	/**
    * Removes the deleted scenario from the selected story and selects a remaining one
    * @param deletedScenarioId id of the scenario the backend deleted
    */
	scenarioDeleted(deletedScenarioId: number) {
		const story = this.selectedStory();
		if (!story) return;
		// Filter out the deleted id, not the current selection; the pre-update list still contains it,
		// so the selection is taken from the updated list
		const remaining = story.scenarios.filter((s: Scenario) => s.scenario_id !== deletedScenarioId);
		// Create new scenarios array instead of mutating signal-held object
		// to trigger OnPush change detection
		this.selectedStory.update((s) =>
			s ? { ...s, scenarios: remaining } : s
		);

		if (remaining.length > 0)
			this.selectScenario(remaining[remaining.length - 1]);
		else {
			// Clear the selection too: otherwise the deleted scenario stays selected and Run/Save act on it
			this.selectScenario(null);
			this.showEditor.set(false);
		}
	}

	/**
    * Adds a scenario to story
    */
	addScenario(event: string) {
		const scenarioName = event;
		const story = this.selectedStory();
		if (!story) return;
		this.scenarioService
			.addScenario(story._id!, scenarioName)
			.subscribe({
				next: (resp: Scenario) => {
					this.selectScenario(resp);
					// Update scenarios through signal instead of in-place push
					// to trigger OnPush change detection
					this.selectedStory.update((s) =>
						s ? { ...s, scenarios: [...s.scenarios, resp] } : s
					);
					this.notify.info('', 'Scenario added');
				},
				error: () => this.notify.error('Could not add scenario.')
			});
	}
	/**
    * updates the background
    */
	updateBackground() {
		const story = this.selectedStory();
		if (!story) return;
		Object.keys(story.background.stepDefinitions).forEach(
			(key, _) => {
				(story.background.stepDefinitions as unknown as Record<string, StepType[]>)[key].forEach(
					(step: StepType) => {
						delete step.checked;
						if (step.outdated) 
							step.outdated = false;
            
					}
				);
			}
		);
		const usingBackground = this.checkStoriesForBack();
		if (
			usingBackground.length > 1 &&
      this.backgroundService.backgroundReplaced == undefined &&
      (story.background.saved == undefined ||
        !story.background.saved)
		) 
			this.backgroundChecks();
		else {
			this.changeBackgroundBlock();
			// Update background through signal instead of delete-in-place
			this.selectedStory.update((s) =>
				s ? { ...s, background: { ...s.background, saved: undefined } } : s
			);
			this.backgroundService
				.updateBackground(story._id!, story.background)
				.subscribe({
					next: (_) => {
						this.backgroundService.backgroundChangedEmitter();
						this.notify.success('successfully saved', 'Background');
						if (this.saveBackgroundAndRun) {
							this.apiService.runSaveOption('saveScenario');
							this.saveBackgroundAndRun = false;
						}
					},
					error: () => this.notify.error('Could not save background.')
				});
		}
	}
	/**
    * Check: if the same background is used in different stories
    */
	checkStoriesForBack() {
		const story = this.selectedStory();
		if (!story) return [];
		const usingBackground = this.stories().filter(
			(s) =>
				s !== null &&
        s.background.name == story.background.name &&
        s.background.name !== 'New Background' &&
        s.background.stepDefinitions.when.length !== 0
		);
		return usingBackground;
	}

	/**
    * Change Block if background
    */
	changeBackgroundBlock() {
		const story = this.selectedStory();
		if (!story) return;
		// Collect blocks that need updating (avoid mutating signal-held objects in forEach)
		const blocksToUpdate = this.blocks().filter(
			(block) =>
				block.isBackground &&
        this.backgroundService.backgroundReplaced == undefined &&
        block.name == story.background.name &&
        block.stepDefinitions != story.background.stepDefinitions
		);
		for (const block of blocksToUpdate) {
			// Create new block object with updated stepDefinitions (new reference for OnPush)
			const updatedBlock = { ...block, stepDefinitions: { ...block.stepDefinitions, when: story.background.stepDefinitions.when } };
			this.blockService
				.updateBlock(updatedBlock)
				.subscribe({
					next: (_) => this.blockService.updateBlocksEmitter(),
					error: () => this.notify.error('Could not save block.')
				});
		}
	}
	/**
   * Toastr: background changes in multiple Stories or in current background
   */
	backgroundChecks() {
		const ref = this.dialog.open(ConfirmDialogComponent, {
			data: {
				title: '',
				message: 'You are about to save a Background used in multiple Stories. How should the changes apply?',
				buttons: [
					{ label: 'Save Changes for All Stories', value: 'centrally', color: 'primary' },
					{ label: 'Save as New Background', value: 'toCurrentBackground' }
				]
			} as ConfirmDialogData
		});
		ref.afterClosed().subscribe(result => {
			if (result === 'centrally') this.backgroundService.applyBackgroundChanges('centrally');
			else if (result === 'toCurrentBackground') this.backgroundService.applyBackgroundChanges('toCurrentBackground');
		});
	}
	/**
   * Applying changes for all relevant backgrounds in repository
   */
	applyChangesToBackgrounds(background: Background) {
		const story = this.selectedStory();
		if (!story) return;
		// Update background.saved through signal instead of delete-in-place
		this.selectedStory.update((s) =>
			s ? { ...s, background: { ...s.background, saved: undefined } } : s
		);
		const storyId: (string | undefined)[] = [];
		// Create new story objects with new background references instead of mutating
		// signal-held stories in-place — OnPush needs new references to detect changes
		const updatedStories = this.stories().map((s) => {
			if (s.background.name === background.name) {
				storyId.push(s._id);
				return {
					...s,
					background: { ...s.background, stepDefinitions: background.stepDefinitions }
				};
			}
			return s;
		});
		this.stories.set(updatedStories);
		this.changeBackgroundBlock();
		storyId.forEach((_id) => {
			// Stories in this.stories() are persisted and always carry an _id
			if (!_id) return;
			this.backgroundService
				.updateBackground(_id, story.background)
				.subscribe({
					next: (_) => {
						this.backgroundService.backgroundChangedEmitter();
						if (this.saveBackgroundAndRun) {
							this.apiService.runSaveOption('saveScenario');
							this.saveBackgroundAndRun = false;
						}
					},
					error: () => this.notify.error('Could not save background.')
				});
		});
		this.notify.success('successfully saved', 'Backgrounds');
	}

	/**
    * deletes the background
    */
	deleteBackground() {
		const story = this.selectedStory();
		if (!story) return;
		const oldName = story.background.name;
		this.backgroundService
			.deleteBackground(story._id!)
			.subscribe({
				next: (_) => {
					this.showBackground.set(false);
					const blockBackgrounds = this.blocks().filter((b) => b.isBackground);
					if (blockBackgrounds)
						for (const block of this.blocks())
							if (block.name == oldName) 
								this.blockService.checkBackgroundsOnDelete(block, this.stories());
         
					// Replace the background via signal update to notify consumers of the new reference
					this.selectedStory.update((s) =>
						s ? { ...s, background: { name: '', stepDefinitions: { when: [] }, saved: true } } : s
					);
				},
				error: () => this.notify.error('Could not delete background.')
			});
	}

	/**
   * Select a scenario
   * @param scenario
   */

	selectScenario(scenario: Scenario | null) {
		// Use signal.set() so zoneless ChangeDetection picks up the change (OnPush)
		this.selectedScenario.set(scenario);
		this.showResults.set(false);
		if (scenario) {
			this.showEditor.set(true);
      
			this.emulator_enabled =
				scenario.emulator ?? this.repoSettings?.emulator ?? false;
      
			if (this.emulator_enabled) 
				scenario.emulator =
					scenario.emulator ?? this.repoSettings?.emulator ?? 'No emulator';
      
			scenario.stepWaitTime =
				scenario.stepWaitTime ?? this.repoSettings?.stepWaitTime ?? 0;
			scenario.browser =
				scenario.browser ?? this.repoSettings?.browser ?? 'chromium';
			scenario.width =
				scenario.width ?? this.repoSettings?.width ?? 1920;
			scenario.height =
				scenario.height ?? this.repoSettings?.height ?? 1080;
     
		} else {
			// This is the path for when scenario is null
			this.showEditor.set(false);
       
			// Default to repo settings if no scenario is selected
			this.emulator_enabled = this.repoSettings?.emulator ?? false;
		}
	}

	/**
    * Sort the backgrounds of stories in a list
    * @returns
    */
	sortedBackgrounds() {
		const story = this.selectedStory();
		if (!story) return undefined;
		if (this.backgrounds !== undefined) {
			this.filteredBackgrounds = [];
			this.filteredBackgrounds = this.backgrounds
				.filter(
					(s) =>
						s.name !== story?.background.name &&
            s.name !== 'New Background' &&
            s.stepDefinitions.when.length !== 0
				)
				.map((s) => s);
			const uniqueChars: Background[] = [];
			this.filteredBackgrounds.forEach((e) => {
				if (!uniqueChars.some((x) => x.name === e.name))
					uniqueChars.push(e);
        
			});
			if (
				uniqueChars.length == 0 ||
        (uniqueChars.length == 1 &&
          uniqueChars[0] == this.backgroundService.currentBackground)
			) 
				return undefined;
			else return uniqueChars;
		}
	}
	/**
   * Retrieve current background
   */
	storeCurrentBackground(originalBackground: Background) {
		this.backgroundService.currentBackground = JSON.parse(
			JSON.stringify(originalBackground)
		);
	}
	/**
    * Select another background to replace
    */
	replaceBackground(background: Background) {
		const story = this.selectedStory();
		if (!story) return;
		// Update story background through signal instead of in-place mutations
		this.selectedStory.update((s) =>
			s ? {
				...s,
				background: {
					...s.background,
					stepDefinitions: { ...s.background.stepDefinitions, when: JSON.parse(JSON.stringify(background.stepDefinitions.when)) },
					name: background.name
				}
			} : s
		);
		this.backgroundService.backgroundReplaced = true;
		const currentStepsLength =
			this.backgroundService.currentBackground.stepDefinitions.when.length;
		const found = this.backgrounds.some(
			(background) =>
				background.name === this.backgroundService.currentBackground.name
		);
		if (!found && currentStepsLength > 0) {
			this.checkBackgroundLost();
			this.openBlockModal = true;
		}
		this.updateBackground();
	}

	readonly saveBlockModal = viewChild.required<SaveBlockFormComponent>('saveBlockModal');
	checkAllSteps(_checkValue?: boolean) {
		//needed by saveBlockModal
	}

	checkBackgroundLost() {
		const unsavedBackground = this.backgroundService.currentBackground;
		if (this.backgrounds.filter((b) => b === unsavedBackground).length < 2) {
			const stepDefs: StepDefinition = {
				given: [],
				then: [],
				when: unsavedBackground.stepDefinitions.when
			};
			const block: Block = {
				name: unsavedBackground.name,
				stepDefinitions: stepDefs
			};
			this.saveBlockModal().openSaveBlockFormModal(
				block,
				this,
				true,
				this.backgroundService.currentBackground.name
			);
		}
		this.backgroundService.backgroundReplaced = true;
	}

	/**
   * Make the API Request to run the tests and display the results as a chart
   * @param scenario_id
   * @param selectedExecutions - optional parameter to update xray status
   */
	async runTests(scenario_id: number | null, selectedExecutions?: number[]) {
		const story = this.selectedStory();
		if (!story) return;
		if (this.storySaved()) {
			// if story is saved
			// Reset state for new test run
			this.reportIsSaved.set(false);
			this.testRunning.set(true);
			this.showResults.set(false); // Hide previous report while new test runs
			this.report.emit(false);
			const loadingScreen: HTMLElement = document.getElementById('loading')!;

			loadingScreen.scrollIntoView();

			const params = this.testRunParams();

			// CASE 1: Run a single scenario by its ID
			if (scenario_id) 
				this.storyService
					.runTests(story._id!, scenario_id, params)
					.subscribe({
						next: (resp) => {
							this.testRunResponse(resp as TestRunResponse);

							// Determine test status for Xray synchronization
							const val = this.testReport.status;
							const testStatus = val ? 'PASS' : 'FAIL';

							// If user selected Xray test executions, update their status
							if (selectedExecutions) {
								const scenario = this.selectedScenario();
								if (scenario)
									this.xrayService.updateXrayStatus(
										scenario,
										selectedExecutions,
										testStatus
									);
							}
               
						},
						error: (err) => {
							console.error('Test execution failed:', err);
							this.testRunning.set(false);
							// Failed runs never reach testRunResponse, so the unsaved-run allowance must end here too
							this.runUnsaved = false;
							this.notify.error('', 'Test execution failed');
						}
					});
			else 
			// CASE 2: Story has pre-conditions — run as temporary group (pre-condition stories + this story)
				if (this.preConditionResults && this.preConditionResults.length > 0) 
					try {
						const temp_group = await this.createTempGroup();
						const params = {
							repositoryId: localStorage.getItem('id'),
							repository: localStorage.getItem('repository'),
							source: localStorage.getItem('source'),
							group: temp_group
						};
						this.groupService.runTempGroup(params).subscribe({
							next: (resp) => {
								this.testRunResponse(resp as TestRunResponse);
								// Pre-condition stories are in the same group report; only the tested story's status is sent
								// Emitted outside the Xray block: the stories bar filter needs the status even without Xray executions
								const storyStatus = this.testReport.storyStatuses?.find(status => String(status.storyId) === String(story._id));
								if (storyStatus) this.scenarioService.storyStatusChangeEmit(story._id!, storyStatus.status);
								// Update Xray status for each scenario in the tested story
								if (selectedExecutions) {
									const testStatus = this.testReport.status ? 'PASS' : 'FAIL';
									const testedStory =
										this.testReport.storiesTested[
											this.testReport.storiesTested.length - 1
										];
									testedStory.scenarios.forEach((scenario: Scenario) => {
										this.xrayService.updateXrayStatus(
											scenario,
											selectedExecutions,
											testStatus
										);
									});
								}
							},
							error: (err) => {
								console.error('Test execution failed:', err);
								this.testRunning.set(false);
								// Failed runs never reach testRunResponse, so the unsaved-run allowance must end here too
								this.runUnsaved = false;
								this.notify.error('', 'Test execution failed');
							}
						});
					} catch (error) {
						console.error('Error while creating temp group', error);
						this.testRunning.set(false);
						// Failed runs never reach testRunResponse, so the unsaved-run allowance must end here too
						this.runUnsaved = false;
					}
				else 
				// CASE 3: No pre-conditions — run all scenarios of the story directly
					this.storyService
						.runTests(story._id!, null!, params)
						.subscribe({
							next: (resp) => {
								this.testRunResponse(resp as TestRunResponse);
								const testStatus = this.testReport.status ? 'PASS' : 'FAIL';

								// The stories bar filters on the story status, which only story and group runs change, so it is sent here
								this.scenarioService.storyStatusChangeEmit(story._id!, this.testReport.status);

								// Emit status change for each scenario and update Xray if applicable
								this.testReport.scenarioStatuses.forEach((scenario) => {
									this.scenarioService.scenarioStatusChangeEmit(
										story._id!,
										scenario.scenarioId,
										scenario.status
									);

									// Find the matching scenario object for Xray update
									const currentScenarioId = scenario.scenarioId;
									const currentScenario = story.scenarios.find(
										(scenario) => scenario.scenario_id === currentScenarioId
									);
									if (selectedExecutions)
										this.xrayService.updateXrayStatus(
											currentScenario!,
											selectedExecutions,
											testStatus
										);
                   
								});
							},
							error: (err) => {
								console.error('Test execution failed:', err);
								this.testRunning.set(false);
								// Failed runs never reach testRunResponse, so the unsaved-run allowance must end here too
								this.runUnsaved = false;
								this.notify.error('', 'Test execution failed');
							}
						});
        
      
		} else {
			// if story is not saved, inform user
			this.currentTestScenarioId = scenario_id!;
			this.currentTestStoryId = story.story_id;
			const ref = this.dialog.open(ConfirmDialogComponent, {
				data: {
					title: 'Scenario was not saved',
					message: 'Do you want to save before running the test?',
					buttons: [
						{ label: 'Save and Run', value: 'saveRun', color: 'primary' },
						{ label: 'Run Test', value: 'run' }
					]
				} as ConfirmDialogData
			});
			ref.afterClosed().subscribe(result => {
				if (result === 'saveRun') this.apiService.runSaveOption('saveRun');
				else if (result === 'run') this.apiService.runSaveOption('run');
			});
		}
	}

	/*
   * Creates temporary group for preconditions storys + current selected story
   */
	async createTempGroup() {
		const story = this.selectedStory();
		if (!story) throw new Error('No story selected');
		const seenStories = new Set<string | number>();

		// add current story to seen stories
		seenStories.add(story.issue_number!);

		// collect all pre-stories
		const member_stories = await this.collectPreStories(
			story,
			seenStories,
			[]
		);

		member_stories.push(story);

		const temp_group = {
			_id: -1,
			name: story.title,
			member_stories: member_stories,
			isSequential: true
		};

		return temp_group;
	}

	/*
   * Collects all pre-stories for a given story recursively
   */
	async collectPreStories(story: Story, seenStories: Set<string | number>, member_stories: Story[]) {
		// do pre-conditions exist?
		if (story.preConditions && story.preConditions.length > 0) 
			for (const precondition of story.preConditions) 
			// do tests within pre-conditions exist?
				if (precondition.testSet && precondition.testSet.length > 0) 
				// run for each inner story of pre-condition
					for (const innerStoryKey of precondition.testSet) {
						const newSeenStories = new Set(seenStories);

						if (!newSeenStories.has(innerStoryKey)) {
							newSeenStories.add(innerStoryKey);

							try {
								// fetch whole story object
								const innerStory = await firstValueFrom(
									this.storyService.getStoryByIssueKey(innerStoryKey)
								);
								member_stories.unshift(innerStory);

								// run recursively for inner story if pre-conditions exist
								if (
									innerStory.preConditions &&
                  innerStory.preConditions.length > 0
								) 
									await this.collectPreStories(
										innerStory,
										newSeenStories,
										member_stories
									);
                
							} catch (error) {
								console.error('Error fetching story details:', error);
							}
						}
					}
      
    
		return member_stories;
	}

	/*
    * Prepare parameters for test run
    */
	testRunParams() {
		let browserSelectValue = null;
		let emulatorSelectValue = null;

		if (!this.globalSettingsActivated()) {
			const browserSelect = document.getElementById(
				'browserSelect'
			) as HTMLSelectElement;
			const emulatorSelect = document.getElementById(
				'emulatorSelect'
			) as HTMLSelectElement;
			browserSelectValue = browserSelect ? browserSelect.value : null;
			emulatorSelectValue = emulatorSelect ? emulatorSelect.value : null;
		}
		const story = this.selectedStory();
		const scenario = this.selectedScenario();
		return {
			browser: browserSelectValue,
			emulator: emulatorSelectValue,
			width: scenario?.width,
			height: scenario?.height,
			stepWaitTime: scenario?.stepWaitTime,
			// Coerce localStorage's `null` to `undefined` to match TestExecutionParams' optional string fields
			repository: localStorage.getItem('repository') ?? undefined,
			repositoryId: localStorage.getItem('id') ?? undefined,
			source: localStorage.getItem('source') ?? undefined,
			oneDriver: story?.oneDriver,
			testRunner: this.testRunner()
		};
	}

	/*
   * Response from test run
   */
	testRunResponse(resp: TestRunResponse) {
		const iframe: HTMLIFrameElement = document.getElementById(
			'testFrame'
		) as HTMLIFrameElement;
		iframe.srcdoc = resp.htmlFile;
		this.reportId.set(resp.reportId);
		this.htmlReport = resp.htmlFile;
		this.testReport = resp.report;
		this.testDone.set(true);
		this.showResults.set(true);
		this.testRunning.set(false);
		setTimeout(() => iframe.scrollIntoView(), 10);
		this.notify.info('', 'Test is done');
		this.runUnsaved = false;
	}

	/**
   * Evaluates whether to open xray execution list modal in run scenario.
   * @param scenario_id
   */
	evaluateAndRunScenario(scenario_id: number) {
		const scenario = this.selectedScenario();
		if (
			scenario &&
       scenario.testKey &&
       scenario.testRunSteps!.length > 0
		) 
		// Open the modal if there are test execution steps
			this.executionListModal().openExecutionListModal(scenario);
		else 
		// Run tests directly if there are no test execution steps
			this.runTests(scenario_id);
    
	}

	/**
   * Evaluates whether to open xray execution list modal in run story.
   */
	evaluateAndRunStory() {
		const story = this.selectedStory();
		if (!story) return;
		// Check if there is at least one scenario in the story with xray key and execution
		const executableTests = story.scenarios.some(
			(scenario) =>
				scenario.testKey &&
        scenario.testRunSteps &&
        scenario.testRunSteps.length > 0
		);
		if (executableTests) 
			this.executionListModal().openExecutionListModal(story);
		else 
			this.runTests(null);
    
	}

	/**
   * Run this function if we close execution list modal
   */
	executeTests(event: {
		scenarioId: number | null;
		selectedExecutions: number[];
	}) {
		if (event.scenarioId != null) 
			this.runTests(event.scenarioId, event.selectedExecutions);
		else 
			this.runTests(null, event.selectedExecutions);
    
	}

	/**
    * Download the test report
    */
	downloadFile() {
		const story = this.selectedStory();
		if (!story) return;
		const blob = new Blob([this.htmlReport], { type: 'text/html' });
		saveAs(blob, story.title + '.html');
	}

	/**
   * Set the time to wait between the steps
   * @param event
   * @param newTime
   */
	setStepWaitTime(newTime: number) {
		const scenario = this.selectedScenario();
		if (scenario) 
			// Update scenario through signal instead of in-place mutation
			// to trigger OnPush change detection after modifying a signal-held object
			this.selectedScenario.set({ ...scenario, stepWaitTime: newTime, saved: false });
		
	}

	/**
    * Set the browser
    * @param newBrowser
    */
	setBrowser(newBrowser: string) {
		const scenario = this.selectedScenario();
		if (!scenario) return;
		// Update scenario through signal instead of in-place mutation
		this.setEmulatorEnabled(false);
		this.selectedScenario.set({ ...scenario, browser: newBrowser, saved: false });
	}

	/**
   * Set the test runner
   * @param newTestRunnner
   */
	setTestRunner(newTestRunnner: string) {
		this.setEmulatorEnabled(false);
		this.testRunner.set(newTestRunnner);
	}

	/**
    *  Check for global settings
    */
	checkGlobalSettings() {
		const id = localStorage.getItem('id');
		if (!id) return;
		this.repoId = id;
		this.projectService.getRepositorySettings(this.repoId).subscribe({
			next: (settings) => {
				this.repoSettings = settings;
				if (settings && settings?.activated) {
					this.globalSettingsActivated.set(true);
					if (settings.testRunner)
						this.testRunner.set(settings.testRunner);

				} else
					this.globalSettingsActivated.set(false);
        
			},
			error: (err) => {
				console.error('Failed to load repository settings:', err);
				this.globalSettingsActivated.set(false);
			}
		});
	}

	/**
   * Opens Modal to edit the workgroup
   * @param project
   */
	workGroupEdit(project: RepositoryContainer) {
		this.workgroupEditModal().openWorkgroupEditModal(
			project,
			this.email,
			this.id
		);
	}

	/**
   * Fills user data to change global settings
   */
	setUserData() {
		this.managmentService.getUserData().subscribe({
			next: (user) => {
				this.id = user._id!;
				if (typeof user['email'] !== 'undefined') 
					this.email = user['email'];
      
			},
			error: () => this.notify.error('Could not load user data.')
		});
	}

	/**
   * Triggered if global settings are changed in workgroup-edit component
   */
	updateGlobalSettings(newSettings: boolean) {
		this.globalSettingsActivated.set(newSettings);
	}

	// ------------------------------- EMULATOR --------------------------------

	/**
   * Boolean emulator indicator
   */
	emulator_enabled: string | boolean = false;

	/**
   * List of supported emulators for gecko
   */
	gecko_emulators: string[];

	/**
   * List of supported emulators for chromium
   */
	chromium_emulators: string[];

	/**
   * List of supported emulators for edge
   */
	edge_emulators: string[];

	/**
   * List of supported emulators for playwright
   */
	playwright_emulators: string[];

	/**
   * Set if an emulator should be used
   * @param enabled Boolean
   */
	setEmulatorEnabled(enabled: boolean) {
		this.emulator_enabled = enabled;
		this.setEmulator(enabled ? this.getAvaiableEmulators()[0] : undefined);
		const scenario = this.selectedScenario();
		if (scenario) {
			// Update scenario through signal instead of in-place mutation
			const newScen: Scenario = { ...scenario, saved: false };
			if (enabled) {
				const av = this.getAvaiableEmulators();
				if (av.length > 0) newScen.emulator = av[0];
			} else 
				newScen.emulator = undefined;
			
			this.selectedScenario.set(newScen);
		}
	}

	/**
    * Set the emulator
    * @param newEmultaor
    */
	setEmulator(newEmulator: string | undefined) {
		const scenario = this.selectedScenario();
		if (!scenario) return;
		// Update scenario through signal instead of in-place mutation
		this.selectedScenario.set({ ...scenario, emulator: newEmulator, saved: false });
	}

	/**
   * Get the avaiable emulators
   */
	getAvaiableEmulators() {
		if (this.testRunner() === 'playwright')
			return this.playwright_emulators;
		

		const scenario = this.selectedScenario();
		if (!scenario) return [];

		// Bestehende Logik für Selenium
		switch (scenario.browser) {
			case 'chromium':
				return this.chromium_emulators;
			case 'firefox':
				return this.gecko_emulators;
			case 'MicrosoftEdge':
				return this.edge_emulators;
		}
		return [];
	}

	// ------------------------------- EMULATOR -----------------------------

	/**
   * Hide the test results
   */
	hideResults() {
		this.showResults.set(!this.showResults());
	}

	/**
   * If the story is saved
   * @returns
   */

	storySaved() {
		const story = this.selectedStory();
		// The selected scenario's saved flag is checked too: the backend runs the stored version, so
		// running unsaved scenario edits must go through the "Scenario was not saved" dialog first.
		// runUnsaved is the one-run exception the user chose in that dialog.
		return (
			this.runUnsaved ||
      ((this.scenarioChild()?.selectedScenario()?.saved === undefined ||
        this.scenarioChild()?.selectedScenario()?.saved) &&
        (story?.background.saved === undefined ||
          story?.background.saved))
		);
	}

	/**
   * Mark the report as not saved
   * @param reportId
   * @returns
   */

	unsaveReport(reportId: string) {
		this.reportIsSaved.set(false);
		return new Promise<void>((resolve, _reject) => {
			this.reportService.unsaveReport(reportId).subscribe({
				next: (_resp) => {
					resolve();
				},
				// Resolve after the toast: the promise must settle on failure too, or awaiting callers hang
				error: () => {
					this.notify.error('Could not update report.');
					resolve();
				}
			});
		});
	}

	/**
   * Mark the report as saved
   * @param reportId
   * @returns
   */

	saveReport(reportId: string) {
		this.reportIsSaved.set(true);
		return new Promise<void>((resolve, _reject) => {
			this.reportService.saveReport(reportId).subscribe({
				next: (_resp) => {
					resolve();
				},
				// Resolve after the toast: the promise must settle on failure too, or awaiting callers hang
				error: () => {
					this.notify.error('Could not update report.');
					resolve();
				}
			});
		});
	}

	/**
    * Opens the Modal to rename the story
    * @param newStoryTitle
    */
	changeStoryTitle() {
		const story = this.selectedStory();
		if (!story) return;
		this.renameStoryModal().openRenameStoryModal(
			this.stories(),
			story
		);
	}

	/**
    * Renames the story
    * @param newStoryTitle
    * @param newStoryDescription
    */
	renameStory(newStoryTitle: string, newStoryDescription: string) {
		const story = this.selectedStory();
		if (!story) return;
		if (newStoryTitle && newStoryTitle.replace(/\s/g, '').length > 0) 
			// Update story through signal instead of in-place mutation
			this.selectedStory.update((s) =>
				s ? { ...s, title: newStoryTitle, body: newStoryDescription } : s
			);
		else if (newStoryDescription && newStoryDescription.replace(/\s/g, '').length > 0) 
			// Update story through signal for body change
			this.selectedStory.update((s) =>
				s ? { ...s, body: newStoryDescription } : s
			);
		
		this.updateStory();
	}

	renameBackground(newBackgroundName: string) {
		const story = this.selectedStory();
		if (!story) return;
		// Update background through signal instead of in-place mutation
		this.selectedStory.update((s) =>
			s ? { ...s, background: { ...s.background, name: newBackgroundName } } : s
		);
	}

	/**
   * Updates the story
   *
   */
	updateStory() {
		const story = this.selectedStory();
		if (!story) return;
		this.storyService.updateStory(story).subscribe({
			next: (_resp) => {
				this.notify.success('successfully saved', 'Story');
			},
			error: () => this.notify.error('Could not save story.')
		});
	}

	storyLink() {
		const story = this.selectedStory();
		if (!story) return '';
		return (
			'https://' +
       window.location.hostname +
       ':' +
       window.location.port +
       '/story/' +
       story._id
		);
	}

	showStoryLinkToast() {
		this.notify.success('', 'Successfully added Link to Clipboard!');
	}

	/**
   * Opens the delete story toast
   *
   */

	showDeleteStoryToast() {
		const ref = this.dialog.open(ConfirmDialogComponent, {
			data: {
				title: 'Delete Story?',
				message: 'Are you sure you want to delete this story? It cannot be restored.',
				buttons: [
					{ label: 'Delete', value: 'delete', color: 'warn' },
					{ label: 'Cancel', value: 'cancel' }
				]
			} as ConfirmDialogData
		});
		ref.afterClosed().subscribe(result => {
			if (result === 'delete') this.storyService.deleteStoryEmitter();
		});
	}

	downloadFeature() {
		const story = this.selectedStory();
		if (!story) return;
		const id = story._id!;
		this.storyService.downloadStoryFeatureFile(id).subscribe({
			next: (ret) => {
				saveAs(
					ret,
					story.title + story._id + '.feature'
				);
			},
			error: () => this.notify.error('Could not download feature file.')
		});
	}

	/**
   * Emitts the delete story event
   * TODO: Currently not in use
   */
	deleteStory() {
		const story = this.selectedStory();
		if (!story) return;
		this.deleteStoryEvent.emit(story);
	}

	/**
    * Removes the selected story
    */
	storyDeleted() {
		const story = this.selectedStory();
		if (story && this.stories().find((x) => x === story))
			this.stories.set(this.stories().filter((x) => x !== story));

	}

	/**
    * Opens modal to rename background
    */
	changeBackgroundTitle() {
		const story = this.selectedStory();
		if (!story) return;
		const background = story.background;
		let storiesWithBlock;
		const blockToRename = this.blocks().find(
			(b) => b.isBackground && b.name === story.background.name
		);
		if (blockToRename)
			storiesWithBlock = this.stories().filter(
				(s) => s !== null && s.background.name == blockToRename.name
			);
    
		this.renameBackgroundModal().openRenameBackgroundModal(
			this.backgrounds,
			background,
			story,
			this.saveBackgroundAndRun,
			blockToRename!,
			storiesWithBlock!
		);
	}

	toTicket(issue_number: string) {
		const story = this.selectedStory();
		if (!story) return;
		const host = story.host;
		const url = `https://${host}/browse/${issue_number}`;
		window.open(url, '_blank');
	}

	/**
    * Selects a new Story and with it a new scenario
    * @param story
    */
	selectStoryScenario(story: Story) {
		this.selectedStory.set(story);
		this.initialyAddIsExample();
		this.preConditionResults = [];
		this.storyChosen.emit(story);
		if (
			story.scenarios.length > 0 &&
       story.scenarios[0] != null &&
       story.scenarios[0] != undefined
		) 
			this.selectScenario(story.scenarios[0]);
		else this.selectScenario(null);
		this.backgroundService.backgroundReplaced = undefined!;
	}

	openCreateScenario() {
		const story = this.selectedStory();
		if (!story) return;
		this.createScenarioModal().openCreateScenarioModal(story);
	}

	initialyAddIsExample() {
		const story = this.selectedStory();
		if (!story) return;
		story.scenarios.forEach((scenario) => {
			scenario.stepDefinitions.given.forEach((value, index) => {
				if (!scenario.stepDefinitions.given[index].isExample) {
					scenario.stepDefinitions.given[index].isExample = new Array(
						value.values.length
					);
					value.values.forEach((val, i) => {
						scenario.stepDefinitions.given[index].isExample![i] =
							val.startsWith('<') && val.endsWith('>');
					});
				}
			});
			scenario.stepDefinitions.when.forEach((value, index) => {
				if (!scenario.stepDefinitions.when[index].isExample) {
					scenario.stepDefinitions.when[index].isExample = new Array(
						value.values.length
					);
					value.values.forEach((val, i) => {
						scenario.stepDefinitions.when[index].isExample![i] =
							val.startsWith('<') && val.endsWith('>');
					});
				}
			});
			scenario.stepDefinitions.then.forEach((value, index) => {
				if (!scenario.stepDefinitions.then[index].isExample) {
					scenario.stepDefinitions.then[index].isExample = new Array(
						value.values.length
					);
					value.values.forEach((val, i) => {
						scenario.stepDefinitions.then[index].isExample![i] =
							val.startsWith('<') && val.endsWith('>');
					});
				}
			});
		});
	}

	/**
   * Starts the ai generation process and signals if successful or not
   */
	generateAiScenarios(): void {
		if (this.isReviewingAi())
			this.exitAiReviewMode();
    

		const story = this.selectedStory();
		if (!story || !story._id) {
			console.error('No valid story selected.');
			this.snackBar.open(
				'No valid story selected. Is your database entry corrupted?',
				'Okay',
				{
					duration: 5000
				}
			);
			return;
		}

		if (!story.body) {
			// || !story.sourceSteps? include when sourceSteps merged
			console.error(
				'Story has no possible input text in description or xRay steps'
			);
			this.snackBar.open(
				'Story has no possible input text in description or xRay steps.',
				'Okay',
				{
					duration: 5000
				}
			);
			return;
		}

		const storyId = story._id!;
		const repoId = this.selectedRepository()._id!;
		const storyTitle = story.title;
		this.aiLoadingStories.add(storyId);

		// --- Configuration of AI Parser ---
		// Step 1: Fetch the AI config from the new dedicated endpoint.
		this.projectService.getRepositoryAiConfig(repoId).subscribe({
			next: (projectAiConfig) => {
				// Check if the config was successfully loaded
				if (!projectAiConfig) {
					this.notify.error('AI configuration for this project could not be loaded.');
					this.aiLoadingStories.delete(storyId);
					return;
				}

				// Step 2: Build the final config object to send to the backend.
				const finalAiConfig : AiConfig = {
					textPreparation: {
						name: projectAiConfig.textPreparation.name === 'local' ? 'local' : 'cloud',
						modelName: this.overrideTextModel || projectAiConfig.textPreparation.modelName,
						// The parser needs to know the provider type for the specific model - at the moment we are only using custom for local + cloud
						provider: 'custom' as const,
						baseURL: projectAiConfig.textPreparation.baseURL
					},
					jsonConversion: {
						name: projectAiConfig.jsonConversion.name === 'local' ? 'local' : 'cloud',
						modelName: this.overrideJsonModel || projectAiConfig.jsonConversion.modelName,
						provider: 'custom' as const,
						baseURL: projectAiConfig.jsonConversion.baseURL
					}
					// Note: The API key is NOT sent from the frontend.
					// The backend will add it securely if the provider is 'cloud'.
				};

				// Step 3: Now, make the call to start the AI job in the backend.
				this.storyService.generateScenariosFromAI(storyId, finalAiConfig, repoId).subscribe({
					next: () => {
						this.snackBar.open(
							`AI generation for '${storyTitle}' has started... You will be notified upon completion.`,
							'OK',
							{ duration: 5000 }
						);

						// Step 4: Listen for the completion event from the backend.
						this.storyService.listenForAiResults(storyId).subscribe({
							next: (result) => {
								if (result.status === 'error') {
									this.aiLoadingStories.delete(storyId);
									console.error('AI Generation failed:', result.error);
									this.snackBar.open(
										`AI generation failed: ${result.error}`,
										'Close',
										{ duration: 7000 }
									);
									return;
								}
								this.aiLoadingStories.delete(storyId);
								// A suggestion is ready for review
								// Uses the captured storyId rather than result.storyId: the backend only
								// includes storyId on the success payload, so the closure value is the
								// one form that is valid on every branch.
								this.storyService
									.getStory(storyId)
									.subscribe({
										next: (updatedStoryWithSuggestion) => {
											this.updateLocalStoryState(
												storyId,
												updatedStoryWithSuggestion
											);
											this.aiSuggestions.set(
												storyId,
												updatedStoryWithSuggestion.aiSuggestion as { scenarios: Scenario[] }
											);

											// Notify the user that the suggestions are ready
											this.snackBar
												.open(
													`🤖 AI suggestions for '${storyTitle}' are ready for review.`,
													'Show',
													{ duration: 10000 }
												)
												.onAction()
												.subscribe(() => {
													const current = this.selectedStory();
													if (current && current._id !== storyId) {
														const storyToReview = this.stories().find(
															(s) => s._id === storyId
														);
														if (storyToReview) {
															this.storyChosen.emit(storyToReview);
															setTimeout(() => this.enterAiReviewMode(), 50);
														}
													} else 
														this.enterAiReviewMode();
                      
												});
										},
										error: () => this.notify.error('Could not load the AI suggestion.')
									});
							},
							error: (err) => {
								this.aiLoadingStories.delete(storyId);
								console.error('Error receiving AI results:', err);
								this.snackBar.open(
									`Error during AI generation: ${
										err.error?.message || 'An unknown error occurred.'
									}`,
									'Close',
									{ duration: 7000 }
								);
							}
						});
					},
					error: (err) => {
						this.aiLoadingStories.delete(storyId);
						console.error('Failed to queue AI job:', err);
						this.snackBar.open(err.error?.message || 'Could not start the AI generation task.', 'Close', { duration: 5000 });
					}
				});
			},
			error: (err) => {
				this.aiLoadingStories.delete(storyId);
				this.notify.error('Could not load AI configuration for this project.', 'Configuration Error');
				console.error('Failed to fetch AI config:', err);
			}
		});
	}
	/**
   * Enters the AI review mode for the currently selected story.
   */
	async enterAiReviewMode() {
		const story = this.selectedStory();
		if (!story) return;
		if (!this.aiSuggestions.has(story._id!)) {
			this.notify.info('No AI suggestion available for this story.');
			return;
		}

		// Fetch the full suggestion from the backend
		this.storyService
			.getStory(story._id!)
			.subscribe({
				next: (fullStory) => {
					const suggestion = fullStory.aiSuggestion as { scenarios: Scenario[] } | undefined;
					this.initializeIsExampleForStory(suggestion);

					this.aiSuggestions.set(story._id!, suggestion!);
					this.isReviewingAi.set(true);
					this.reviewModeChanged.emit(true);

					const suggestionScenarios = suggestion?.scenarios;
					if (suggestionScenarios && suggestionScenarios.length > 0) 
						this.selectScenario(suggestionScenarios[0]);
					else 
						this.selectScenario(null);
        
				},
				error: () => this.notify.error('Could not load the AI suggestion.')
			});
	}

	/**
   * Exits the AI review mode and resets the UI to a consistent state.
   * Can optionally update the story with new data.
   * @param updatedStory - The updated story object from the server, if available.
   */
	exitAiReviewMode(updatedStory?: Story) {
		this.isReviewingAi.set(false);
		this.reviewModeChanged.emit(false);

		// If a story was updated (meaning a merge or discard happened),
		// update the local state and remove the suggestion from the map.
		if (updatedStory) {
			this.selectedStory.set(updatedStory);
			const storiesArr = [...this.stories()];
			const index = storiesArr.findIndex((s) => s._id === updatedStory._id);
			if (index > -1)
				storiesArr[index] = updatedStory;
			this.stories.set(storiesArr);
			this.aiSuggestions.delete(updatedStory._id!);
			this.storyService.stories.set(this.stories());
		}

		// Always restore the view to the first original scenario.
		const currentStory = this.selectedStory();
		if (
			currentStory &&
       currentStory.scenarios &&
       currentStory.scenarios.length > 0
		) 
			this.selectScenario(currentStory.scenarios[0]);
		else 
			this.selectScenario(null);
    
	}

	/**
    * Discards the current AI suggestion.
    */
	discardAiSuggestion() {
		const story = this.selectedStory();
		if (!story) return;
		// Update story through signal instead of in-place mutation
		this.selectedStory.update((s) =>
			s ? { ...s, aiSuggestion: undefined as Story['aiSuggestion'] } : s
		);

		this.storyService.updateStory(story).subscribe({
			next: (updatedStory) => {
				this.notify.info('AI suggestion discarded.');
				this.exitAiReviewMode(updatedStory);
			},
			error: () => this.notify.error('Could not discard AI suggestion.')
		});
	}

	/**
    * Merges the AI suggestion with the existing scenarios.
    * @param overwrite If true, replaces existing scenarios. If false, appends them.
    */
	mergeAiSuggestion(overwrite: boolean) {
		const story = this.selectedStory();
		if (!story) return;
		const suggestion = this.aiSuggestions.get(story._id!);
		if (!suggestion || !suggestion.scenarios) return;

		let combinedScenarios: Scenario[];

		if (overwrite) 
			combinedScenarios = suggestion.scenarios;
		else 
			combinedScenarios = [...story.scenarios, ...suggestion.scenarios];
    
		combinedScenarios.forEach((scenario, index) => {
			scenario.scenario_id = index + 1;
		});

		// Update story through signal instead of in-place mutation
		this.selectedStory.update((s) =>
			s ? { ...s, scenarios: combinedScenarios, aiSuggestion: undefined as Story['aiSuggestion'] } : s
		);

		// Save the updated story
		this.storyService
			.updateStory(story)
			.subscribe({
				next: (updatedStory) => {
					this.notify.success(
						'AI scenarios have been saved to the story!',
						'Saved'
					);
					this.exitAiReviewMode(updatedStory);
				},
				error: () => this.notify.error('Could not save AI scenarios.')
			});
	}

	/**
 * Updates the story in the local `stories` array and sets it as `selectedStory` if it's currently active.
 * @param storyId The ID of the story to update.
 * @param updatedStory The new story object.
 */
	private updateLocalStoryState(storyId: string, updatedStory: Story) {
		const storiesArr = [...this.stories()];
		const index = storiesArr.findIndex(s => s._id === storyId);
		if (index > -1) {
			storiesArr[index] = updatedStory;
			this.stories.set(storiesArr);
			this.storyService.stories.set([...this.stories()]);
		}
    
		// If the updated story is the one currently being viewed, refresh it
		const currentStory = this.selectedStory();
		if (currentStory && currentStory._id === storyId) {
			this.selectedStory.set(updatedStory);

			// After an auto-merge, the scenario list has changed.
			// We must select a scenario to refresh the editor view.
			if (updatedStory.scenarios && updatedStory.scenarios.length > 0) 
				this.selectScenario(updatedStory.scenarios[0]);
			else 
				this.selectScenario(null);
        
		}
	}

	/**
   * Ensures that all steps within a story's scenarios have a properly initialized isExample array.
   * This prevents crashes when rendering steps from different sources (DB vs. AI).
   * @param story The story or story-like object to process.
   */
	private initializeIsExampleForStory(story: { scenarios?: Scenario[] } | null | undefined) {
		if (!story || !story.scenarios)
			return;


		story.scenarios.forEach((scenario: Scenario) => {
			if (!scenario || !scenario.stepDefinitions)
				return;


			const stepTypes: ('given' | 'when' | 'then')[] = [
				'given',
				'when',
				'then'
			];

			for (const stepType of stepTypes)
				if (scenario.stepDefinitions[stepType])
					scenario.stepDefinitions[stepType].forEach((step: StepType) => {
						if (step && step.values) {
							if (
								!step.isExample ||
                step.isExample.length !== step.values.length
							)
								step.isExample = new Array(step.values.length).fill(false);

							step.values.forEach((val: string, i: number) => {
								step.isExample![i] =
									typeof val === 'string' &&
                  val.startsWith('<') &&
                  val.endsWith('>');
							});
						}
					});


		});
	}
}
