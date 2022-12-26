import { Router } from '@angular/router';
import {Component, OnInit, Input, ViewChild, EventEmitter, Output, OnDestroy} from '@angular/core';
import { ApiService } from '../Services/api.service';
import { Story } from '../model/Story';
import { Scenario } from '../model/Scenario';
import { StepType } from '../model/StepType';
import { Background } from '../model/Background';
import { ToastrService } from 'ngx-toastr';
import { RunTestToast } from '../runSave-toast';
import { DeleteScenarioToast } from '../deleteScenario-toast';
import { saveAs } from 'file-saver';
import { DeleteStoryToast } from '../deleteStory-toast';
import { ThemingService } from '../Services/theming.service';
import { RenameStoryComponent } from '../modals/rename-story/rename-story.component';
import { Subscription } from 'rxjs';
import { CreateScenarioComponent } from '../modals/create-scenario/create-scenario.component';
import { RenameBackgroundComponent } from '../modals/rename-background/rename-background.component';


/**
 * Empty background
 */
const emptyBackground: Background = {name: 'New Background',stepDefinitions: {when: []}};

/**
 * Component for the Story editor
 */
@Component({
  selector: 'app-story-editor',
  templateUrl: './story-editor.component.html',
  styleUrls: ['../base-editor/base-editor.component.css','./story-editor.component.css']
})
export class StoryEditorComponent implements OnInit, OnDestroy {

  /**
   * set new currently selected scenario
   */
  @Input()
  set newSelectedScenario(scenario: Scenario) {
      this.selectedScenario = scenario;
      if (this.selectedStory) {
          this.selectScenario(scenario);
      }       
  }
    
  /**
    * set new stories
    */
  @Input()
  set newStories(stories: Story[]) {
      if (stories) {
            this.stories = stories;
        }    
    }

