import { Router } from '@angular/router';
import {
  Component,
  OnInit,
  Input,
  ViewChild,
  EventEmitter,
  Output,
  OnDestroy, AfterViewChecked,
  ChangeDetectionStrategy
} from '@angular/core';
import { ApiService } from '../Services/api.service';
import { Story } from '@shared/models/Story';
import { Scenario } from '@shared/models/Scenario';
import { StepType } from '@shared/models/StepType';
import { Background } from '@shared/models/Background';
import { NotificationService } from '../Services/notification.service';
import { saveAs } from 'file-saver';
import { ThemingService } from '../Services/theming.service';
import { RenameStoryComponent } from '../modals/rename-story/rename-story.component';
import { firstValueFrom, Subscription } from 'rxjs';
import { CreateScenarioComponent } from '../modals/create-scenario/create-scenario.component';
import { RenameBackgroundComponent } from '../modals/rename-background/rename-background.component';
import { BackgroundService } from '../Services/background.service';
import { StoryService } from '../Services/story.service';
import { ScenarioService } from '../Services/scenario.service';
import { XrayService } from '../Services/xray.service';
import { GroupService } from '../Services/group.service';
import { ReportService } from '../Services/report.service';
import { ProjectService } from '../Services/project.service';
import { LoginService } from '../Services/login.service';
import { AiConfig, RepositoryContainer } from '@shared/models/RepositoryContainer';
import { SaveBlockFormComponent } from '../modals/save-block-form/save-block-form.component';
import { Block } from '@shared/models/Block';
import { StepDefinition } from '@shared/models/StepDefinition';
import { BlockService } from '../Services/block.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent, ConfirmDialogData } from '../modals/confirm-dialog/confirm-dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WorkgroupEditComponent } from '../modals/workgroup-edit/workgroup-edit.component';
import { ManagementService } from '../Services/management.service';
import { ExecutionListComponent } from '../modals/execution-list/execution-list.component';

/**
 * Empty background
 */
const emptyBackground: Background = {
	name: 'New Background',
	stepDefinitions: { when: [] }
};

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
	changeDetection: ChangeDetectionStrategy.Eager,
	standalone: false
})
export class StoryEditorComponent implements OnInit, OnDestroy, AfterViewChecked {
	/**
   * set new currently selected scenario
   */
	@Input()
	set newSelectedScenario(scenario: Scenario) {
		if (scenario) {
			if (this.isReviewingAi) 
				this.exitAiReviewMode();
      
			this.selectScenario(scenario);
		}
	}

	/**
   * set new stories
   */
	@Input()
	set newStories(stories: Story[]) {
		if (stories) 
			this.stories = stories;
    
	}

	/**
   * set new currently selected story
   */
	@Input()
	set newSelectedStory(story: Story) {
		console.log('Wir selecten diese Story hier:', story);
		this.selectedStory = story;
		this.initializeIsExampleForStory(this.selectedStory);
		this.isReviewingAi = false;

		if (this.selectedStory && this.selectedStory.aiSuggestion)
			this.aiSuggestions.set(this.selectedStory._id!, this.selectedStory.aiSuggestion);
		else if (this.selectedStory)
			this.aiSuggestions.delete(this.selectedStory._id!);
    

		if (this.selectedStory !== undefined && this.selectedStory.preConditions) 
			this.preConditionResults = this.xrayService.getPreconditionStories(
				this.selectedStory.preConditions
			);
    
    
		if (this.selectedStory &&
      this.selectedStory.scenarios &&
      this.selectedStory.scenarios.length > 0
		) 
			this.selectScenario(this.selectedStory.scenarios[0]);
		else if (this.selectedStory) 
		// Editor hiding is happening in selectScenario
			this.selectScenario(null);
    
	}

	/**
   * show loading when tests of groups run
   * hide result of story
   */
	@Input()
	set testRunningForGroup(groupRunning: boolean) {
		this.testRunningGroup = groupRunning;
		this.showResults = false;
	}

	/**
   * Original step types
   */
	originalStepTypes!: StepType[];

	/**
   * List of stories
   */
	stories!: Story[];

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
	selectedStory!: Story;

	/**
   * Currently selected scenario
   */
	selectedScenario!: Scenario;

	/**
   * Currently selected repository
   */
	@Input ()
	selectedRepository!: RepositoryContainer;

	/**
   * Current repo Id
   */

	repoId!: string;
	/**
   * If the story editor should be shown
   */
	showEditor = false;
	/**
   * Currently retrieved projects
   */
	repositories!: RepositoryContainer[];

	/**
   * If the results should be shown
   */
	showResults = false;

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
	showBackground = false;

	/**
   * if the test is done
   */
	testDone = false;

	/**
   * If the test is running
   */
	testRunning = false;
	testRunningGroup!: boolean;

	/**
   * html report of the result
   */
	htmlReport!: BlobPart;

	/**
   * if the stories are loaded
   */
	storiesLoaded = false;
	/**
   * If there is a error in the stories request
   */
	storiesError = false;

	/**
   * If the repository is a custom project
   */
	db = false;

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
	blocks!: Block[];
	/**
   * Converted blocks as backgrounds
   */
	blockAsBackground!: Background[];
	/**
   *If the modal Save background as a block open
   */
	openBlockModal: any;
	/**
   * if the background should be saved and then the test run
   */
	saveBackgroundAndRun = false;

	/**
   * if the report is saved
   */
	reportIsSaved = false;
	error!: string;
	/**
   * Object id of the current report
   */
	reportId: any;

	/*
   * Report of the test
   */
	testReport: any;

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
	gecko_enabled: any;
	chromium_enabled: any;
	edge_enabled: any;
	webkit_enabled: any;

