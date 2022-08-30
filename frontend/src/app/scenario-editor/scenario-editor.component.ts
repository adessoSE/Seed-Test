import {Component, OnInit, Input, ViewChild, EventEmitter, Output, DoCheck, OnDestroy, AfterViewInit} from '@angular/core';
import { ApiService } from '../Services/api.service';
import { Story } from '../model/Story';
import { Scenario } from '../model/Scenario';
import { StepType } from '../model/StepType';
import { ExampleTableComponent } from '../example-table/example-table.component';
import { ToastrService } from 'ngx-toastr';
import { Block } from '../model/Block';
import { NewStepRequestComponent } from '../modals/new-step-request/new-step-request.component';
import { RenameScenarioComponent } from '../modals/rename-scenario/rename-scenario.component';
import { SaveBlockFormComponent } from '../modals/save-block-form/save-block-form.component';
import { Subscription } from 'rxjs';
import { CreateScenarioComponent } from '../modals/create-scenario/create-scenario.component';
import { BaseEditorComponent } from '../base-editor/base-editor.component';

/**
 * Component of the Scenario Editor
 */
@Component({
    selector: 'app-scenario-editor',
    templateUrl: './scenario-editor.component.html',
    styleUrls: ['../base-editor/base-editor.component.css','./scenario-editor.component.css'],
})

export class ScenarioEditorComponent extends BaseEditorComponent implements OnInit, OnDestroy, DoCheck, AfterViewInit {


    /**
     * Constructor
     * @param apiService
     * @param toastr
     */
    constructor(
        public apiService: ApiService,
        toastr: ToastrService
    ) {
        super(toastr);
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
        if (this.selectedScenario) {
            this.checkAllExampleSteps(false);
            this.checkAllSteps('scenario', false);
        }

        this.selectedScenario = scenario;
        if (this.selectedStory) {
           this.selectScenario(scenario);
        }

    }

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
     * inputs including the <> for the examples
     */
    uncutInputs: string[] = [];

    /**
     * if the example action bar is active
     */
    activeExampleActionBar = false;

    /**
     * If all example steps are checked
     */
    allExampleChecked = false;


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

    /**
     * Subscribtions for all EventEmitter
     */
    runSaveOptionObservable: Subscription;
    addBlocktoScenarioObservable: Subscription;
    renameScenarioObservable: Subscription;

    //public dragging: DragRef = null;

    @Input() isDark: boolean;


    /**
     * View child of the example table
     */
    @ViewChild('exampleChildView') exampleChild: ExampleTableComponent;

    /**
     * View child of the modals component
     */
    @ViewChild('newStepRequest') newStepRequest: NewStepRequestComponent;
    @ViewChild('renameScenarioModal') renameScenarioModal: RenameScenarioComponent;
    @ViewChild('saveBlockModal') saveBlockModal: SaveBlockFormComponent;
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
        this.diasyLoginChanged.emit(this.showDaisyAutoLogout);
        this.runSaveOptionObservable = this.apiService.runSaveOptionEvent.subscribe(option => {
            if (option == 'saveScenario') {
                this.saveRunOption();
            }
        });

        this.addBlocktoScenarioObservable = this.apiService.addBlockToScenarioEvent.subscribe(block => {
            if (block[0] == 'scenario') {
                block = block[1];
                Object.keys(block.stepDefinitions).forEach((key, _) => {
                    block.stepDefinitions[key].forEach((step: StepType, j) => {
                        if (key == 'example') {
                            if (!this.selectedScenario.stepDefinitions[key][0] || !this.selectedScenario.stepDefinitions[key][0].values.some(r => step.values.includes(r))) {
                                this.selectedScenario.stepDefinitions[key].push(JSON.parse(JSON.stringify(step)));
                            }
                            if (j == 0) {
                                step.values.forEach(el => {
                                    const s = '<' + el + '>';
                                    if (!this.uncutInputs.includes(s)) {
                                        this.uncutInputs.push(s);
                                    }
                                });
                            }
                            this.exampleChild.updateTable();
                        } else {
                            this.selectedScenario.stepDefinitions[key].push(JSON.parse(JSON.stringify(step)));
                        }
                    });
                });
                this.selectedScenario.saved = false;
            }
        });

