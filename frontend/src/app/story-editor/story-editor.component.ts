import { Router } from "@angular/router";
import {
  Component,
  OnInit,
  Input,
  ViewChild,
  EventEmitter,
  Output,
  OnDestroy,
} from "@angular/core";
import { ApiService } from "../Services/api.service";
import { Story } from "../model/Story";
import { Scenario } from "../model/Scenario";
import { StepType } from "../model/StepType";
import { Background } from "../model/Background";
import { ToastrService } from "ngx-toastr";
import { DeleteToast } from "../delete-toast";
import { saveAs } from "file-saver";
import { ThemingService } from "../Services/theming.service";
import { RenameStoryComponent } from "../modals/rename-story/rename-story.component";
import { Subscription } from "rxjs";
import { CreateScenarioComponent } from "../modals/create-scenario/create-scenario.component";
import { RenameBackgroundComponent } from "../modals/rename-background/rename-background.component";
import { BackgroundService } from "../Services/background.service";
import { StoryService } from "../Services/story.service";
import { ScenarioService } from "../Services/scenario.service";
import { ReportService } from "../Services/report.service";
import { ProjectService } from "../Services/project.service";
import { LoginService } from "../Services/login.service";
import { RepositoryContainer } from "../model/RepositoryContainer";
import { SaveBlockFormComponent } from "../modals/save-block-form/save-block-form.component";
import { Block } from "../model/Block";
import { StepDefinition } from "../model/StepDefinition";
import { BlockService } from "../Services/block.service";
import { InfoWarningToast } from "../info-warning-toast";
import { MatDialog } from "@angular/material/dialog";
import { WorkgroupEditComponent } from "../modals/workgroup-edit/workgroup-edit.component";
import { ManagementService } from "../Services/management.service";

/**
 * Empty background
 */
const emptyBackground: Background = {
  name: "New Background",
  stepDefinitions: { when: [] },
};

/**
 * Component for the Story editor
 */