	/**
   * Global settings indicator
   */
	testRunner = 'seleniumWebdriver';

	/**
   * Global settings indicator
   */
	globalSettingsActivated!: boolean;

	/**
   * Project configuartion settings
   */

	repoSettings: any;

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

	lastToFocus: any;

	story!: Story;

	/**
   * Loading status for AI per story
   */
	aiLoadingStories = new Set<string>();

	/**
   * Suggestions for AI per story
   */
	aiSuggestions = new Map<string, any>();

	/**
   * User is reviewing AI generated content
   */
	isReviewingAi = false;

	isAiAvailable = false;

	/**
   * Mapping for Precondition Stories
   */
	preConditionResults: any[] = [];

	// Properties to hold the temporary model names from the new UI
	overrideTextModel!: string;
	overrideJsonModel!: string;

	readonly TEMPLATE_NAME = 'background';

	/**
   * Subscribtions for all EventEmitter
   */
	deleteStoryObservable!: Subscription;
	storiesErrorObservable!: Subscription;
	deleteScenarioObservable!: Subscription;
	runSaveOptionObservable!: Subscription;
	renameStoryObservable!: Subscription;
	themeObservable!: Subscription;
	getBackendUrlObservable!: Subscription;
	getStoriesObservable!: Subscription;
	renameBackgroundObservable!: Subscription;
	updateObservable!: Subscription;
	applyBackgroundChangesObservable!: Subscription;
	checkReferenceObservable!: Subscription;
	deleteReferenceObservable!: Subscription;
	unpackBlockObservable!: Subscription;
	updateNameRefObservable!: Subscription;
	convertToReferenceObservable!: Subscription;

	@Input() isDark!: boolean;

	/**
   * View child of the scenario editor
   */
	@ViewChild('scenarioChild') scenarioChild: any;
	/**
   * View child of the modals component
   */
	@ViewChild('renameStoryModal') renameStoryModal!: RenameStoryComponent;
	@ViewChild('createNewScenario') createScenarioModal!: CreateScenarioComponent;
	@ViewChild('renameBackgroundModal')
	renameBackgroundModal!: RenameBackgroundComponent;
	@ViewChild('workgroupEditModal') workgroupEditModal!: WorkgroupEditComponent;
	@ViewChild('executionListModal') executionListModal!: ExecutionListComponent;

	@Output()
	deleteStoryEvent: EventEmitter<any> = new EventEmitter();

	@Output()
	storyChosen: EventEmitter<any> = new EventEmitter();

	// Event emitter to lock stories bar during review mode
	@Output()
	reviewModeChanged = new EventEmitter<boolean>();

	/**
   * Event emitter to show or hide global TestResult
   */
	@Output() report: EventEmitter<any> = new EventEmitter();

