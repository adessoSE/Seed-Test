import {Component, OnInit, Input, ViewChild, DoCheck, EventEmitter, Output, OnDestroy} from '@angular/core';
import { ApiService } from '../Services/api.service';
import { StepDefinition } from '../model/StepDefinition';
import { Story } from '../model/Story';
import { Scenario } from '../model/Scenario';
import { StepDefinitionBackground } from '../model/StepDefinitionBackground';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { StepType } from '../model/StepType';
import { Background } from '../model/Background';
import { ToastrService } from 'ngx-toastr';
import { RunTestToast } from '../runSave-toast';
import { DeleteScenarioToast } from '../deleteScenario-toast';
import { Block } from '../model/Block';
import { saveAs } from 'file-saver';
import { DeleteStoryToast } from '../deleteStory-toast';
import { ThemingService } from '../Services/theming.service';
import { RenameStoryComponent } from '../modals/rename-story/rename-story.component';
import { SaveBlockFormComponent } from '../modals/save-block-form/save-block-form.component';
import { AddBlockFormComponent } from '../modals/add-block-form/add-block-form.component';
import { Subscription } from 'rxjs';
import { CreateScenarioComponent } from '../modals/create-scenario/create-scenario.component';

/**
 * Empty background
 */
const emptyBackground: Background = {stepDefinitions: {when: []}};

/**
 * Component for the Story editor
 */
@Component({
  selector: 'app-story-editor',
  templateUrl: './story-editor.component.html',
  styleUrls: ['./story-editor.component.css']
})
export class StoryEditorComponent implements OnInit, OnDestroy, DoCheck {