  /**
   * set new currently selected story
   */
  @Input()
  set newSelectedStory(story: Story) {
    this.selectedStory = story;
    this.showEditor = true;
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
  originalStepTypes: StepType[];

  /**
   * List of stories
   */
  stories: Story[];

  /**
   * Currently selected story
   */
  selectedStory: Story;

  /**
   * Currently selected scenario
   */
  selectedScenario: Scenario;

  /**
   * If the story editor should be shown
   */
  showEditor = false;

  /**
   * If the results should be shown
   */
  showResults = false;

  /**
   * If the description should be shown
   */
  showDescription = false;

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
  testRunningGroup: boolean;

  /**
   * html report of the result
   */
  htmlReport: BlobPart;

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
  currentTestStoryId: number;

  /**
   * id of the scenario which is currently getting tested
   */
  currentTestScenarioId: number;

    /**
     * if the background should be saved and then the test run
     */
    saveBackgroundAndRun = false;

  /**
   * if the daisy version is currently used
   */
  daisyVersion = false;

  /**
   * if the report is saved
   */
  reportIsSaved = false;

  /**
   * Object id of the current report
   */
  reportId;

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
  gecko_enabled;
  chromium_enabled;
  edge_enabled;

  lastToFocus;

  showDaisy = false;

  readonly TEMPLATE_NAME = 'background'

  /**
   * Subscribtions for all EventEmitter
   */
  deleteStoryObservable: Subscription;
  storiesErrorObservable: Subscription;
  deleteScenarioObservable: Subscription;
  runSaveOptionObservable: Subscription;
  renameStoryObservable: Subscription;
  themeObservable: Subscription;
  getBackendUrlObservable: Subscription;
  getStoriesObservable: Subscription;
  renameBackgroundObservable: Subscription;

  @Input() isDark: boolean;

  /**
   * View child of the scenario editor
   */
    @ViewChild('scenarioChild') scenarioChild;
  /**
   * View child of the modals component
   */
    @ViewChild('renameStoryModal') renameStoryModal: RenameStoryComponent; 
    @ViewChild('createScenarioForm') createScenarioForm: CreateScenarioComponent;
    @ViewChild('renameBackgroundModal') renameBackgroundModal: RenameBackgroundComponent;

  /**
   * Event emitter to change to the report history component
   */
  @Output()
  changeEditor: EventEmitter<any> = new EventEmitter();

  @Output()
  deleteStoryEvent: EventEmitter<any> = new EventEmitter();

  /**
   * Event emitter to show or hide global TestResult
   */
  @Output() report: EventEmitter<any> = new EventEmitter();

    /**
     * Stories bar component
     */
    constructor(
        public apiService: ApiService,
        public toastr: ToastrService,
        public themeService: ThemingService,
        public router: Router
    ) {
        if (this.apiService.urlReceived) {
            this.loadStepTypes();
        } else {
          this.apiService.getBackendInfo();
        }        
  
    if (this.selectedStory) {
      this.storiesLoaded = true;
      this.storiesError = false;
    }
        const version = localStorage.getItem('version');
        if (version === 'DAISY' || version === 'HEROKU' || !version) {
      this.daisyVersion = true;
    } else {
      this.daisyVersion = false;
    }

    this.gecko_enabled = localStorage.getItem("gecko_enabled");
    this.chromium_enabled = localStorage.getItem("chromium_enabled");
    this.edge_enabled = localStorage.getItem("edge_enabled");

    this.gecko_emulators = localStorage.getItem("gecko_emulators");
    this.gecko_emulators =
    this.gecko_emulators === "" ? [] : this.gecko_emulators.split(",");
    this.chromium_emulators = localStorage.getItem("chromium_emulators");
    this.chromium_emulators =
    this.chromium_emulators === "" ? [] : this.chromium_emulators.split(",");
    this.edge_emulators = localStorage.getItem("edge_emulators");
    this.edge_emulators =
    this.edge_emulators === "" ? [] : this.edge_emulators.split(",");
  }

    ngAfterViewChecked(){
    /**
     * when loading for group is displayed scroll to it
     */
      if (this.testRunningGroup === true){
        const loadingScreen = document.getElementById('loading');
        loadingScreen.scrollIntoView();
    }
  }

  /**
   * Subscribes to all necessary events
   */
  ngOnInit() {

    // in event that stories are already loaded
        if(this.stories){
      this.storiesLoaded = true;
    }

        this.getStoriesObservable = this.apiService.getStoriesEvent.subscribe((stories: Story[]) => {
        this.storiesLoaded = true;
        this.storiesError = false;
        this.showEditor = false;
        this.setStories(stories);
            this.db = localStorage.getItem('source') === 'db' ;
        });

        this.deleteStoryObservable = this.apiService.deleteStoryEvent.subscribe(() => {
        this.showEditor = false;
        this.storyDeleted();
        });

        this.storiesErrorObservable = this.apiService.storiesErrorEvent.subscribe(_ => {
        this.storiesError = true;
        this.showEditor = false;

        window.localStorage.removeItem('login')
        this.router.navigate(['/login']);  
        });

        this.deleteScenarioObservable = this.apiService.deleteScenarioEvent.subscribe(() => {
        this.deleteScenario(this.selectedScenario);
      });

        this.runSaveOptionObservable = this.apiService.runSaveOptionEvent.subscribe(option => {
            if (option === 'run') {
          this.runUnsaved = true;
          this.runOption();
        }
            if (option === 'saveRun') {
          this.saveBackgroundAndRun = true;
          this.updateBackground();
        }
          });

        this.renameStoryObservable = this.apiService.renameStoryEvent.subscribe((changedValues) =>
            this.renameStory(changedValues.newStoryTitle, changedValues.newStoryDescription));
            this.isDark = this.themeService.isDarkMode();
        this.themeObservable = this.themeService.themeChanged.subscribe(() => {
            this.isDark = this.themeService.isDarkMode();
        });

        this.getBackendUrlObservable = this.apiService.getBackendUrlEvent.subscribe(() => {       
          this.loadStepTypes();
        }); 

        this.renameBackgroundObservable = this.apiService.renameBackgroundEvent.subscribe((newName) => {
        this.renameBackground(newName);
      });     
  }

    ngOnDestroy() {
        if (!this.deleteStoryObservable.closed) {
            this.deleteStoryObservable.unsubscribe();
        }
        if (!this.storiesErrorObservable.closed) {
            this.storiesErrorObservable.unsubscribe();
        }
        if (!this.deleteScenarioObservable.closed) {
            this.deleteScenarioObservable.unsubscribe();
        }
        if (!this.runSaveOptionObservable.closed) {
            this.runSaveOptionObservable.unsubscribe();
        }

        if (!this.renameStoryObservable.closed) {
            this.renameStoryObservable.unsubscribe();
        }
        if (!this.themeObservable.closed) {
            this.themeObservable.unsubscribe();
        }
        if (!this.getBackendUrlObservable.closed) {
            this.getBackendUrlObservable.unsubscribe();
        }
        if (!this.getStoriesObservable.closed) {
            this.getStoriesObservable.unsubscribe();
        }
        if (!this.renameBackgroundObservable.closed) {
            this.renameBackgroundObservable.unsubscribe();
        }
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
     * @param scenario
     */
    selectNewScenario(scenario: Scenario) {
      this.selectedScenario = scenario;
      if (this.selectedStory) {
          this.selectScenario(scenario);
      }
    }

  /**
   * Change to the report history component
   */
  openReportHistory() {
    this.changeEditor.emit();
  }

  /**
   * load the step types
   */
  loadStepTypes() {
        this.apiService
            .getStepTypes()
            .subscribe((resp: StepType[]) => {
      this.originalStepTypes = resp;
    });
  }

  setOneDriver() {
    this.apiService
      .changeOneDriver(this.selectedStory.oneDriver, this.selectedStory._id)
      .subscribe((resp: any) => {
        this.selectedStory = resp;
      });
  }


  /**
   * Opens the delete scenario toast
   * @param scenario
   */
  showDeleteScenarioToast() {
        this.toastr.warning('', 'Do you really want to delete this scenario?', {
            toastComponent: DeleteScenarioToast
    });
  }

  /**
   * Deletes scenario
   * @param scenario
   */
  deleteScenario(scenario: Scenario) {
    this.apiService
            .deleteScenario(this.selectedStory._id, this.selectedStory.storySource, scenario)
            .subscribe(_ => {
        this.scenarioDeleted();
                this.toastr.error('', 'Scenario deleted');
      });
  }

  /**
   * Removes scenario from the selected story
   */
  scenarioDeleted() {
        const indexScenario: number = this.selectedStory.scenarios.indexOf(this.selectedScenario);
    if (indexScenario !== -1) {
      this.selectedStory.scenarios.splice(indexScenario, 1);
    }
    this.showEditor = false;
  }

  /**
   * Adds a scenario to story
   */
  addScenario(event) {
    const scenarioName = event;
        this.apiService.addScenario(this.selectedStory._id, this.selectedStory.storySource, scenarioName)
      .subscribe((resp: Scenario) => {
        this.selectScenario(resp);
        this.selectedStory.scenarios.push(resp);
            this.toastr.info('', 'Scenario added');
      });
  }

    

    /**
     * updates the background
     */
    updateBackground() {
        delete this.selectedStory.background.saved;

        Object.keys(this.selectedStory.background.stepDefinitions).forEach((key, _) => {
            this.selectedStory.background.stepDefinitions[key].forEach((step: StepType) => {
            delete step.checked;
            if (step.outdated) {
              step.outdated = false;
            }
            });
        });
    this.apiService
            .updateBackground(this.selectedStory._id, this.selectedStory.storySource, this.selectedStory.background)
            .subscribe(_ => {
                this.apiService.backgroundChangedEmitter();
                this.toastr.success('successfully saved', 'Background');
        if (this.saveBackgroundAndRun) {
                    this.apiService.runSaveOption('saveScenario');
          this.saveBackgroundAndRun = false;
        }
      });
  }

  /**
   * deletes the background
   */
  deleteBackground() {
    this.apiService
      .deleteBackground(this.selectedStory._id, this.selectedStory.storySource)
          .subscribe(_ => {
        this.showBackground = false;
        this.selectedStory.background = emptyBackground;
        this.selectedStory.background.saved = false;
      });
  }

    /**
     * Opens the background
     */
    openBackground() {
      this.showBackground = !this.showBackground;
    }

  /**
   * Select a scenario
   * @param scenario
   */

  selectScenario(scenario: Scenario) {
    this.selectedScenario = scenario;
    this.showResults = false;
    this.showEditor = true;
    this.testDone = false;
    this.emulator_enabled = false;

    if (scenario.emulator) this.emulator_enabled = true 
    // nicht besser als wenn man im html entweder oder macht (267)
    if (!scenario.browser) this.selectedScenario.browser = 'chrome'    
  }

  /**
   * Selects a story and scenario
   * @param story
   */
	selectStoryScenario(story: Story) {
		this.showResults = false;
		this.selectedStory = story;
		this.showEditor = true;
		const storyIndex = this.stories.indexOf(this.selectedStory);
		if (this.stories[storyIndex].scenarios[0] !== undefined) {
			this.selectScenario(this.stories[storyIndex].scenarios[0]);
		}
	}

  /**
   * Make the API Request to run the tests and display the results as a chart
   * @param scenario_id
   */
  runTests(scenario_id) {
    if (this.storySaved()) {
      this.testRunning = true;
      this.report.emit(false);
      const iframe: HTMLIFrameElement = document.getElementById(
        "testFrame"
      ) as HTMLIFrameElement;
      const loadingScreen: HTMLElement = document.getElementById("loading");
      const browserSelect = (
        document.getElementById("browserSelect") as HTMLSelectElement
      ).value;

      const emulatorSelect = document.getElementById(
        "emulatorSelect"
      ) as HTMLSelectElement;
      const emulator =
        emulatorSelect === null ? undefined : emulatorSelect.value;

      // are these values already saved in the Scenario / Story?
      // const defaultWaitTimeInput = (document.getElementById('defaultWaitTimeInput') as HTMLSelectElement).value;
      // const daisyAutoLogout = (document.getElementById('daisyAutoLogout') as HTMLSelectElement).value;
      loadingScreen.scrollIntoView();
      this.apiService
        .runTests(
          this.selectedStory._id,
          this.selectedStory.storySource,
          scenario_id,
          {
            browser: browserSelect,
            emulator: emulator,
            repository: localStorage.getItem("repository"),
            source: localStorage.getItem("source"),
            oneDriver: this.selectedStory.oneDriver,
          }
        )
        .subscribe((resp: any) => {
          this.reportId = resp.reportId;
          iframe.srcdoc = resp.htmlFile;
          this.htmlReport = resp.htmlFile;
          this.testDone = true;
          this.showResults = true;
          this.testRunning = false;
          setTimeout(function () {
            iframe.scrollIntoView();
          }, 10);
								this.toastr.info('', 'Test is done');
          this.runUnsaved = false;
								this.apiService.getReport(this.reportId)
									.subscribe((report: any) => {
            if (scenario_id) {
              // ScenarioReport
              const val = report.status;
              this.apiService.scenarioStatusChangeEmit(this.selectedStory._id, scenario_id, val);
            } else {
              // StoryReport
								report.scenarioStatuses.forEach(scenario => {
                  this.apiService.scenarioStatusChangeEmit(
                    this.selectedStory._id, scenario.scenarioId, scenario.status);
              });
            }
          });
          // OLD VERSION:
          // this.apiService.getStory(this.selectedStory._id, this.selectedStory.storySource)
          // .subscribe((story) => {
          //     if (scenario_id) {
          //         const val = story.scenarios.filter(scenario => scenario.scenario_id === scenario_id);
          //         this.apiService.scenarioStatusChangeEmit(this.selectedStory._id, scenario_id, val[0].lastTestPassed);
          //     } else {
          //       story.scenarios.forEach(scenario => {
          //             this.apiService.scenarioStatusChangeEmit(
          //               this.selectedStory._id, scenario.scenario_id, scenario.lastTestPassed);
          //         });
          //     }
          // });
        });
    } else {
      this.currentTestScenarioId = scenario_id;
      this.currentTestStoryId = this.selectedStory.story_id;
				this.toastr.info('Do you want to save before running the test?', 'Scenario was not saved', {
						toastComponent: RunTestToast
				});
		}
  }

    /**
     * Download the test report
     */
    downloadFile() {
        const blob = new Blob([this.htmlReport], {type: 'text/html'});
            saveAs(blob, this.selectedStory.title + '.html');
    }

  /**
   * Set the time to wait between the steps
   * @param event
   * @param newTime
   */
  setStepWaitTime(newTime) {
    if (this.selectedScenario) {
      this.selectedScenario.stepWaitTime = newTime;
      this.selectedScenario.saved = false;
    }
  }

  /**
   * Set the browser
   * @param newBrowser
   */
  setBrowser(newBrowser) {
    this.selectedScenario.browser = newBrowser;
    this.setEmulatorEnabled(false);
    this.selectedScenario.saved = false;
  }

  // ------------------------------- EMULATOR --------------------------------

  /**
   * Boolean emulator indicator
   */
  emulator_enabled;

  /**
   * List of supported emulators for gecko
   */
  gecko_emulators;

  /**
   * List of supported emulators for gecko
   */
  chromium_emulators;

  /**
   * List of supported emulators for gecko
   */
  edge_emulators;

  /**
   * Set if an emulator should be used
   * @param enabled Boolean
   */
  setEmulatorEnabled(enabled) {
    this.emulator_enabled = enabled;
    this.setEmulator(enabled ? this.getAvaiableEmulators()[0] : undefined)
    this.selectedScenario.saved = false;
  }

  /**
   * Set the emultaor
   * @param newEmultaor
   */
  setEmulator(newEmulator) {
    this.selectedScenario.emulator = newEmulator;
    this.selectedScenario.saved = false;
  }

  /**
   * Get the avaiable emulators
   */
  getAvaiableEmulators() {
    switch (this.selectedScenario.browser) {
      case "chrome":
        return this.chromium_emulators;
      case "firefox":
        return this.gecko_emulators;
      case "MicrosoftEdge":
        return this.edge_emulators;
    }
    return []
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
		return this.runUnsaved || ((this.scenarioChild.selectedScenario.saved === undefined || this.scenarioChild.selectedScenario.saved) && (this.selectedStory.background.saved === undefined || this.selectedStory.background.saved));
  }

  /**
   * Mark the report as not saved
   * @param reportId
   * @returns
   */

  unsaveReport(reportId) {
    this.reportIsSaved = false;
		return new Promise<void>((resolve, _reject) => {this.apiService
		.unsaveReport(reportId)
		.subscribe(_resp => {
        resolve();
		}); });
  }

  /**
   * Mark the report as saved
   * @param reportId
   * @returns
   */

  saveReport(reportId) {
    this.reportIsSaved = true;
		return new Promise<void>((resolve, _reject) => {this.apiService
		.saveReport(reportId)
		.subscribe(_resp => {
        resolve();
		}); });
  }

  /**
   * Opens the Modal to rename the story
   * @param newStoryTitle
   */
  changeStoryTitle() {
		this.renameStoryModal.openRenameStoryModal(this.stories, this.selectedStory);
  }

  /**
   * Renames the story
   * @param newStoryTitle
   * @param newStoryDescription
   */
  renameStory(newStoryTitle, newStoryDescription) {
		if (newStoryTitle && newStoryTitle.replace(/\s/g, '').length > 0) {
      this.selectedStory.title = newStoryTitle;
    }
		if (newStoryDescription && newStoryDescription.replace(/\s/g, '').length > 0) {
      this.selectedStory.body = newStoryDescription;
    }
    this.updateStory();
  }

	renameBackground(newBackgroundName) {
		this.selectedStory.background.name = newBackgroundName;
        this.selectedStory.background.saved = false;
	}
  
	/**
     * Updates the story
     *
     */
	updateStory() {
		{this.apiService
				.updateStory(this.selectedStory)
				.subscribe(_resp => {
						this.toastr.success('successfully saved', 'Story');
				}); }
  }

    storyLink() {
        return 'https://'+ window.location.hostname + ':' + window.location.port + '/story/' + this.selectedStory._id;
    }

    showStoryLinkToast() {
        this.toastr.success('', 'Successfully added Link to Clipboard!');
    }

  /**
   * Opens the delete story toast
   *
   */

  showDeleteStoryToast() {
		this.toastr.warning('', 'Do you really want to delete this story? It cannot be restored.', {
				toastComponent: DeleteStoryToast
		});
      }
    

  downloadFeature() {
    const source = this.selectedStory.storySource;
    const id = this.selectedStory._id;
		this.apiService.downloadStoryFeatureFile(source, id).subscribe(ret => {
				saveAs(ret, this.selectedStory.title + this.selectedStory._id  + '.feature');
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
		if (this.stories.find(x => x === this.selectedStory)) {
		this.stories.splice(this.stories.findIndex(x => x === this.selectedStory), 1);
    }
  }
  

  /**
   * Opens modal to rename background
   */
  changeBackgroundTitle() {
    const background_name = this.selectedStory.background.name;
    this.renameBackgroundModal.openRenameBackgroundModal(background_name);
  }

  setShowDaisy(event) {
    this.showDaisy = event;
  }

}
