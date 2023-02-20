import {Component, OnInit, Input, ViewChild, EventEmitter, Output} from '@angular/core';
import { ApiService } from '../Services/api.service';
import { Story } from '../model/Story';
import { Scenario } from '../model/Scenario';
import { StepType } from '../model/StepType';
import { ToastrService } from 'ngx-toastr';
import { Block } from '../model/Block';
import { RenameScenarioComponent } from '../modals/rename-scenario/rename-scenario.component';
import { Subscription } from 'rxjs';
import { CreateScenarioComponent } from '../modals/create-scenario/create-scenario.component';
import { ScenarioService } from '../Services/scenario.service';



/**
 * Component of the Scenario Editor
 */
@Component({
    selector: 'app-scenario-editor',
    templateUrl: './scenario-editor.component.html',
    styleUrls: ['../base-editor/base-editor.component.css','./scenario-editor.component.css'],
})

export class ScenarioEditorComponent implements OnInit{

	/**
     * Constructor
     * @param apiService
     * @param scenarioService
     * @param toastr
     */
	 constructor(
        public apiService: ApiService,
        public scenarioService: ScenarioService,
        public toastr: ToastrService
    ) {
        if (localStorage.getItem('version') == 'DAISY') {
            this.showDaisyAutoLogout = true;
        } else {
            this.showDaisyAutoLogout = false;
        }
    }

    /**
     * Sets a new selected story
     */
    @Input()
    set newlySelectedStory(story: Story) {
        this.selectedStory = story;
    }

    /**
     * Sets a new selected scenaio
     */
    @Input()
    set newlySelectedScenario(scenario: Scenario) {
        this.selectedScenario = scenario;
        if (this.selectedStory) {
           this.selectScenario(scenario);
        }

    }

    testRunning;

    /**
     * Currently selected story
     */
    selectedStory: Story;

    /**
     * currently selected scenario
     */
    selectedScenario: Scenario;

      /**
     * if the arrow left should be shown
     */
    arrowLeft = true;

    /**
     * if the arrow right should be shown
     */
    arrowRight = true;


    /**
     * If this is the daisy version and the auto logout should be shown
     */
    showDaisyAutoLogout = false;

    /**
     * Current step of scenario as ngModel for dropdown
     */
    currentStepNgModel = null;

    /**
     * Last step id after adding new step 
     */
    lastStepId;

    indexOfExampleToDelete;

    readonly TEMPLATE_NAME ='scenario';

    /**
     * Subscribtions for all EventEmitter
     */
    runSaveOptionObservable: Subscription;
    renameScenarioObservable: Subscription;

    @Input() isDark: boolean;

    /**
     * View child of the modals component
     */
    @ViewChild('renameScenarioModal') renameScenarioModal: RenameScenarioComponent;
    @ViewChild('createScenarioModal') createScenarioModal: CreateScenarioComponent;

    /**
     * Original step types not sorted or changed
     */
    @Input() originalStepTypes: StepType[];

    /**
     * Event emitter to delete the scenario
     */
    @Output()
    deleteScenarioEvent: EventEmitter<Scenario> = new EventEmitter();

    /**
     * Event emitter to select a new scenario
     */
    @Output()
    selectNewScenarioEvent: EventEmitter<Scenario> = new EventEmitter();

    /**
     * Event emitter to add a new scenario
     */
    @Output()
    addScenarioEvent: EventEmitter<any> = new EventEmitter();

    /**
     * Event emitter to run a test
     */
    @Output()
    runTestScenarioEvent: EventEmitter<any> = new EventEmitter();

    @Output()
    diasyLoginChanged: EventEmitter<any> = new EventEmitter();

  /**
    * Subscribes to all necessary events
    */
    ngOnInit() {
		this.runSaveOptionObservable = this.apiService.runSaveOptionEvent.subscribe(option => {
            if (option == 'saveScenario') {
                this.saveRunOption();
            }
        });

        this.renameScenarioObservable = this.scenarioService.renameScenarioEvent.subscribe(newName => this.renameScenario(newName));
    }

    ngOnDestroy() {
        if (!this.runSaveOptionObservable.closed) {
            this.runSaveOptionObservable.unsubscribe();
        }
        if (!this.renameScenarioObservable.closed) {
            this.renameScenarioObservable.unsubscribe();
        }
    }

    /**
     * Save and then run the scenario
     */
    async saveRunOption() {
      await this.updateScenario();
      this.apiService.runSaveOption('run');
    }


    /**
     * update a scenario
     * @returns
     */
    updateScenario() {

        delete this.selectedScenario.saved;
        let steps = this.selectedScenario.stepDefinitions['given'];
        steps = steps.concat(this.selectedScenario.stepDefinitions['when']);
        steps = steps.concat(this.selectedScenario.stepDefinitions['then']);
        steps = steps.concat(this.selectedScenario.stepDefinitions['example']);

        let undefined_steps = [];
        for (let i = 0; i < steps.length; i++) {
            if (String(steps[i]['type']).includes('Undefined Step')) {
                undefined_steps = undefined_steps.concat(steps[i]);
            }
        }

        Object.keys(this.selectedScenario.stepDefinitions).forEach((key, _) => {
            this.selectedScenario.stepDefinitions[key].forEach((step: StepType) => {
                delete step.checked;
                if (step.outdated) {
                    step.outdated = false;
                }
            });
        });

        if (undefined_steps.length != 0) {
            console.log('There are undefined steps here');
        }
        this.selectedScenario.lastTestPassed = null;
        return new Promise<void>((resolve, _reject) => {this.scenarioService
            .updateScenario(this.selectedStory._id, this.selectedStory.storySource, this.selectedScenario)
            .subscribe(_resp => {
                this.scenarioService.scenarioChangedEmitter();
                this.toastr.success('successfully saved', 'Scenario');
                resolve();
            });
        });
    }