  /**
   * set new currently selected scenario
   */
  @Input()
  set newSelectedScenario(scenario: Scenario) {
      this.selectedScenario = scenario;
      if (this.selectedStory) {
          this.selectScenario(scenario);
      }
      this.activeActionBar = false;
      this.allChecked = false;
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
      this.activeActionBar = false;
      this.allChecked = false;
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
     * If the action bar is active
     */
    activeActionBar = false;

    /**
     * If all steps are checked
     */
    allChecked = false;

    /**
     * if the background should be saved and then the test run
     */
    saveBackgroundAndRun = false;

    /**
     * Block saved to clipboard
     */
    clipboardBlock: Block = null;

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
     * Subscribtions for all EventEmitter
     */
    deleteStoryObservable: Subscription;
    storiesErrorObservable: Subscription;
    deleteScenarioObservable: Subscription;
    runSaveOptionObservable: Subscription;
    addBlocktoScenarioObservable: Subscription;
    renameStoryObservable: Subscription;
    themeObservable: Subscription;
    getBackendUrlObservable: Subscription;
    getStoriesObservable: Subscription;

    @Input() isDark: boolean;

    /**
     * View child of the scenario editor
     */
    @ViewChild('scenarioChild') scenarioChild;

    /**
     * View child of the modals component
     */
    @ViewChild('renameStoryModal') renameStoryModal: RenameStoryComponent;
    @ViewChild('saveBlockModal') saveBlockModal: SaveBlockFormComponent;
    @ViewChild('addBlockModal')addBlockModal: AddBlockFormComponent;
    @ViewChild('createScenarioForm') createScenarioForm: CreateScenarioComponent;

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
        private toastr: ToastrService,
        public themeService: ThemingService
    ) {

        if (this.apiService.urlReceived) {
            this.loadStepTypes();
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
    }

    /**
     * retrieves the saved block from the session storage
     */
    ngDoCheck(): void {
          this.clipboardBlock = JSON.parse(sessionStorage.getItem('copiedBlock'));
    }

    ngAfterViewChecked(){
        /**
         * when loading for group is displayed scroll to it
         */
        if (this.testRunningGroup === true){
            const loadingScreen = document.getElementById('loading');
            loadingScreen.scrollIntoView();}

    }

    /**
     * Subscribes to all necessary events
     */
    ngOnInit() {
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

        this.storiesErrorObservable = this.apiService.storiesErrorEvent.subscribe(errorCode => {
            this.storiesError = true;
            this.showEditor = false;

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

        this.addBlocktoScenarioObservable = this.apiService.addBlockToScenarioEvent.subscribe(block => {
            if (block[0] === 'background') {
                block = block[1];
                Object.keys(block.stepDefinitions).forEach((key, index) => {
                    if (key === 'when') {
                        block.stepDefinitions[key].forEach((step: StepType) => {
                        this.selectedStory.background.stepDefinitions[key].push(JSON.parse(JSON.stringify(step)));
                        });
                    }
                });
                this.selectedStory.background.saved = false;
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
        if (!this.addBlocktoScenarioObservable.closed) {
            this.addBlocktoScenarioObservable.unsubscribe();
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
    }

    /**
     * Opens add block modal
     * @param event
     */
    addBlock(event) {
        this.addBlockModal.openAddBlockFormModal('background', localStorage.getItem('id'));
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
      this.activeActionBar = false;
      this.allChecked = false;
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

    setOneDriver(event) {
        this.apiService
        .changeOneDriver(this.selectedStory.oneDriver, this.selectedStory._id)
        .subscribe((resp: any) => {
            this.selectedStory = resp;
        });
    }

    /**
     * Checks all check boxes or unchecks
     * @param event
     * @param checkValue
     */
    checkAllSteps(event, checkValue: boolean) {
        if (checkValue != null) {
            this.allChecked = checkValue;
        } else {
            this.allChecked = !this.allChecked;
        }
        if (this.allChecked) {
            for (const prop in this.selectedStory.background.stepDefinitions) {
                for (let i = this.selectedStory.background.stepDefinitions[prop].length - 1; i >= 0; i--) {
                    this.checkStep(null, this.selectedStory.background.stepDefinitions[prop][i], true);
                }
            }
            this.activeActionBar = true;
            this.allChecked = true;
        } else {
            for (const prop in this.selectedStory.background.stepDefinitions) {
                for (let i = this.selectedStory.background.stepDefinitions[prop].length - 1; i >= 0; i--) {
                    this.checkStep(null, this.selectedStory.background.stepDefinitions[prop][i], false);
                }
            }
            this.activeActionBar = false;
            this.allChecked = false;
        }
    }

    /**
     * Checks one step in the checkbox
     * @param event
     * @param step
     * @param checkValue
     */
    checkStep(event, step, checkValue: boolean) {
        if (checkValue != null) {
            step.checked = checkValue;
        } else {
            step.checked = !step.checked;
        }
        let checkCount = 0;
        let stepCount = 0;

        for (const prop in this.selectedStory.background.stepDefinitions) {
            for (let i = this.selectedStory.background.stepDefinitions[prop].length - 1; i >= 0; i--) {
                stepCount++;
                if (this.selectedStory.background.stepDefinitions[prop][i].checked) {
                    checkCount++;
                }
            }
        }
        this.allChecked = checkCount >= stepCount;
        if (checkCount <= 0) {
            this.allChecked = false;
            this.activeActionBar = false;
        } else {
            this.activeActionBar = true;
        }
    }

    /**
     * Removes a step from the background
     */
    removeStepFromBackground() {
        for (const prop in this.selectedStory.background.stepDefinitions) {
            for (let i = this.selectedStory.background.stepDefinitions[prop].length - 1; i >= 0; i--) {
                if (this.selectedStory.background.stepDefinitions[prop][i].checked) {
                    this.selectedStory.background.stepDefinitions[prop].splice(i, 1);
                }
            }
        }
        this.selectedStory.background.saved = false;
        this.allChecked = false;
        this.activeActionBar = false;
    }

    /**
     * Deactivates all checked steps
     */
    deactivateStep() {
        for (const prop in this.selectedStory.background.stepDefinitions) {
            for (const s in this.selectedStory.background.stepDefinitions[prop]) {
                if (this.selectedStory.background.stepDefinitions[prop][s].checked) {
                    this.selectedStory.background.stepDefinitions[prop][s].deactivated = !this.selectedStory.background.stepDefinitions[prop][s].deactivated;
                }
            }
        }
        this.selectedStory.background.saved = false;
    }


  /**
   * Opens the delete scenario toast
   * @param scenario
   */
  showDeleteScenarioToast(scenario: Scenario) {
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
        .subscribe(resp => {
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
   * Drag and drop event in the background
   * @param event
   * @param stepDefs
   */
  onDropBackground(event: CdkDragDrop<any>, stepDefs: StepDefinition) {
      moveItemInArray(this.getBackgroundList(stepDefs), event.previousIndex, event.currentIndex);
      this.selectedStory.background.saved = false;
  }

  /**
   * Gets background step list
   * @param stepDefinitions
   * @returns
   */
  getBackgroundList(stepDefinitions: StepDefinitionBackground) {
      return stepDefinitions.when;
  }

  /**
   * changes the name of the background
   * @param name
   */
  backgroundNameChange(name: string) {
      this.selectedStory.background.name = name;
  }

  /**
   * updates the background
   */
  updateBackground() {
    delete this.selectedStory.background.saved;
    this.allChecked = false;
    this.activeActionBar = false;

    Object.keys(this.selectedStory.background.stepDefinitions).forEach((key, index) => {
        this.selectedStory.background.stepDefinitions[key].forEach((step: StepType) => {
            delete step.checked;
            if (step.outdated) {
                step.outdated = false;
            }
        });
    });
      this.apiService
          .updateBackground(this.selectedStory._id, this.selectedStory.storySource, this.selectedStory.background)
          .subscribe(resp => {
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
          .deleteBackground(this.selectedStory.story_id, this.selectedStory.storySource)
          .subscribe(resp => {
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
   * Adds a step to the background
   * @param storyID
   * @param step
   */
  addStepToBackground(storyID: string, step: StepType) {
      const newStep = this.createNewStep(step, this.selectedStory.background.stepDefinitions);
      if (newStep.stepType == 'when') {
          this.selectedStory.background.stepDefinitions.when.push(newStep);
      }
      this.selectedStory.background.saved = false;
  }

  /**
   * Creates a new step
   * @param step
   * @param stepDefinitions
   * @returns
   */
  createNewStep(step: StepType, stepDefinitions: StepDefinitionBackground): StepType {
      const obj = JSON.parse(JSON.stringify(step));
      const newId = this.getLastIDinStep(stepDefinitions, obj.stepType) + 1;
      const newStep: StepType = {
          id: newId,
          mid: obj.mid,
          pre: obj.pre,
          post: obj.post,
          stepType: obj.stepType,
          type: obj.type,
          values: obj.values
      };
      return newStep;
  }

  /**
   * Gets the last id in the steps
   * @param stepDefs
   * @param stepStepType
   * @returns
   */
  getLastIDinStep(stepDefs: any, stepStepType: string): number {
      switch (stepStepType) {
          case 'given':
              return this.buildID(stepDefs.given);
          case 'when':
              return this.buildID(stepDefs.when);
          case 'then':
              return this.buildID(stepDefs.then);
          case 'example':
              return this.buildID(stepDefs.example);
      }
  }

  /**
   * gets the id of the step
   * @param step
   * @returns
   */
  buildID(step): number {
      if (step.length !== 0) {
          return step[step.length - 1].id;
      } else {
          return 0;
      }
  }

  /**
   * add values to the background steps
   * @param input
   * @param stepIndex
   * @param valueIndex
   */
  addToValuesBackground(input: string, stepIndex: number, valueIndex: number) {
      this.selectedStory.background.stepDefinitions.when[stepIndex].values[valueIndex] = input;
      this.selectedStory.background.saved = false;
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
     * Save the block background
     * @param event
     */
    saveBlockBackground(event) {
        const saveBlock: any = {when: []};
        for (const prop in this.selectedStory.background.stepDefinitions) {
            for (const s in this.selectedStory.background.stepDefinitions[prop]) {
               if (this.selectedStory.background.stepDefinitions[prop][s].checked) {
                   saveBlock[prop].push(this.selectedStory.background.stepDefinitions[prop][s]);
               }
            }
        }

        const block: Block = {name: 'TEST', stepDefinitions: saveBlock};
        this.saveBlockModal.openSaveBlockFormModal(block, this);
    }

    /**
     * Copy a block
     */
    copyBlock() {
        const copyBlock: any = {given: [], when: [], then: [], example: []};
        for (const prop in this.selectedStory.background.stepDefinitions) {
            if (prop !== 'example') {
                for (const s in this.selectedStory.background.stepDefinitions[prop]) {
                    if (this.selectedStory.background.stepDefinitions[prop][s].checked) {
                        this.selectedStory.background.stepDefinitions[prop][s].checked = false;
                        copyBlock[prop].push(this.selectedStory.background.stepDefinitions[prop][s]);
                    }
                }
            }
        }
        const block: Block = {stepDefinitions: copyBlock};
        sessionStorage.setItem('copiedBlock', JSON.stringify(block));
        this.allChecked = false;
        this.activeActionBar = false;
    }

    /**
     * Insert a block to the background
     */
    insertCopiedBlock() {
        Object.keys(this.clipboardBlock.stepDefinitions).forEach((key, index) => {
            this.clipboardBlock.stepDefinitions[key].forEach((step: StepType, j) => {
                this.selectedStory.background.stepDefinitions[key].push(JSON.parse(JSON.stringify(step)));
            });
        });
          this.selectedScenario.saved = false;
    }


    /**
     * Make the API Request to run the tests and display the results as a chart
     * @param scenario_id
     */
    runTests(scenario_id) {
        if (this.storySaved()) {
            this.testRunning = true;
            this.report.emit(false);
            const iframe: HTMLIFrameElement = document.getElementById('testFrame') as HTMLIFrameElement;
            const loadingScreen: HTMLElement = document.getElementById('loading');
            const browserSelect = (document.getElementById('browserSelect') as HTMLSelectElement).value;
            // are these values already saved in the Scenario / Story?
            // const defaultWaitTimeInput = (document.getElementById('defaultWaitTimeInput') as HTMLSelectElement).value;
            // const daisyAutoLogout = (document.getElementById('daisyAutoLogout') as HTMLSelectElement).value;
            loadingScreen.scrollIntoView();
            /*this.apiService
                .runTests(this.selectedStory._id, this.selectedStory.storySource, scenario_id,
                    {browser: browserSelect,
                        repository: localStorage.getItem('repository'),
                        source: localStorage.getItem('source'),
                        oneDriver: this.selectedStory.oneDriver
                    })
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
                            const val = report.scenarioStatuses.status;
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
                });*/
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
    setStepWaitTime(event, newTime) {
        if (this.selectedScenario) {
            this.selectedScenario.stepWaitTime = newTime;
            this.selectedScenario.saved = false;
        }
    }

    /**
     * Set the browser
     * @param event
     * @param newBrowser
     */
    setBrowser(event, newBrowser) {
        this.selectedScenario.browser = newBrowser;
        this.selectedScenario.saved = false;
    }

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
   * sort the step types
   * @returns
   */
    sortedStepTypes() {
        const sortedStepTypes = this.originalStepTypes;
        sortedStepTypes.sort((a, b) => {
            return a.id - b.id;
        });
        return sortedStepTypes;
    }

 /**
  * Mark the report as not saved
  * @param reportId
  * @returns
  */
    unsaveReport(reportId) {
        this.reportIsSaved = false;
        return new Promise<void>((resolve, reject) => {this.apiService
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
        return new Promise<void>((resolve, reject) => {this.apiService
        .saveReport(reportId)
      . subscribe(_resp => {
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
        return window.location.hostname + ':' + window.location.port + '/story/' + this.selectedStory._id;
    }

    showStoryLinkToast() {
        this.toastr.success('', 'Successfully added Link to Clipboard!');
    }

  /**
   * Opens the delete story toast
   * @param story
   */
    showDeleteStoryToast(story: Story) {
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
     * @param event
     */
    deleteStory(event) {
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

}