	/**
   * Stories bar component
   */
	constructor(
		public apiService: ApiService,
		public notify: NotificationService,
		public themeService: ThemingService,
		public backgroundService: BackgroundService,
		public storyService: StoryService,
		public scenarioService: ScenarioService,
		public xrayService: XrayService,
		public reportService: ReportService,
		public router: Router,
		public projectService: ProjectService,
		public loginService: LoginService,
		public blockService: BlockService,
		public managmentService: ManagementService,
		public dialog: MatDialog,
		private snackBar: MatSnackBar,
		public groupService: GroupService
	) {
		if (this.apiService.urlReceived) 
			this.loadStepTypes();
		else 
			this.apiService.getBackendInfo();
    

		if (this.selectedStory) {
			this.storiesLoaded = true;
			this.storiesError = false;
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
		if (this.width !== event.width || this.height !== event.height) 
			this.selectedScenario.saved = false;
    
		this.selectedScenario.width = event.width;
		this.selectedScenario.height = event.height;
	}

	ngAfterViewChecked() {
		this.openBlockModal = undefined;
		/**
     * when loading for group is displayed scroll to it
     */
		if (this.testRunningGroup === true) {
			const loadingScreen = document.getElementById('loading');
			loadingScreen!.scrollIntoView();
		}
		if (this.selectedStory !== undefined && this.stories && this.blocks) {
			this.storeCurrentBackground(this.selectedStory.background);
			this.backgrounds = this.stories
				.filter((s) => s !== null)
				.map((s) => s.background);
			this.blockAsBackground = [];
			this.blocks = this.blocks.filter((b) => b.isBackground);
			for (const b of this.blocks) {
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
   * Subscribes to all necessary events
   */
	ngOnInit() {
		this.projectService.checkAiAvailability().subscribe(available => {
			this.isAiAvailable = available;
		});

		// in event that stories are already loaded
		if (this.stories) 
			this.storiesLoaded = true;
    
		this.getStoriesObservable = this.storyService.getStoriesEvent.subscribe(
			(stories: Story[]) => {
				this.storiesLoaded = true;
				this.storiesError = false;
				this.showEditor = false;
				this.setStories(stories);
				this.db = localStorage.getItem('source') === 'db';
			}
		);

		this.deleteStoryObservable = this.storyService.deleteStoryEvent.subscribe(
			() => {
				this.showEditor = false;
				this.storyDeleted();
			}
		);

		this.storiesErrorObservable = this.apiService.storiesErrorEvent.subscribe(
			(_) => {
				this.storiesError = true;
				this.showEditor = false;

				window.localStorage.removeItem('login');
				this.router.navigate(['/login']);
			}
		);

		this.deleteScenarioObservable =
			this.scenarioService.deleteScenarioEvent.subscribe(
				(xrayEnabled: boolean) => {
					this.deleteScenario(this.selectedScenario, xrayEnabled);
				}
			);

		this.runSaveOptionObservable = this.apiService.runSaveOptionEvent.subscribe(
			(option) => {
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

		this.renameStoryObservable = this.storyService.renameStoryEvent.subscribe(
			(changedValues) =>
				this.renameStory(
					changedValues.newStoryTitle,
					changedValues.newStoryDescription
				)
		);
		this.isDark = this.themeService.isDarkMode();
		this.themeObservable = this.themeService.themeChanged.subscribe(() => {
			this.isDark = this.themeService.isDarkMode();
		});

		this.getBackendUrlObservable = this.apiService.getBackendUrlEvent.subscribe(
			() => {
				this.loadStepTypes();
			}
		);

		this.renameBackgroundObservable =
			this.backgroundService.renameBackgroundEvent.subscribe((newName) => {
				this.renameBackground(newName);
			});
		// get blocks
		const id = localStorage.getItem('id')!;
		this.blockService.getBlocks(id).subscribe((resp) => {
			this.blocks = resp;
		});
		this.updateObservable = this.blockService.updateBlocksEvent.subscribe(
			(_) => {
				const id = localStorage.getItem('id')!;
				this.blockService.getBlocks(id).subscribe((resp) => {
					this.blocks = resp;
					console.log('Updated blocks:', this.blocks);
				});
			}
		);
		//Event when deleting references among steps
		this.checkReferenceObservable =
			this.blockService.checkRefOnRemoveEvent.subscribe((blockReferenceId) => {
				const id = localStorage.getItem('id')!;
				this.blockService.getBlocks(id).subscribe((resp) => {
					this.blocks = resp;
					if (this.blocks) {
						const referenceBlock = this.blocks.find(
							(block) => block._id == blockReferenceId
						);
						this.blockService.checkBlockOnReference(
							this.blocks,
							this.stories,
							referenceBlock!
						);
					}
				});
			});
		//Event when the entire reference block is deleted. Unpacking steps in all relevant stories
		this.deleteReferenceObservable =
			this.blockService.deleteReferenceEvent.subscribe((block) => {
				this.blockService.deleteBlockReference(block, this.stories);
			});
		//Event when unpacking block
		this.unpackBlockObservable = this.blockService.unpackBlockEvent.subscribe(
			(obj) => {
				this.blockService.unpackScenarioWithBlock(
					obj.block,
					this.selectedScenario,
					obj.stepReference
				);
				const id = localStorage.getItem('id')!;
				this.blockService.getBlocks(id).subscribe((resp) => {
					this.blocks = resp;
					this.blockService.checkBlockOnReference(
						this.blocks,
						this.stories,
						obj.block
					);
				});
				this.selectedScenario.saved = false;
			}
		);
		//Event to update a reference block name
		this.updateNameRefObservable =
			this.blockService.updateNameRefEvent.subscribe((block) =>
				this.blockService.updateNameReference(block, this.stories)
			);
		this.applyBackgroundChangesObservable =
			this.backgroundService.applyChangesBackgroundEvent.subscribe((option) => {
				if (option == 'toCurrentBackground') {
					this.notify.info(
						'Please enter a new Background name to save your changes'
					);
					this.changeBackgroundTitle();
				} else if (option == 'centrally') 
					this.applyChangesToBackgrounds(this.selectedStory.background);
        
			});
		this.convertToReferenceObservable =
			this.blockService.convertToReferenceEvent.subscribe((block) =>
				this.blockService.convertSelectedStepsToRef(
					block,
					this.selectedScenario
				)
			);
	}

	ngOnDestroy() {
		if (!this.deleteStoryObservable.closed) 
			this.deleteStoryObservable.unsubscribe();
    
		if (!this.storiesErrorObservable.closed) 
			this.storiesErrorObservable.unsubscribe();
    
		if (!this.deleteScenarioObservable.closed) 
			this.deleteScenarioObservable.unsubscribe();
    
		if (!this.runSaveOptionObservable.closed) 
			this.runSaveOptionObservable.unsubscribe();
    

		if (!this.renameStoryObservable.closed) 
			this.renameStoryObservable.unsubscribe();
    
		if (!this.themeObservable.closed) 
			this.themeObservable.unsubscribe();
    
		if (!this.getBackendUrlObservable.closed) 
			this.getBackendUrlObservable.unsubscribe();
    
		if (!this.getStoriesObservable.closed) 
			this.getStoriesObservable.unsubscribe();
    
		if (!this.renameBackgroundObservable.closed) 
			this.renameBackgroundObservable.unsubscribe();
    
		if (!this.applyBackgroundChangesObservable.closed) 
			this.applyBackgroundChangesObservable.unsubscribe();
    
		if (!this.unpackBlockObservable.closed) 
			this.unpackBlockObservable.unsubscribe();
    
		if (this.updateObservable && !this.updateObservable.closed) 
			this.updateObservable.unsubscribe();
    
		if (this.checkReferenceObservable && !this.checkReferenceObservable.closed) 
			this.checkReferenceObservable.unsubscribe();
    
		if (this.deleteReferenceObservable && !this.deleteReferenceObservable.closed) 
			this.deleteReferenceObservable.unsubscribe();
    
		if (this.updateNameRefObservable && !this.updateNameRefObservable.closed) 
			this.updateNameRefObservable.unsubscribe();
    
		if (this.convertToReferenceObservable && !this.convertToReferenceObservable.closed) 
			this.convertToReferenceObservable.unsubscribe();
    
	}

	/**
   * Runs the test without saving it
   */
	runOption() {
		const tmpScenarioSaved = this.scenarioChild.scenarioSaved;
		const tmpBackgroundSaved = this.selectedStory.background.saved;
		this.scenarioChild.scenarioSaved = true;
		this.selectedStory.background.saved = true;
		this.runTests(this.currentTestScenarioId);
		this.scenarioChild.scenarioSaved = tmpScenarioSaved;
		this.selectedStory.background.saved = tmpBackgroundSaved;
	}

	/**
   * sets the stories
   * @param stories
   */
	setStories(stories: Story[]) {
		this.stories = stories;
	}

	/**
   * Select a new currently used scenario
   * @param scenario The scenario to select.
   */
	selectNewScenario(scenario: Scenario) {
		this.selectedScenario = scenario;
	}

	/**
   * Navigates to the previous scenario in the currently active list (original or AI).
   */
	navigateScenarioLeft() {
		const currentList = this.isReviewingAi
			? this.aiSuggestions.get(this.selectedStory._id!)?.scenarios
			: this.selectedStory.scenarios;
		if (!currentList) return;

		const currentIndex = currentList.findIndex(
			(s: any) => s.scenario_id === this.selectedScenario.scenario_id
		);
		if (currentIndex > 0) 
			this.selectNewScenario(currentList[currentIndex - 1]);
    
	}

	/**
   * Navigates to the next scenario in the currently active list (original or AI).
   */
	navigateScenarioRight() {
		const currentList = this.isReviewingAi
			? this.aiSuggestions.get(this.selectedStory._id!)?.scenarios
			: this.selectedStory.scenarios;
		if (!currentList) return;

		const currentIndex = currentList.findIndex(
			(s: any) => s.scenario_id === this.selectedScenario.scenario_id
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
		this.storyService.getStepTypes().subscribe((resp: StepType[]) => {
			this.originalStepTypes = resp;
		});
	}

	setOneDriver() {
		this.storyService
			.changeOneDriver(this.selectedStory.oneDriver!, this.selectedStory._id!)
			.subscribe((resp: any) => {
				this.selectedStory = resp;
			});
	}

	/**
   * Opens the delete scenario toast
   * @param scenario
   */
	showDeleteScenarioToast($event: any) {
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
				if (result === 'delete') this.scenarioService.deleteScenarioEmitter(false);
				else if (result === 'delete-xray') this.scenarioService.deleteScenarioEmitter(true);
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
				if (result === 'delete') this.scenarioService.deleteScenarioEmitter(false);
			});
		}
	}

	/**
   * Deletes scenario
   * @param scenario
   */
	deleteScenario(scenario: Scenario, xrayEnabled: boolean) {
		this.scenarioService
			.deleteScenario(this.selectedStory._id!, scenario, xrayEnabled)
			.subscribe((_) => {
				this.scenarioDeleted();
				this.notify.error('', 'Scenario deleted');
			});
	}

	/**
   * Removes scenario from the selected story
   */
	scenarioDeleted() {
		const indexScenario: number = this.selectedStory.scenarios.indexOf(
			this.selectedScenario
		);
		if (indexScenario !== -1) 
			this.selectedStory.scenarios.splice(indexScenario, 1);
    

		if (this.selectedStory.scenarios.length > 0) 
			this.selectScenario(this.selectedStory.scenarios.slice(-1)[0]);
		else 
			this.showEditor = false;
    
	}

	/**
   * Adds a scenario to story
   */
	addScenario(event: any) {
		const scenarioName = event;
		this.scenarioService
			.addScenario(this.selectedStory._id!, scenarioName)
			.subscribe((resp: Scenario) => {
				this.selectScenario(resp);
				this.selectedStory.scenarios.push(resp);
				this.notify.info('', 'Scenario added');
			});
	}
	/**
   * updates the background
   */
	updateBackground() {
		Object.keys(this.selectedStory.background.stepDefinitions).forEach(
			(key, _) => {
				(this.selectedStory.background.stepDefinitions as unknown as Record<string, StepType[]>)[key].forEach(
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
      (this.selectedStory.background.saved == undefined ||
        !this.selectedStory.background.saved)
		) 
			this.backgroundChecks();
		else {
			this.changeBackgroundBlock();
			delete this.selectedStory.background.saved;
			this.backgroundService
				.updateBackground(this.selectedStory._id!, this.selectedStory.background)
				.subscribe((_) => {
					this.backgroundService.backgroundChangedEmitter();
					this.notify.success('successfully saved', 'Background');
					if (this.saveBackgroundAndRun) {
						this.apiService.runSaveOption('saveScenario');
						this.saveBackgroundAndRun = false;
					}
				});
		}
	}
	/**
   * Check: if the same background is used in different stories
   */
	checkStoriesForBack() {
		const usingBackground = this.stories.filter(
			(s) =>
				s !== null &&
        s.background.name == this.selectedStory.background.name &&
        s.background.name !== 'New Background' &&
        s.background.stepDefinitions.when.length !== 0
		);
		return usingBackground;
	}

	/**
   * Change Block if background
   */
	changeBackgroundBlock() {
		this.blocks.forEach((block) => {
			if (
				block.isBackground &&
        this.backgroundService.backgroundReplaced == undefined &&
        block.name == this.selectedStory.background.name &&
        block.stepDefinitions != this.selectedStory.background.stepDefinitions
			) {
				block.stepDefinitions.when =
					this.selectedStory.background.stepDefinitions.when;
				this.blockService
					.updateBlock(block)
					.subscribe((_) => this.blockService.updateBlocksEmitter());
			}
		});
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
		delete this.selectedStory.background.saved;
		const storyId: (string | undefined)[] = [];
		this.stories.forEach((story) => {
			if (story.background.name === background.name) {
				story.background.stepDefinitions = background.stepDefinitions;
				storyId.push(story._id);
			}
		});
		this.changeBackgroundBlock();
		storyId.forEach((_id) => {
			this.backgroundService
				.updateBackground(_id, this.selectedStory.background)
				.subscribe((_) => {
					this.backgroundService.backgroundChangedEmitter();
					if (this.saveBackgroundAndRun) {
						this.apiService.runSaveOption('saveScenario');
						this.saveBackgroundAndRun = false;
					}
				});
		});
		this.notify.success('successfully saved', 'Backgrounds');
	}

	/**
   * deletes the background
   */
	deleteBackground() {
		this.backgroundService
			.deleteBackground(this.selectedStory._id!)
			.subscribe((_) => {
				this.showBackground = false;
				const blockBackgrounds = this.blocks.filter((b) => b.isBackground);
				if (blockBackgrounds) 
					for (const block of this.blocks) 
						if (block.name == this.selectedStory.background.name) 
							this.blockService.checkBackgroundsOnDelete(block, this.stories);
          
        
				this.selectedStory.background = emptyBackground;
				this.selectedStory.background.saved = true;
			});
	}

	/**
   * Select a scenario
   * @param scenario
   */

	selectScenario(scenario: Scenario | null) {
		this.selectedScenario = scenario as Scenario;
		this.showResults = false;
		if (scenario) {
			this.showEditor = true;
      
			this.emulator_enabled =
				scenario.emulator ?? this.repoSettings?.emulator ?? false;
      
			if (this.emulator_enabled) 
				this.selectedScenario.emulator =
					scenario.emulator ?? this.repoSettings?.emulator ?? 'No emulator';
      

			this.selectedScenario.stepWaitTime =
				scenario.stepWaitTime ?? this.repoSettings?.stepWaitTime ?? 0;
			this.selectedScenario.browser =
				scenario.browser ?? this.repoSettings?.browser ?? 'chromium';
			this.selectedScenario.width =
				scenario.width ?? this.repoSettings?.width ?? 1920;
			this.selectedScenario.height =
				scenario.height ?? this.repoSettings?.height ?? 1080;
    
		} else {
			// This is the path for when scenario is null
			this.showEditor = false;
      
			// Default to repo settings if no scenario is selected
			this.emulator_enabled = this.repoSettings?.emulator ?? false;
		}
	}

	/**
   * Sort the backgrounds of stories in a list
   * @returns
   */
	sortedBackgrounds() {
		if (this.backgrounds !== undefined) {
			this.filteredBackgrounds = [];
			this.filteredBackgrounds = this.backgrounds
				.filter(
					(s) =>
						s.name !== this.selectedStory.background.name &&
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
		this.selectedStory.background.stepDefinitions.when = JSON.parse(
			JSON.stringify(background.stepDefinitions.when)
		);
		this.selectedStory.background.name = background.name;
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

	@ViewChild('saveBlockModal') saveBlockModal!: SaveBlockFormComponent;
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
			this.saveBlockModal.openSaveBlockFormModal(
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
		if (this.storySaved()) {
			// if story is saved
			// Reset state for new test run
			this.reportIsSaved = false;
			this.testRunning = true;
			this.showResults = false; // Hide previous report while new test runs
			this.report.emit(false);
			const loadingScreen: HTMLElement = document.getElementById('loading')!;

			loadingScreen.scrollIntoView();

			const params = this.testRunParams();

			// CASE 1: Run a single scenario by its ID
			if (scenario_id) 
				this.storyService
					.runTests(this.selectedStory._id!, scenario_id, params)
					.subscribe({
						next: (resp: any) => {
							this.testRunResponse(resp);
							console.log('Test Report:', this.testReport);

							// Determine test status for Xray synchronization
							const val = this.testReport.status;
							const testStatus = val ? 'PASS' : 'FAIL';

							// If user selected Xray test executions, update their status
							if (selectedExecutions) 
								this.xrayService.updateXrayStatus(
									this.selectedScenario,
									selectedExecutions,
									testStatus
								);
              
						},
						error: (err) => {
							console.error('Test execution failed:', err);
							this.testRunning = false;
							this.notify.error('', 'Test execution failed');
						}
					});
			else 
			// CASE 2: Story has pre-conditions — run as temporary group (pre-condition stories + this story)
				if (this.preConditionResults && this.preConditionResults.length > 0) 
					try {
						const temp_group = await this.createTempGroup();
						const params = {
							id: localStorage.getItem('id'),
							repository: localStorage.getItem('repository'),
							source: localStorage.getItem('source'),
							group: temp_group
						};
						this.groupService.runTempGroup(params).subscribe({
							next: (resp: any) => {
								this.testRunResponse(resp);
								// Update Xray status for each scenario in the tested story
								if (selectedExecutions) {
									const testStatus = this.testReport.status ? 'PASS' : 'FAIL';
									const testedStory =
										this.testReport.storiesTested[
											this.testReport.storiesTested.length - 1
										];
									testedStory.scenarios.forEach((scenario: any) => {
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
								this.testRunning = false;
								this.notify.error('', 'Test execution failed');
							}
						});
					} catch (error) {
						console.error('Error while creating temp group', error);
						this.testRunning = false;
					}
				else 
				// CASE 3: No pre-conditions — run all scenarios of the story directly
					this.storyService
						.runTests(this.selectedStory._id!, null as any, params)
						.subscribe({
							next: (resp: any) => {
								this.testRunResponse(resp);
								const testStatus = this.testReport.status ? 'PASS' : 'FAIL';

								// Emit status change for each scenario and update Xray if applicable
								this.testReport.scenarioStatuses.forEach((scenario: any) => {
									this.scenarioService.scenarioStatusChangeEmit(
										this.selectedStory._id!,
										scenario.scenarioId,
										scenario.status
									);

									// Find the matching scenario object for Xray update
									const currentScenarioId = scenario.scenarioId;
									const currentScenario = this.selectedStory.scenarios.find(
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
								this.testRunning = false;
								this.notify.error('', 'Test execution failed');
							}
						});
        
      
		} else {
			// if story is not saved, inform user
			this.currentTestScenarioId = scenario_id!;
			this.currentTestStoryId = this.selectedStory.story_id;
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
		const seenStories = new Set<string | number>();

		// add current story to seen stories
		seenStories.add(this.selectedStory.issue_number!);

		// collect all pre-stories
		const member_stories = await this.collectPreStories(
			this.selectedStory,
			seenStories,
			[]
		);

		member_stories.push(this.selectedStory);

		for (const story of member_stories) 
			console.log('Temp group story:', story.issue_number);
    

		const temp_group = {
			_id: -1,
			name: this.selectedStory.title,
			member_stories: member_stories,
			isSequential: true
		};

		return temp_group;
	}

	/*
   * Collects all pre-stories for a given story recursively
   */
	async collectPreStories(story: Story, seenStories: Set<string | number>, member_stories: Story[]) {
		console.log('Collecting pre-conditions for story:', story.issue_number);
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

		if (!this.globalSettingsActivated) {
			const browserSelect = document.getElementById(
				'browserSelect'
			) as HTMLSelectElement;
			const emulatorSelect = document.getElementById(
				'emulatorSelect'
			) as HTMLSelectElement;
			browserSelectValue = browserSelect ? browserSelect.value : null;
			emulatorSelectValue = emulatorSelect ? emulatorSelect.value : null;
		}
		console.log(
			'We are giving the following testRunner to the Backend: ',
			this.testRunner
		);
		return {
			browser: browserSelectValue,
			emulator: emulatorSelectValue,
			width: this.selectedScenario.width || undefined,
			height: this.selectedScenario.height || undefined,
			stepWaitTime: this.selectedScenario.stepWaitTime ?? undefined,
			repository: localStorage.getItem('repository'),
			repositoryId: localStorage.getItem('id'),
			source: localStorage.getItem('source'),
			oneDriver: this.selectedStory.oneDriver,
			testRunner: this.testRunner
		};
	}

	/*
   * Response from test run
   */
	testRunResponse(resp: any) {
		const iframe: HTMLIFrameElement = document.getElementById(
			'testFrame'
		) as HTMLIFrameElement;
		iframe.srcdoc = resp.htmlFile;
		this.reportId = resp.reportId;
		this.htmlReport = resp.htmlFile;
		this.testReport = resp.report;
		this.testDone = true;
		this.showResults = true;
		this.testRunning = false;
		setTimeout(() => iframe.scrollIntoView(), 10);
		this.notify.info('', 'Test is done');
		this.runUnsaved = false;
	}

	/**
   * Evaluates whether to open xray execution list modal in run scenario.
   * @param scenario_id
   */
	evaluateAndRunScenario(scenario_id: number) {
		if (
			this.selectedScenario &&
      this.selectedScenario.testKey &&
      this.selectedScenario.testRunSteps!.length > 0
		) 
		// Open the modal if there are test execution steps
			this.executionListModal.openExecutionListModal(this.selectedScenario);
		else 
		// Run tests directly if there are no test execution steps
			this.runTests(scenario_id);
    
	}

	/**
   * Evaluates whether to open xray execution list modal in run story.
   */
	evaluateAndRunStory() {
		// Check if there is at least one scenario in the story with xray key and execution
		const executableTests = this.selectedStory.scenarios.some(
			(scenario) =>
				scenario.testKey &&
        scenario.testRunSteps &&
        scenario.testRunSteps.length > 0
		);
		if (executableTests) 
			this.executionListModal.openExecutionListModal(this.selectedStory);
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
		const blob = new Blob([this.htmlReport], { type: 'text/html' });
		saveAs(blob, this.selectedStory.title + '.html');
	}

	/**
   * Set the time to wait between the steps
   * @param event
   * @param newTime
   */
	setStepWaitTime(newTime: number) {
		if (this.selectedScenario) {
			this.selectedScenario.stepWaitTime = newTime;
			this.selectedScenario.saved = false;
		}
	}

	/**
   * Set the browser
   * @param newBrowser
   */
	setBrowser(newBrowser: string) {
		this.selectedScenario.browser = newBrowser;
		this.setEmulatorEnabled(false);
		this.selectedScenario.saved = false;
	}

	/**
   * Set the test runner
   * @param newTestRunnner
   */
	setTestRunner(newTestRunnner: string) {
		console.log('Setting Test Runner to ' + newTestRunnner);
		this.setEmulatorEnabled(false);
		this.testRunner = newTestRunnner;
	}

	/**
   *  Check for global settings
   */
	checkGlobalSettings() {
		this.repoId = localStorage.getItem('id')!;
		this.projectService.getRepositorySettings(this.repoId).subscribe({
			next: (settings) => {
				this.repoSettings = settings;
				if (settings && settings?.activated) {
					this.globalSettingsActivated = true;
					if (settings.testRunner) 
						this.testRunner = settings.testRunner;
          
				} else 
					this.globalSettingsActivated = false;
        
			},
			error: (err) => {
				console.error('Fehler beim Abrufen der Repository Settings:', err);
				this.globalSettingsActivated = false;
			}
		});
	}

	/**
   * Opens Modal to edit the workgroup
   * @param project
   */
	workGroupEdit(project: RepositoryContainer) {
		this.workgroupEditModal.openWorkgroupEditModal(
			project,
			this.email,
			this.id
		);
	}

	/**
   * Fills user data to change global settings
   */
	setUserData() {
		this.managmentService.getUserData().subscribe((user) => {
			this.id = user._id!;
			if (typeof user['email'] !== 'undefined') 
				this.email = user['email'];
      
		});
	}

	/**
   * Triggered if global settings are changed in workgroup-edit component
   */
	updateGlobalSettings(newSettings: boolean) {
		this.globalSettingsActivated = newSettings;
	}

	// ------------------------------- EMULATOR --------------------------------

	/**
   * Boolean emulator indicator
   */
	emulator_enabled: any;

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
		this.selectedScenario.saved = false;
	}

	/**
   * Set the emulator
   * @param newEmultaor
   */
	setEmulator(newEmulator: string | undefined) {
		this.selectedScenario.emulator = newEmulator;
		this.selectedScenario.saved = false;
	}

	/**
   * Get the avaiable emulators
   */
	getAvaiableEmulators() {
		if (this.testRunner === 'playwright') 
			return this.playwright_emulators;
    

		// Bestehende Logik für Selenium
		switch (this.selectedScenario.browser) {
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
		this.showResults = !this.showResults;
	}

	/**
   * If the story is saved
   * @returns
   */

	storySaved() {
		return (
			this.runUnsaved ||
      ((this.scenarioChild.selectedScenario.saved === undefined ||
        this.scenarioChild.selectedScenario.saved) &&
        (this.selectedStory.background.saved === undefined ||
          this.selectedStory.background.saved))
		);
	}

	/**
   * Mark the report as not saved
   * @param reportId
   * @returns
   */

	unsaveReport(reportId: any) {
		this.reportIsSaved = false;
		return new Promise<void>((resolve, _reject) => {
			this.reportService.unsaveReport(reportId).subscribe((_resp) => {
				resolve();
			});
		});
	}

	/**
   * Mark the report as saved
   * @param reportId
   * @returns
   */

	saveReport(reportId: any) {
		this.reportIsSaved = true;
		return new Promise<void>((resolve, _reject) => {
			this.reportService.saveReport(reportId).subscribe((_resp) => {
				resolve();
			});
		});
	}

	/**
   * Opens the Modal to rename the story
   * @param newStoryTitle
   */
	changeStoryTitle() {
		this.renameStoryModal.openRenameStoryModal(
			this.stories,
			this.selectedStory
		);
	}

	/**
   * Renames the story
   * @param newStoryTitle
   * @param newStoryDescription
   */
	renameStory(newStoryTitle: string, newStoryDescription: string) {
		if (newStoryTitle && newStoryTitle.replace(/\s/g, '').length > 0) 
			this.selectedStory.title = newStoryTitle;
    
		if (
			newStoryDescription &&
      newStoryDescription.replace(/\s/g, '').length > 0
		) 
			this.selectedStory.body = newStoryDescription;
    
		this.updateStory();
	}

	renameBackground(newBackgroundName: string) {
		this.selectedStory.background.name = newBackgroundName;
	}

	/**
   * Updates the story
   *
   */
	updateStory() {
		this.storyService.updateStory(this.selectedStory).subscribe((_resp) => {
			this.notify.success('successfully saved', 'Story');
		});
	}

	storyLink() {
		return (
			'https://' +
      window.location.hostname +
      ':' +
      window.location.port +
      '/story/' +
      this.selectedStory._id
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
		const id = this.selectedStory._id!;
		this.storyService.downloadStoryFeatureFile(id).subscribe((ret) => {
			saveAs(
				ret,
				this.selectedStory.title + this.selectedStory._id + '.feature'
			);
		});
	}

	/**
   * Emitts the delete story event
   * TODO: Currently not in use
   */
	deleteStory() {
		this.deleteStoryEvent.emit(this.selectedStory);
	}

	/**
   * Removes the selected story
   */
	storyDeleted() {
		if (this.stories.find((x) => x === this.selectedStory)) 
			this.stories.splice(
				this.stories.findIndex((x) => x === this.selectedStory),
				1
			);
    
	}

	/**
   * Opens modal to rename background
   */
	changeBackgroundTitle() {
		const background = this.selectedStory.background;
		let storiesWithBlock;
		const blockToRename = this.blocks.find(
			(b) => b.isBackground && b.name === this.selectedStory.background.name
		);
		if (blockToRename) 
			storiesWithBlock = this.stories.filter(
				(s) => s !== null && s.background.name == blockToRename.name
			);
    
		this.renameBackgroundModal.openRenameBackgroundModal(
			this.backgrounds,
			background,
			this.selectedStory,
			this.saveBackgroundAndRun,
			blockToRename!,
			storiesWithBlock!
		);
	}

	toTicket(issue_number: string) {
		const host = this.selectedStory.host;
		const url = `https://${host}/browse/${issue_number}`;
		window.open(url, '_blank');
	}

	/**
   * Selects a new Story and with it a new scenario
   * @param story
   */
	selectStoryScenario(story: Story) {
		this.selectedStory = story;
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
		this.backgroundService.backgroundReplaced = undefined as any;
	}

	openCreateScenario() {
		this.createScenarioModal.openCreateScenarioModal(this.selectedStory);
	}

	initialyAddIsExample() {
		this.selectedStory.scenarios.forEach((scenario) => {
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
		if (this.isReviewingAi) 
			this.exitAiReviewMode();
    

		if (!this.selectedStory || !this.selectedStory._id) {
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

		if (!this.selectedStory.body) {
			// || !this.selectedStory.sourceSteps? include when sourceSteps merged
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

		const storyId = this.selectedStory._id!;
		const repoId = this.selectedRepository._id!;
		const storyTitle = this.selectedStory.title;
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
					next: (response) => {
						console.log('AI job successfully queued:', response.message);
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
								this.storyService
									.getStory(result.storyId)
									.subscribe((updatedStoryWithSuggestion) => {
										this.updateLocalStoryState(
											result.storyId,
											updatedStoryWithSuggestion
										);
										this.aiSuggestions.set(
											storyId,
											updatedStoryWithSuggestion.aiSuggestion
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
												if (this.selectedStory._id !== result.storyId) {
													const storyToReview = this.stories.find(
														(s) => s._id === result.storyId
													);
													if (storyToReview) {
														this.storyChosen.emit(storyToReview);
														setTimeout(() => this.enterAiReviewMode(), 50);
													}
												} else 
													this.enterAiReviewMode();
                      
											});
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
		if (!this.aiSuggestions.has(this.selectedStory._id!)) {
			this.notify.info('No AI suggestion available for this story.');
			return;
		}

		// Fetch the full suggestion from the backend
		this.storyService
			.getStory(this.selectedStory._id!)
			.subscribe((fullStory) => {
				const suggestion = fullStory.aiSuggestion;
				this.initializeIsExampleForStory(suggestion);

				this.aiSuggestions.set(this.selectedStory._id!, suggestion);
				this.isReviewingAi = true;
				this.reviewModeChanged.emit(true);

				const suggestionScenarios = suggestion?.scenarios;
				if (suggestionScenarios && suggestionScenarios.length > 0) 
					this.selectScenario(suggestionScenarios[0]);
				else 
					this.selectScenario(null);
        
			});
	}

	/**
   * Exits the AI review mode and resets the UI to a consistent state.
   * Can optionally update the story with new data.
   * @param updatedStory - The updated story object from the server, if available.
   */
	exitAiReviewMode(updatedStory?: Story) {
		this.isReviewingAi = false;
		this.reviewModeChanged.emit(false);

		// If a story was updated (meaning a merge or discard happened),
		// update the local state and remove the suggestion from the map.
		if (updatedStory) {
			this.selectedStory = updatedStory;
			const index = this.stories.findIndex((s) => s._id === updatedStory._id);
			if (index > -1) 
				this.stories[index] = updatedStory;
      
			this.aiSuggestions.delete(this.selectedStory._id!);
			this.storyService.getStoriesEvent.emit(this.stories);
		}

		// Always restore the view to the first original scenario.
		if (
			this.selectedStory.scenarios &&
      this.selectedStory.scenarios.length > 0
		) 
			this.selectScenario(this.selectedStory.scenarios[0]);
		else 
			this.selectScenario(null);
    
	}

	/**
   * Discards the current AI suggestion.
   */
	discardAiSuggestion() {
		this.selectedStory.aiSuggestion = undefined;

		this.storyService.updateStory(this.selectedStory).subscribe(updatedStory => {
			this.notify.info('AI suggestion discarded.');
			this.exitAiReviewMode(updatedStory);
		});
	}

	/**
   * Merges the AI suggestion with the existing scenarios.
   * @param overwrite If true, replaces existing scenarios. If false, appends them.
   */
	mergeAiSuggestion(overwrite: boolean) {
		const suggestion = this.aiSuggestions.get(this.selectedStory._id!);
		if (!suggestion || !suggestion.scenarios) return;

		let combinedScenarios: Scenario[];

		if (overwrite) 
			combinedScenarios = suggestion.scenarios;
		else 
			combinedScenarios = [...this.selectedStory.scenarios, ...suggestion.scenarios];
    

		combinedScenarios.forEach((scenario, index) => {
			scenario.scenario_id = index + 1;
		});

		this.selectedStory.scenarios = combinedScenarios;
		this.selectedStory.aiSuggestion = undefined; // Also clear it on the object

		// Save the updated story
		this.storyService
			.updateStory(this.selectedStory)
			.subscribe((updatedStory) => {
				this.notify.success(
					'AI scenarios have been saved to the story!',
					'Saved'
				);
				this.exitAiReviewMode(updatedStory);
			});
	}

	/**
 * Updates the story in the local `stories` array and sets it as `selectedStory` if it's currently active.
 * @param storyId The ID of the story to update.
 * @param updatedStory The new story object.
 */
	private updateLocalStoryState(storyId: string, updatedStory: Story) {
		const index = this.stories.findIndex(s => s._id === storyId);
		if (index > -1) {
			this.stories[index] = updatedStory;
			this.storyService.getStoriesEvent.emit([...this.stories]); 
		}
    
		// If the updated story is the one currently being viewed, refresh it
		if (this.selectedStory._id === storyId) {
			this.selectedStory = updatedStory;

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
	private initializeIsExampleForStory(story: Story | any) {
		if (!story || !story.scenarios) 
			return;
    

		story.scenarios.forEach((scenario: any) => {
			if (!scenario || !scenario.stepDefinitions)
				return;


			const stepTypes: ('given' | 'when' | 'then')[] = [
				'given',
				'when',
				'then'
			];

			for (const stepType of stepTypes)
				if (scenario.stepDefinitions[stepType])
					scenario.stepDefinitions[stepType].forEach((step: any) => {
						if (step && step.values) {
							if (
								!step.isExample ||
                step.isExample.length !== step.values.length
							)
								step.isExample = new Array(step.values.length).fill(false);

							step.values.forEach((val: any, i: number) => {
								step.isExample[i] =
									typeof val === 'string' &&
                  val.startsWith('<') &&
                  val.endsWith('>');
							});
						}
					});
        
      
		});
	}
}