@Component({
  selector: "app-story-editor",
  templateUrl: "./story-editor.component.html",
  styleUrls: [
    "../base-editor/base-editor.component.css",
    "./story-editor.component.css",
  ],
})
export class StoryEditorComponent implements OnInit, OnDestroy {
  /**
   * set new currently selected scenario
   */
  @Input()
  set newSelectedScenario(scenario: Scenario) {
    this.selectedScenario = scenario;
    if (this.selectedStory && scenario) {
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

    // hide if no scenarios in story
    this.showEditor = !!story.scenarios.length;
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
   * List of backgrounds
   */
  backgrounds: Background[];
  /**
   * List of filtered backgrounds
   */
  filteredBackgrounds: Background[];

  /**
   * Currently selected story
   */
  selectedStory: Story;

  /**
   * Currently selected scenario
   */
  selectedScenario: Scenario;

  /**
   * Currently selected repository
   */
  selectedRepository: RepositoryContainer;

  /**
   * Current repo Id
   */

  repoId: string;
  /**
   * If the story editor should be shown
   */
  showEditor = false;
  /**
   * Currently retrieved projects
   */
  repositories: RepositoryContainer[];

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
   * Currently retrieved blocks
   */
  blocks: Block[];
  /**
   * Converted blocks as backgrounds
   */
  blockAsBackground: Background[];
  /**
   *If the modal Save background as a block open
   */
  openBlockModal;
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
  error: string;
  /**
   * Object id of the current report
   */
  reportId;

  /**
   * Name for a new step
   */
  newStepName = "New Step";

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

  /**
   * Global settings indicator
   */
  globalSettingsActivated: boolean;

  /**
   * Project configuartion settings
   */

  repoSettings;

  /*
   * Width of the window size
   */
  width: number;

  /*
   * Height of the window size
   */
  height: number;

  /**
   * Email of the user
   */
  email: string;

  /**
   * User id
   */
  id: string;

  lastToFocus;

  showDaisy = false;

  readonly TEMPLATE_NAME = "background";

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
  updateObservable: Subscription;
  applyBackgroundChangesObservable: Subscription;
  checkReferenceObservable: Subscription;
  deleteReferenceObservable: Subscription;
  unpackBlockObservable: Subscription;
  updateNameRefObservable: Subscription;
  convertToReferenceObservable: Subscription;

  @Input() isDark: boolean;

  /**
   * View child of the scenario editor
   */
  @ViewChild("scenarioChild") scenarioChild;
  /**
   * View child of the modals component
   */
  @ViewChild("renameStoryModal") renameStoryModal: RenameStoryComponent;
  @ViewChild("createScenarioForm") createScenarioForm: CreateScenarioComponent;
  @ViewChild("renameBackgroundModal")
  renameBackgroundModal: RenameBackgroundComponent;
  @ViewChild("workgroupEditModal") workgroupEditModal: WorkgroupEditComponent;


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
    public backgroundService: BackgroundService,
    public storyService: StoryService,
    public scenarioService: ScenarioService,
    public reportService: ReportService,
    public router: Router,
    public projectService: ProjectService,
    public loginService: LoginService,
    public blockService: BlockService,
    public managmentService: ManagementService,
    public dialog: MatDialog
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
    const version = localStorage.getItem("version");
    if (version === "DAISY" || !version) {
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
    this.setUserData();
    this.checkGlobalSettings();
  }

  handleSizeChange(event: { width: number; height: number }) {
    if (this.width !== event.width || this.height !== event.height) {
      this.selectedScenario.saved = false;
    }
    this.selectedScenario.width = event.width;
    this.selectedScenario.height = event.height;
  }

  ngAfterViewChecked() {
    this.openBlockModal = undefined;
    /**
     * when loading for group is displayed scroll to it
     */
    if (this.testRunningGroup === true) {
      const loadingScreen = document.getElementById("loading");
      loadingScreen.scrollIntoView();
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
          stepDefinitions: { ...b.stepDefinitions },
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
    // in event that stories are already loaded
    if (this.stories) {
      this.storiesLoaded = true;
    }
    if (this.loginService.isLoggedIn()) {
      this.projectService.getRepositories().subscribe(
        (resp) => {
          this.repositories = resp;
          this.selectedRepository = this.findSelectedRepository(this.repoId);
        },
        (err) => {
          this.error = err.error;
        }
      );
    }
    this.getStoriesObservable = this.storyService.getStoriesEvent.subscribe(
      (stories: Story[]) => {
        this.storiesLoaded = true;
        this.storiesError = false;
        this.showEditor = false;
        this.setStories(stories);
        this.db = localStorage.getItem("source") === "db";
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

        window.localStorage.removeItem("login");
        this.router.navigate(["/login"]);
      }
    );

    this.deleteScenarioObservable =
      this.scenarioService.deleteScenarioEvent.subscribe(() => {
        this.deleteScenario(this.selectedScenario);
      });

    this.runSaveOptionObservable = this.apiService.runSaveOptionEvent.subscribe(
      (option) => {
        if (option === "run") {
          this.runUnsaved = true;
          this.runOption();
        }
        if (option === "saveRun") {
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
    const id = localStorage.getItem("id");
    this.blockService.getBlocks(id).subscribe((resp) => {
      this.blocks = resp;
    });
    this.updateObservable = this.blockService.updateBlocksEvent.subscribe(
      (_) => {
        const id = localStorage.getItem("id");
        this.blockService.getBlocks(id).subscribe((resp) => {
          this.blocks = resp;
          console.log("Updated blocks:", this.blocks);
        });
      }
    );
    //Event when deleting references among steps
    this.checkReferenceObservable =
      this.blockService.checkRefOnRemoveEvent.subscribe((blockReferenceId) => {
        const id = localStorage.getItem("id");
        this.blockService.getBlocks(id).subscribe((resp) => {
          this.blocks = resp;
          if (this.blocks) {
            let referenceBlock = this.blocks.find(
              (block) => block._id == blockReferenceId
            );
            this.blockService.checkBlockOnReference(
              this.blocks,
              this.stories,
              referenceBlock
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
        const id = localStorage.getItem("id");
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
        if (option == "toCurrentBackground") {
          this.toastr.info(
            "Please enter a new Background name to save your changes"
          );
          this.changeBackgroundTitle();
        } else if (option == "centrally") {
          this.applyChangesToBackgrounds(this.selectedStory.background);
        }
      });
    this.convertToReferenceObservable = this.blockService.convertToReferenceEvent.subscribe(block =>
      this.blockService.convertSelectedStepsToRef(block, this.selectedScenario)
    );
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
    if (!this.applyBackgroundChangesObservable.closed) {
      this.applyBackgroundChangesObservable.unsubscribe();
    }
    if (!this.unpackBlockObservable.closed) {
      this.unpackBlockObservable.unsubscribe();
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
    if (this.selectedStory && scenario) {
      this.selectScenario(scenario);
    }
  }

  /**
   * Change the active view of a story
   */
  changeActiveView(viewName) {
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
    this.apiService.nameOfComponent("scenario");
    this.toastr.warning(
      "Are your sure you want to delete this scenario?  It cannot be restored.",
      "Delete Scenario?",
      {
        toastComponent: DeleteToast,
      }
    );
  }

  /**
   * Deletes scenario
   * @param scenario
   */
  deleteScenario(scenario: Scenario) {
    this.scenarioService
      .deleteScenario(this.selectedStory._id, scenario)
      .subscribe((_) => {
        this.scenarioDeleted();
        this.toastr.error("", "Scenario deleted");
      });
  }

  /**
   * Removes scenario from the selected story
   */
  scenarioDeleted() {
    const indexScenario: number = this.selectedStory.scenarios.indexOf(
      this.selectedScenario
    );
    if (indexScenario !== -1) {
      this.selectedStory.scenarios.splice(indexScenario, 1);
    }

    if (this.selectedStory.scenarios.length > 0) {
      this.selectScenario(this.selectedStory.scenarios.slice(-1)[0]);
    } else {
      this.showEditor = false;
    }
  }

  /**
   * Adds a scenario to story
   */
  addScenario(event) {
    const scenarioName = event;
    this.scenarioService
      .addScenario(this.selectedStory._id, scenarioName)
      .subscribe((resp: Scenario) => {
        this.selectScenario(resp);
        this.selectedStory.scenarios.push(resp);
        this.toastr.info("", "Scenario added");
      });
  }
  /**
   * updates the background
   */
  updateBackground() {
    Object.keys(this.selectedStory.background.stepDefinitions).forEach(
      (key, _) => {
        this.selectedStory.background.stepDefinitions[key].forEach(
          (step: StepType) => {
            delete step.checked;
            if (step.outdated) {
              step.outdated = false;
            }
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
    ) {
      this.backgroundChecks();
    } else {
      this.changeBackgroundBlock();
      delete this.selectedStory.background.saved;
      this.backgroundService
        .updateBackground(this.selectedStory._id, this.selectedStory.background)
        .subscribe((_) => {
          this.backgroundService.backgroundChangedEmitter();
          this.toastr.success("successfully saved", "Background");
          if (this.saveBackgroundAndRun) {
            this.apiService.runSaveOption("saveScenario");
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
        s.background.name !== "New Background" &&
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
    this.apiService.nameOfComponent("applyBackgroundChanges");
    this.apiService.setToastrOptions(
      "Save Changes for All Stories",
      "Save as New Background"
    );
    this.toastr.info(
      "",
      "You are about to save a Background used in multiple Stories. How should the changes apply?",
      {
        toastComponent: InfoWarningToast,
        timeOut: 10000,
        extendedTimeOut: 3000,
      }
    );
  }
  /**
   * Applying changes for all relevant backgrounds in repository
   */
  applyChangesToBackgrounds(background) {
    delete this.selectedStory.background.saved;
    const storyId = [];
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
            this.apiService.runSaveOption("saveScenario");
            this.saveBackgroundAndRun = false;
          }
        });
    });
    this.toastr.success("successfully saved", "Backgrounds");
  }

  /**
   * deletes the background
   */
  deleteBackground() {
    this.backgroundService
      .deleteBackground(this.selectedStory._id)
      .subscribe((_) => {
        this.showBackground = false;
        let blockBackgrounds = this.blocks.filter((b) => b.isBackground);
        if (blockBackgrounds) {
          for (const block of this.blocks) {
            if (block.name == this.selectedStory.background.name) {
              this.blockService.checkBackgroundsOnDelete(block, this.stories);
            }
          }
        }
        this.selectedStory.background = emptyBackground;
        this.selectedStory.background.saved = true;
      });
  }

  /**
   * Select a scenario
   * @param scenario
   */

  selectScenario(scenario: Scenario) {
    this.selectedScenario = scenario;
    this.showResults = false;
    if (scenario) this.showEditor = true;
    else this.showEditor = false;
    this.testDone = false;

    this.emulator_enabled =
      scenario.emulator ?? this.repoSettings?.emulator ?? false;
    if (this.emulator_enabled) {
      this.selectedScenario.emulator =
        scenario.emulator ?? this.repoSettings?.emulator ?? "No emulator";
    }
    this.selectedScenario.stepWaitTime =
      scenario.stepWaitTime ?? this.repoSettings?.stepWaitTime ?? 0;
    this.selectedScenario.browser =
      scenario.browser ?? this.repoSettings?.browser ?? "chrome";
    this.selectedScenario.width =
      scenario.width ?? this.repoSettings?.width ?? 1920;
    this.selectedScenario.height =
      scenario.height ?? this.repoSettings?.height ?? 1080;
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
            s.name !== "New Background" &&
            s.stepDefinitions.when.length !== 0
        )
        .map((s) => s);
      let uniqueChars = [];
      this.filteredBackgrounds.forEach((e) => {
        if (!uniqueChars.some((x) => x.name === e.name)) {
          uniqueChars.push(e);
        }
      });
      if (
        uniqueChars.length == 0 ||
        (uniqueChars.length == 1 &&
          uniqueChars[0] == this.backgroundService.currentBackground)
      ) {
        return undefined;
      } else return uniqueChars;
    }
  }
  /**
   * Retrive current background
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

  @ViewChild("saveBlockModal") saveBlockModal: SaveBlockFormComponent;
  checkAllSteps(checkValue?: boolean) {
    //needed by saveBlockModal
  }

  checkBackgroundLost() {
    const unsavedBackground = this.backgroundService.currentBackground;
    if (this.backgrounds.filter((b) => b === unsavedBackground).length < 2) {
      const stepDefs: StepDefinition = {
        given: [],
        then: [],
        example: [],
        when: unsavedBackground.stepDefinitions.when,
      };
      const block: Block = {
        name: unsavedBackground.name,
        stepDefinitions: stepDefs,
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
   * Selects a story and scenario
   * @param story
   */
  selectStoryScenario(story: Story) {
    this.showResults = false;
    this.selectedStory = story;
    console.log("log aus story editor selectStoryScen", story);
    if (story.scenarios.length > 0) {
      this.selectScenario(story.scenarios[0]);
      this.showEditor = true;
    } else this.showEditor = false;
  }

  /**
   * Make the API Request to run the tests and display the results as a chart
   * @param scenario_id
   */
  runTests(scenario_id) {
    if (this.storySaved()) {
      this.reportIsSaved = false;
      this.testRunning = true;
      this.report.emit(false);
      const iframe: HTMLIFrameElement = document.getElementById(
        "testFrame"
      ) as HTMLIFrameElement;
      const loadingScreen: HTMLElement = document.getElementById("loading");

      let browserSelect = null;
      let emulatorSelect = null;

      if (!this.globalSettingsActivated) {
        browserSelect = document.getElementById(
          "browserSelect"
        ) as HTMLSelectElement;
        emulatorSelect = document.getElementById(
          "emulatorSelect"
        ) as HTMLSelectElement;
      }

      // const browser = browserSelect ? browserSelect.value : undefined;
      const emulator = emulatorSelect ? emulatorSelect.value : undefined;
      // are these values already saved in the Scenario / Story?
      // const defaultWaitTimeInput = (document.getElementById('defaultWaitTimeInput') as HTMLSelectElement).value;
      // const daisyAutoLogout = (document.getElementById('daisyAutoLogout') as HTMLSelectElement).value;
      loadingScreen.scrollIntoView();
      this.storyService
        .runTests(this.selectedStory._id, scenario_id, {
          browser: browserSelect,
          emulator: emulator,
          width: this.selectedScenario.width || undefined,
          height: this.selectedScenario.height || undefined,
          repository: localStorage.getItem("repository"),
          repositoryId: localStorage.getItem("id"),
          source: localStorage.getItem("source"),
          oneDriver: this.selectedStory.oneDriver,
        })
        .subscribe((resp: any) => {
          this.reportId = resp.reportId;
          iframe.srcdoc = resp.htmlFile;
          this.htmlReport = resp.htmlFile;
          const report = resp.report;
          this.testDone = true;
          this.showResults = true;
          this.testRunning = false;
          setTimeout(function () {
            iframe.scrollIntoView();
          }, 10);
          this.toastr.info("", "Test is done");
          this.runUnsaved = false;
          if (scenario_id) {
            // ScenarioReport
            const val = report.status;
            this.scenarioService.scenarioStatusChangeEmit(
              this.selectedStory._id,
              scenario_id,
              val
            ); //filteredStories in stories-bar.component is undefined causing an error same file 270
          } else {
            // StoryReport
            report.scenarioStatuses.forEach((scenario) => {
              this.scenarioService.scenarioStatusChangeEmit(
                this.selectedStory._id,
                scenario.scenarioId,
                scenario.status
              );
            });
          }
        });
    } else {
      this.currentTestScenarioId = scenario_id;
      this.currentTestStoryId = this.selectedStory.story_id;
      this.apiService.nameOfComponent("runSaveToast");
      this.apiService.setToastrOptions("Save and Run", "Run Test");
      this.toastr.info(
        "Do you want to save before running the test?",
        "Scenario was not saved",
        {
          toastComponent: InfoWarningToast,
        }
      );
    }
  }

  /**
   * Download the test report
   */
  downloadFile() {
    const blob = new Blob([this.htmlReport], { type: "text/html" });
    saveAs(blob, this.selectedStory.title + ".html");
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

  /**
   *  Check for global settings
   */
  checkGlobalSettings() {
    this.repoId = localStorage.getItem("id");
    this.projectService.getRepositorySettings(this.repoId).subscribe({
      next: (settings) => {
        this.repoSettings = settings;
        if (settings && settings?.activated) {
          this.globalSettingsActivated = true;
        } else {
          this.globalSettingsActivated = false;
        }
      },
      error: (err) => {
        console.error("Fehler beim Abrufen der Repository Settings:", err);
        this.globalSettingsActivated = false;
      },
    });
  }

  /**
   * Finds repository container by Id
   * @param repositoryId
   */

  findSelectedRepository(id) {
    console.log(this.repositories);
    console.log(this.repoId);
    return this.repositories.find((repo) => repo._id === id);
  }

  /**
   * Opens Modal to edit the workgroup
   * @param project
   */
  workGroupEdit(project: RepositoryContainer) {
    console.log(this.workgroupEditModal);
    console.log(project, this.email, this.id);
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
      this.id = user._id;
      if (typeof user["email"] !== "undefined") {
        this.email = user["email"];
      }
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
    this.setEmulator(enabled ? this.getAvaiableEmulators()[0] : undefined);
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

  unsaveReport(reportId) {
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

  saveReport(reportId) {
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
  renameStory(newStoryTitle, newStoryDescription) {
    if (newStoryTitle && newStoryTitle.replace(/\s/g, "").length > 0) {
      this.selectedStory.title = newStoryTitle;
    }
    if (
      newStoryDescription &&
      newStoryDescription.replace(/\s/g, "").length > 0
    ) {
      this.selectedStory.body = newStoryDescription;
    }
    this.updateStory();
  }

  renameBackground(newBackgroundName) {
    this.selectedStory.background.name = newBackgroundName;
  }

  /**
   * Updates the story
   *
   */
  updateStory() {
    this.storyService.updateStory(this.selectedStory).subscribe((_resp) => {
      this.toastr.success("successfully saved", "Story");
    });
  }

  storyLink() {
    return (
      "https://" +
      window.location.hostname +
      ":" +
      window.location.port +
      "/story/" +
      this.selectedStory._id
    );
  }

  showStoryLinkToast() {
    this.toastr.success("", "Successfully added Link to Clipboard!");
  }

  /**
   * Opens the delete story toast
   *
   */

  showDeleteStoryToast() {
    this.apiService.nameOfComponent("story");
    this.toastr.warning(
      "Are your sure you want to delete this story? It cannot be restored.",
      "Delete Story?",
      {
        toastComponent: DeleteToast,
      }
    );
  }

  downloadFeature() {
    const id = this.selectedStory._id;
    this.storyService.downloadStoryFeatureFile(id).subscribe((ret) => {
      saveAs(
        ret,
        this.selectedStory.title + this.selectedStory._id + ".feature"
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
    if (this.stories.find((x) => x === this.selectedStory)) {
      this.stories.splice(
        this.stories.findIndex((x) => x === this.selectedStory),
        1
      );
    }
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
    if (blockToRename) {
      storiesWithBlock = this.stories.filter(
        (s) => s !== null && s.background.name == blockToRename.name
      );
    }
    this.renameBackgroundModal.openRenameBackgroundModal(
      this.backgrounds,
      background,
      this.selectedStory,
      this.saveBackgroundAndRun,
      blockToRename,
      storiesWithBlock
    );
  }

  setShowDaisy(event) {
    this.showDaisy = event;
  }
}