    addScenarioToStory(event) {
        const scenarioName = event;
        this.addScenarioEvent.emit(scenarioName);
    }

    /**
     * Emitts the delete scenario event
     * @param event
     */
    deleteScenario() {
        this.deleteScenarioEvent.emit(this.selectedScenario);
    }

    /**
     * Save an example block
     *
     */
    saveExampleBlock() {
      const saveBlock: any = {given: [], when: [], then: [], example: []};
      for (const prop in this.selectedScenario.stepDefinitions) {
				for (const s in this.selectedScenario.stepDefinitions[prop]) {
					if ((prop == 'example' && this.selectedScenario.stepDefinitions[prop][s].checked) || this.includesExampleStep(this.selectedScenario.stepDefinitions[prop][s])) {
						saveBlock[prop].push(this.selectedScenario.stepDefinitions[prop][s]);
					}
				}
			}
      const block: Block = {stepDefinitions: saveBlock};
      //this.saveBlockModal.openSaveBlockFormModal(block, this);
    }

    /**
     * Checks if an example step is included in the steps
     * @param step
     * @returns
     */
    includesExampleStep(step: StepType) {
        let includesExample = false;
        step.values.forEach(element => {
            if (element[0] == '<' && element[element.length - 1] == '>') {
                includesExample = true;
            }
        });
        return includesExample;
    }

    /**
     * Renames the scenario
     * @param newTitle
     */
    renameScenario(newTitle) {
        if (newTitle && newTitle.replace(/\s/g, '').length > 0) {
            this.selectedScenario.name = newTitle;
        }
        this.selectedScenario.saved = false;
    }

    /**
     * Selects a scenario
     * @param scenario
     */
    selectScenario(scenario: Scenario) {
        this.selectedScenario = scenario;
        this.arrowLeft = this.checkArrowLeft();
        this.arrowRight = this.checkArrowRight();
    }

    /**
     * Checks if there exists a scenario before this one
     * @returns
     */
    checkArrowLeft(): boolean {
        const scenarioIndex = this.selectedStory.scenarios.indexOf(this.selectedScenario);
        return this.selectedStory.scenarios[scenarioIndex - 1] === undefined;
    }

    /**
     * Checks if there exists a scenario after this one
     * @returns
     */
    checkArrowRight(): boolean {
        const scenarioIndex = this.selectedStory.scenarios.indexOf(this.selectedScenario);
        return this.selectedStory.scenarios[scenarioIndex + 1] === undefined;
    }

    /**
     * Select the scenario before
     */
    scenarioShiftLeft() {
        const scenarioIndex = this.selectedStory.scenarios.indexOf(this.selectedScenario);
        if (this.selectedStory.scenarios[scenarioIndex - 1]) {
            this.selectScenario(this.selectedStory.scenarios[scenarioIndex - 1]);
            this.selectNewScenarioEvent.emit(this.selectedStory.scenarios[scenarioIndex - 1]);
        }
    }

    /**
     * Selects the next scenario
     */
    scenarioShiftRight() {
        const scenarioIndex = this.selectedStory.scenarios.indexOf(this.selectedScenario);
        if (this.selectedStory.scenarios[scenarioIndex + 1]) {
            this.selectScenario(this.selectedStory.scenarios[scenarioIndex + 1]);
            this.selectNewScenarioEvent.emit(this.selectedStory.scenarios[scenarioIndex + 1]);
        }
    }

    /**
     * Emitts a run scenario event
     * @param scenarioId
     */
    runTestScenario(scenarioId: number) {
        this.runTestScenarioEvent.emit({scenarioId});
    }

    /**
     * if the scenario is saved
     * @returns
     */
    scenarioSaved() {
        return this.testRunning || this.selectedScenario.saved === undefined  || this.selectedScenario.saved;
    }

    /**
     * Sets the daisy auto logout
     * @param $event
     * @param checkValue
     */
    setDaisyAutoLogout(checkValue: boolean) {
        this.selectedScenario.daisyAutoLogout = checkValue;
        this.selectedScenario.saved = false;
    }

    /**
     * Change the comment
     * @param newComment
     */
    commentChange(newComment) {
        this.selectedScenario.comment = newComment;
        this.selectedScenario.saved = false;
    }

    /**
     * Open Modal to rename the scenario
     */
    changeScenarioTitle() {
      this.renameScenarioModal.openRenameScenarioModal(this.selectedScenario.name);
    }

    openCreateScenario() {
        console.log(this.createScenarioModal)
        this.createScenarioModal.openCreateScenarioModal(this.selectedStory);
    }
}