        this.renameScenarioObservable = this.apiService.renameScenarioEvent.subscribe(newName => this.renameScenario(newName));  
    }

    ngOnDestroy() {
        if (!this.runSaveOptionObservable.closed) {
            this.runSaveOptionObservable.unsubscribe();
        }
        if (!this.addBlocktoScenarioObservable.closed) {
            this.addBlocktoScenarioObservable.unsubscribe();
        }
        if (!this.renameScenarioObservable.closed) {
            this.renameScenarioObservable.unsubscribe();
        }
    }

    /**
     * If a step from the example should be removed
     * @param index
     */
    @Input()
    removeRowIndex(index) {
        super.removeStep('scenario');
        this.selectedScenario.saved = false;
    }

    /**
     * Checks for an example step
     * @param index
     */
    @Input()
    checkRowIndex(index: number) {
        this.checkExampleStep(this.selectedScenario.stepDefinitions.example[index], null);
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
        this.allChecked = false;
        this.allExampleChecked = false;
        this.activeActionBar = false;

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
        return new Promise<void>((resolve, _reject) => {this.apiService
            .updateScenario(this.selectedStory._id, this.selectedStory.storySource, this.selectedScenario)
            .subscribe(_resp => {
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
     * Adds an example step
     * @param step
     */
    addExampleStep(step: StepType) {
        if (this.selectedScenario.stepDefinitions.example.length > 0) {
            const newStep = this.createNewStep(step, this.selectedScenario.stepDefinitions, 'example');
            this.selectedScenario.stepDefinitions.example.push(newStep);
            const len = this.selectedScenario.stepDefinitions.example[0].values.length;
            for (let j = 1; j < len; j++) {
                this.selectedScenario.stepDefinitions.example[this.selectedScenario.stepDefinitions.example.length - 1].values.push('value');
            }
            this.exampleChild.updateTable();
        }
        this.selectedScenario.saved = false;
    }

    /**
     * Deactivate all checked example steps
     */
    deactivateExampleStep() {
        for (const s in this.selectedScenario.stepDefinitions.example) {
            if (this.selectedScenario.stepDefinitions.example[s].checked) {
                this.selectedScenario.stepDefinitions.example[s].deactivated = !this.selectedScenario.stepDefinitions.example[s].deactivated;
            }
        }
        this.selectedScenario.saved = false;
    }

    /**
     * Copy a block of examples
     */
    copyBlockExample() {
        const copyBlock: any = {given: [], when: [], then: [], example: []};
        for (const prop in this.selectedScenario.stepDefinitions) {
            if (prop == 'example') {
                for (const s in this.selectedScenario.stepDefinitions[prop]) {
                    if (this.selectedScenario.stepDefinitions[prop][s].checked) {
                        this.selectedScenario.stepDefinitions[prop][s].checked = false;
                        copyBlock[prop].push(this.selectedScenario.stepDefinitions[prop][s]);
                    }
                }
            }
        }
        const block: Block = {stepDefinitions: copyBlock};
        sessionStorage.setItem('scenarioBlock', JSON.stringify(block));
        this.allExampleChecked = false;
        this.activeExampleActionBar = false;
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
        this.saveBlockModal.openSaveBlockFormModal(block, this);
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
     * Checks all example steps
     * @param checkValue
     */
    checkAllExampleSteps(checkValue: boolean) {
        if (checkValue != null) {
            this.allExampleChecked = checkValue;
        } else {
            this.allExampleChecked = !this.allExampleChecked;
        }
        if (this.allExampleChecked) {
            for (let i = this.selectedScenario.stepDefinitions.example.length - 1; i >= 0; i--) {
                if (i == 0) { continue; }
                this.checkExampleStep(this.selectedScenario.stepDefinitions.example[i], true);
            }
            this.activeExampleActionBar = true;
            this.allExampleChecked = true;
        } else {
            for (let i = this.selectedScenario.stepDefinitions.example.length - 1; i >= 0; i--) {
                this.checkExampleStep(this.selectedScenario.stepDefinitions.example[i], false);
            }
            this.activeExampleActionBar = false;
            this.allExampleChecked = false;
        }
    }
    
    /**
     * Checks an example step
     * @param step
     * @param checkValue
     */
    checkExampleStep(step, checkValue: boolean) {
        if (checkValue != null) {
            step.checked = checkValue;
        } else {
            step.checked = !step.checked;
        }
        let checkCount = 0;
        let stepCount = 0;

        for (let i = this.selectedScenario.stepDefinitions.example.length - 1; i >= 0; i--) {
            stepCount++;
            if (this.selectedScenario.stepDefinitions.example[i].checked) {
                checkCount++;
            }
        }

        if (checkCount >= stepCount - 1) {
            this.allExampleChecked = true;
        } else {
            this.allExampleChecked = false;
        }
        if (checkCount <= 0) {
            this.allExampleChecked = false;
            this.activeExampleActionBar = false;
        } else {
            this.activeExampleActionBar = true;
        }
    }

    /**
     * remove step from examples
     */
    removeStepFromExample() {
        for (let i = this.selectedScenario.stepDefinitions.example.length - 1; i >= 1; i--) {
            if (this.selectedScenario.stepDefinitions.example[i].checked) {
                this.selectedScenario.stepDefinitions.example.splice(i, 1);
                this.exampleChild.updateTable();
            }
        }
        this.selectedScenario.saved = false;
        this.allExampleChecked = false;
        this.activeExampleActionBar = false;
    }

    /**
     * Checks the input if an example should be generated or removed
     * @param input
     * @param step
     * @param valueIndex
     */
    checkForExamples(input: string, step: StepType, valueIndex: number) {
        // removes example if new input is not in example syntax < >
        if (this.inputRemovedExample(input, step, valueIndex)) {
            this.removeExample(step, valueIndex);
        }
        // if input has < > and it is a new unique input
        if (this.inputHasExample(input)) {
            this.createExample(input, step, valueIndex);
        }
    }

    /**
     * Removes an example
     */
    removeExample(step: StepType, valueIndex: number) {
        const cutOld = step.values[valueIndex].substr(1, step.values[valueIndex].length - 2);
        this.uncutInputs.splice(this.uncutInputs.indexOf(step.values[valueIndex]), 1);

        for (let i = 0; i < this.selectedScenario.stepDefinitions.example.length; i++) {
            this.selectedScenario.stepDefinitions.example[i].values.splice(this.selectedScenario.stepDefinitions.example[0].values.indexOf(cutOld), 1);
            if (this.selectedScenario.stepDefinitions.example[0].values.length == 0) {
                this.selectedScenario.stepDefinitions.example.splice(0, this.selectedScenario.stepDefinitions.example.length);
            }
        }
        if (!this.selectedScenario.stepDefinitions.example || this.selectedScenario.stepDefinitions.example.length <= 0) {
            const table = document.getElementsByClassName('mat-table')[0];
            if (table) {
                table.classList.remove('mat-elevation-z8');
            }
        }
    }

    /**
     * If the example got removed <>
     * @param input
     * @param step
     * @param valueIndex
     * @returns
     */
    inputRemovedExample(input: string, step: StepType, valueIndex: number): boolean {
        return step.values[valueIndex].startsWith('<') && step.values[valueIndex].endsWith('>') && (!input.startsWith('<') || !input.endsWith('>'));
    }

    /**
     * If the Input has now an example
     * @param input
     * @returns
     */
    inputHasExample(input: string): boolean {
        return input.startsWith('<') && input.endsWith('>') && !this.uncutInputs.includes(input);
    }


    /**
     * Creates an example
     * @param input
     * @param step
     * @param valueIndex
     */
    createExample(input: string, step: StepType, valueIndex: number) {
        const cutInput = input.substr(1, input.length - 2);
        this.handleExamples(input, cutInput, step, valueIndex);
    }

    /**
     * Handles the update for examples
     * @param input
     * @param cutInput
     * @param step
     * @param valueIndex
     */
    handleExamples(input: string, cutInput: string, step: StepType, valueIndex: number) {
        // changes example header name if the name is just changed in step
        if (this.exampleHeaderChanged(input, step, valueIndex)) {
            this.uncutInputs[this.uncutInputs.indexOf(step.values[valueIndex])] = input;
            this.selectedScenario.stepDefinitions.example[0].values[this.selectedScenario.stepDefinitions.example[0].values.indexOf(step.values[valueIndex].substr(1, step.values[valueIndex].length - 2))] = cutInput;
        } else {
            this.uncutInputs.push(input);
            // for first example creates 2 steps
            if (this.selectedScenario.stepDefinitions.example[0] === undefined) {
                this.createFirstExample(cutInput, step);
            } else {
                // else just adds as many values to the examples to fill up the table
                this.fillExamples(cutInput, step);
            }
        }
        this.exampleChild.updateTable();

    }

    /**
     * Creates the first example of the scenario
     * @param cutInput
     * @param step
     */
    createFirstExample(cutInput: string, step: StepType) {
        for (let i = 0; i <= 2; i++) {
            const newStep = this.createNewStep(step, this.selectedScenario.stepDefinitions, 'example');
            this.selectedScenario.stepDefinitions.example.push(newStep);
            this.exampleChild.updateTable();
        }
        this.selectedScenario.stepDefinitions.example[0].values[0] = (cutInput);
        const table = document.getElementsByClassName('mat-table')[0];
        if (table) { table.classList.add('mat-elevation-z8'); }
    }

    /**
     * Fill all example values after an example step was added
     * @param cutInput
     * @param step
     */
    fillExamples(cutInput: string, step: StepType) {
        this.selectedScenario.stepDefinitions.example[0].values.push(cutInput);
        // if the table has no rows add a row

        if (this.selectedScenario.stepDefinitions.example[1] === undefined) {
            const newStep = this.createNewStep(step, this.selectedScenario.stepDefinitions, 'example');
            this.selectedScenario.stepDefinitions.example.push(newStep);
            const len = this.selectedScenario.stepDefinitions.example[0].values.length;
            for (let j = 1; j < len; j++) {
                this.selectedScenario.stepDefinitions.example[this.selectedScenario.stepDefinitions.example.length - 1].values.push('value');

            }
        } else {
            for (let j = 1; j < this.selectedScenario.stepDefinitions.example.length; j++) {
                this.selectedScenario.stepDefinitions.example[j].values.push('value');
            }
        }
    }

    /**
     * if the example header got changed
     * @param input
     * @param step
     * @param valueIndex
     * @returns
     */
    exampleHeaderChanged(input: string, step: StepType, valueIndex: number): boolean {
        return input.startsWith('<') && input.endsWith('>') && step.values[valueIndex] != input && step.values[valueIndex] != '' && step.values[valueIndex].startsWith('<') && step.values[valueIndex].endsWith('>') && this.selectedScenario.stepDefinitions.example[valueIndex] !== undefined;
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
        this.createScenarioModal.openCreateScenarioModal(this.selectedStory);
    }


}
