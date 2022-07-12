import {Component, OnInit, Input, ViewChild, EventEmitter, Output, DoCheck, OnDestroy, ElementRef, ViewChildren, QueryList, AfterViewInit} from '@angular/core';
import { ApiService } from '../Services/api.service';
import { StepDefinition } from '../model/StepDefinition';
import { Story } from '../model/Story';
import { Scenario } from '../model/Scenario';
import { StepDefinitionBackground } from '../model/StepDefinitionBackground';
import {CdkDragDrop, CdkDragStart, DragRef, moveItemInArray} from '@angular/cdk/drag-drop';
import { StepType } from '../model/StepType';
import { ExampleTableComponent } from '../example-table/example-table.component';
import { ToastrService } from 'ngx-toastr';
import { Block } from '../model/Block';
import { AddBlockFormComponent } from '../modals/add-block-form/add-block-form.component';
import { NewStepRequestComponent } from '../modals/new-step-request/new-step-request.component';
import { RenameScenarioComponent } from '../modals/rename-scenario/rename-scenario.component';
import { SaveBlockFormComponent } from '../modals/save-block-form/save-block-form.component';
import { Subscription } from 'rxjs';
import { CreateScenarioComponent } from '../modals/create-scenario/create-scenario.component';
import { NewExampleComponent } from './../modals/new-example/new-example.component';
import * as e from 'express';


/**
 * Component of the Scenario Editor
 */
@Component({
    selector: 'app-scenario-editor',
    templateUrl: './scenario-editor.component.html',
    styleUrls: ['./scenario-editor.component.css'],
})

export class ScenarioEditorComponent  implements OnInit, OnDestroy, DoCheck, AfterViewInit{


    /**
     * Constructor
     * @param apiService
     * @param toastr
     */
    constructor(
        public apiService: ApiService,
        private toastr: ToastrService
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
        if (this.selectedScenario) {
            this.checkAllExampleSteps(null, false);
            this.checkAllSteps(null, false);
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
     * Name for a new step
     */
    newStepName = 'New Step';

    /**
     * If the action bar is active
     */
    activeActionBar = false;

    /**
     * If all steps are checked
     */
    allChecked = false;

    /**
     * if the example action bar is active
     */
    activeExampleActionBar = false;

    /**
     * If all example steps are checked
     */
    allExampleChecked = false;

    /**
     * Block saved to the clipboard
     */
    clipboardBlock: Block = null;

    /**
     * If this is the daisy version and the auto logout should be shown
     */
    showDaisyAutoLogout = false;

    /**
     * Current step of scenario as ngModel for dropdown
     */
    currentStepNgModel = null;

    /**
     * Last checked step
     */
    givenLastChecked = { id: undefined, step: undefined };
    whenLastChecked = { id: undefined, step: undefined };
    thenLastChecked = { id: undefined, step: undefined };
    exampleLastChecked = { id: undefined, step: undefined };

    /**
     * List of all checkboxes
     */
    allCheckboxes;

    /**
     * Id of the last checked input field
     */
    lastToFocus;

    /**
     * Last step id after adding new step 
     */
    lastStepId;

    indexOfExampleToDelete;

    /**
     * Subscribtions for all EventEmitter
     */
    runSaveOptionObservable: Subscription;
    addBlocktoScenarioObservable: Subscription;
    renameScenarioObservable: Subscription;
    newExampleObservable: Subscription;
    renameExampleObservable: Subscription;

    public dragging: DragRef = null;

    @Input() isDark: boolean;
    /**
     * View child of the example table
     */
    @ViewChild('exampleChildView') exampleChild: ExampleTableComponent;

    @ViewChildren('step_type_input1') step_type_input1: QueryList<ElementRef>;
    @ViewChildren('checkbox') checkboxes: QueryList<ElementRef>;

    /**
     * View child of the modals component
     */
    @ViewChild('addBlockModal') addBlockModal: AddBlockFormComponent;
    @ViewChild('newStepRequest') newStepRequest: NewStepRequestComponent;
    @ViewChild('renameScenarioModal') renameScenarioModal: RenameScenarioComponent;
    @ViewChild('saveBlockModal') saveBlockModal: SaveBlockFormComponent;
    @ViewChild('createScenarioModal') createScenarioModal: CreateScenarioComponent;
    @ViewChild('newExampleModal') newExampleModal: NewExampleComponent;

    /**
     * Original step types not sorted or changed
     */
    @Input() originalStepTypes: StepType[];

    /**
     * If the test is currently running
     */
    @Input() testRunning: boolean;

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

    ngAfterViewInit(): void {
        this.step_type_input1.changes.subscribe(_ => {
            this.step_type_input1.forEach(in_field => {  
                if ( in_field.nativeElement.id === this.lastToFocus) {
                    in_field.nativeElement.focus();
                }
            });
            this.lastToFocus = '';
        });
        this.checkboxes.changes.subscribe(_ => {
            this.allCheckboxes = this.checkboxes;
        });
    }

    /**
     * retrieves the saved block from the session storage
     */
    ngDoCheck(): void {
        this.clipboardBlock = JSON.parse(sessionStorage.getItem('copiedBlock'));
    }

    /**
     * Subscribes to all necessary events
     */
    ngOnInit() {
        this.runSaveOptionObservable = this.apiService.runSaveOptionEvent.subscribe(option => {
            if (option == 'saveScenario') {
                this.saveRunOption();
            }
        });

        this.addBlocktoScenarioObservable = this.apiService.addBlockToScenarioEvent.subscribe(block => {
            if (block[0] == 'scenario') {
                block = block[1];
                Object.keys(block.stepDefinitions).forEach((key, index) => {
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
        this.newExampleObservable = this.apiService.newExampleEvent.subscribe(value => {this.addToValues(value.name, 'addingExample',value.step,0,0)});
        this.renameExampleObservable = this.apiService.renameExampleEvent.subscribe(value =>{this.renameExample(value.name, value.column)})
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
        if (!this.newExampleObservable.closed) {
            this.newExampleObservable.unsubscribe();
        }
        if (!this.renameExampleObservable.closed) {
            this.renameExampleObservable.unsubscribe();
        }
    }

    /**
     * If a step from the example should be removed
     * @param index
     */
    @Input()
    removeRowIndex(index: number) {
        this.removeStepFromScenario();
        this.selectedScenario.saved = false;
    }

    /**
     * Checks for an example step
     * @param index
     */
    @Input()
    checkRowIndex(index: number) {
        this.checkExampleStep(null, this.selectedScenario.stepDefinitions.example[index], null);
    }

    /**
     * Save and then run the scenario
     */
    async saveRunOption() {
        await this.updateScenario();
        this.apiService.runSaveOption('run');
    }

    /**
     * Drag and drop event for a step in the scenario
     * @param event
     * @param stepDefs
     * @param stepIndex
     */
    onDropScenario(event: CdkDragDrop<any>, stepDefs: StepDefinition, stepIndex: number) {
        if (this.selectedCount(stepIndex) > 1) {
            var indices = event.item.data.indices;
            var change = event.currentIndex-event.previousIndex;

            let newList = []

            if (change > 0){
                let startOfList = this.getStepsList(stepDefs, stepIndex).slice(0, event.currentIndex+1)
                let middleOfList: StepType[] = []
                let endOfList = this.getStepsList(stepDefs, stepIndex).slice(event.currentIndex+1)
                indices.forEach((element) => {
                    middleOfList.push(element.value)
                });
                let startOfListFiltered = startOfList.filter( ( el ) => !middleOfList.includes( el ) );
                let endOfListFiltered = endOfList.filter( ( el ) => !middleOfList.includes( el ) );
                startOfListFiltered.push(...middleOfList)
                startOfListFiltered.push(...endOfListFiltered)
                newList = startOfListFiltered
            } else if (change < 0) {
                let startOfList = this.getStepsList(stepDefs, stepIndex).slice(0, event.currentIndex)
                let middleOfList: StepType[] = []
                let endOfList = this.getStepsList(stepDefs, stepIndex).slice(event.currentIndex)
                indices.forEach((element) => {
                    middleOfList.push(element.value)
                });
                let endOfListFiltered = endOfList.filter( ( el ) => !middleOfList.includes( el ) );
                startOfList.push(...middleOfList)
                startOfList.push(...endOfListFiltered)
                newList = startOfList
            }

            if (stepIndex === 0) {
                this.selectedScenario.stepDefinitions.given = newList
            } else if (stepIndex === 1) {
                this.selectedScenario.stepDefinitions.when = newList
            } else if (stepIndex === 2) {
                this.selectedScenario.stepDefinitions.then = newList
            }
            
        } else {
            moveItemInArray(this.getStepsList(stepDefs, stepIndex), event.previousIndex, event.currentIndex);
        }
        this.selectedScenario.saved = false;
    }

    /**
     * Maps all selected steps to their index
     * Sets dragging boolean
     * @param event
     * @param i 
     */
     dragStarted(event: CdkDragStart, i: number): void {
        this.dragging = event.source._dragRef;
        var indices = null;
        if (i === 0) {
            indices = this.selectedScenario.stepDefinitions.given
            .map(function(element, index) {return {index: index, value: element}})
            .filter(function(element) { return element.value.checked});
        } else if (i === 1) {
            indices = this.selectedScenario.stepDefinitions.when
            .map(function(element, index) {return {index: index, value: element}})
            .filter(function(element) { return element.value.checked});
        } else if (i === 2) {
            indices = this.selectedScenario.stepDefinitions.then
            .map(function(element, index) {return {index: index, value: element}})
            .filter(function(element) { return element.value.checked});
        }
        event.source.data = {
          indices,
          values: indices.map(a => a.index),
          source: this,
        };
      }
    
      /**
       * Sets dragging boolean
       */
      dragEnded(): void {
        this.dragging = null;
      }

      /**
       * Checks if step is selected
       * @param i 
       * @param j 
       * @returns 
       */
      isSelected(i: number, j: number): boolean {
        if (i === 0) {
            return this.selectedScenario.stepDefinitions.given[j].checked;
        } else if (i === 1) {
            return this.selectedScenario.stepDefinitions.when[j].checked;
        } else if (i === 2) {
            return this.selectedScenario.stepDefinitions.then[j].checked;
        }
        return false;
      }

      /**
       * Returns count of all selected step from one stepDefinition
       * @param i 
       * @returns 
       */
      selectedCount(i: number): number{
        var counter = 0
        if (i === 0) {
            this.selectedScenario.stepDefinitions.given.forEach(element => { if(element.checked){counter++;} });
        } else if (i === 1) {
            this.selectedScenario.stepDefinitions.when.forEach(element => { if(element.checked){counter++;} });
        } else if (i === 2) {
            this.selectedScenario.stepDefinitions.then.forEach(element => { if(element.checked){counter++;} });
        }
        return counter;
      }

    /**
     * Gets the steps list
     * @param stepDefs
     * @param i
     * @returns
     */
    getStepsList(stepDefs: StepDefinition, i: number) {
        if (i === 0) {
            return stepDefs.given;
        } else if (i === 1) {
            return stepDefs.when;
        } else if (i === 2) {
            return stepDefs.then;
        } else {
            return stepDefs.example;
        }
    }

    /**
     * gets the types of the steps
     * @param stepDefs
     * @returns
     */
    getKeysList(stepDefs: StepDefinition) {
        if (stepDefs != null) {
            return Object.keys(stepDefs);
        } else {
            return '';
        }
    }

    /**
     * Insert a copied block to the scenario
     */
    insertCopiedBlock() {
        Object.keys(this.clipboardBlock.stepDefinitions).forEach((key, index) => {
            this.clipboardBlock.stepDefinitions[key].forEach((step: StepType, j) => {
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

        Object.keys(this.selectedScenario.stepDefinitions).forEach((key, index) => {
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
        return new Promise<void>((resolve, reject) => {this.apiService
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
    deleteScenario(event) {
        this.deleteScenarioEvent.emit(this.selectedScenario);
    }

    /**
     * Adds a step to the scenario
     * @param storyID
     * @param step
     */
    addStepToScenario(step, step_idx) {
        const newStep = this.createNewStep(step, this.selectedScenario.stepDefinitions);
        if (newStep['type'] === this.newStepName) {
            this.newStepRequest.openNewStepRequestModal(newStep['stepType']);
        } else {
            var lastEl
            switch (newStep.stepType) {
                case 'given':
                    this.selectedScenario.stepDefinitions.given.push(newStep);
                    lastEl = this.selectedScenario.stepDefinitions.given.length-1;
                    this.lastToFocus = 'scenario_'+step_idx+'_input_pre_'+ lastEl;
                    break;
                case 'when':
                    this.selectedScenario.stepDefinitions.when.push(newStep);
                    lastEl = this.selectedScenario.stepDefinitions.when.length-1;
                    this.lastToFocus = 'scenario_'+step_idx+'_input_pre_'+ lastEl;
                    break;
                case 'then':
                    this.selectedScenario.stepDefinitions.then.push(newStep);
                    lastEl = this.selectedScenario.stepDefinitions.then.length-1;
                    this.lastToFocus = 'scenario_'+step_idx+'_input_pre_'+ lastEl;
                    break;
                case 'example':
                    this.addExampleStep(step);
                    break;
                default:
                    break;
            }
            this.selectedScenario.saved = false;
        }
    }

    /**
     * Adds an example step
     * @param step
     */
    addExampleStep(step: StepType) {
        console.log(this.selectedScenario.stepDefinitions.example.length)
        //if (this.selectedScenario.stepDefinitions.example.length > 0) {
            const newStep = this.createNewStep(step, this.selectedScenario.stepDefinitions, 'example');
            this.selectedScenario.stepDefinitions.example.push(newStep);
            const len = this.selectedScenario.stepDefinitions.example[0].values.length;
            for (let j = 1; j < len; j++) {
                this.selectedScenario.stepDefinitions.example[this.selectedScenario.stepDefinitions.example.length - 1].values.push('value');
            }
            this.exampleChild.updateTable();
        //}
        this.selectedScenario.saved = false;
    }

    /**
     * Creates a new step
     * @param step
     * @param stepDefinitions
     * @param stepType
     * @returns
     */
    createNewStep(step: StepType, stepDefinitions: StepDefinition | StepDefinitionBackground, stepType?: string): StepType {
        const obj = JSON.parse(JSON.stringify(step));
        const newId = this.getLastIDinStep(stepDefinitions, obj.stepType) + 1;
        const newStep: StepType = {
            id: newId,
            mid: obj.mid,
            pre: obj.pre,
            post: obj.post,
            stepType: stepType === 'example' ? stepType : obj.stepType,
            type: obj.type,
            values: stepType === 'example' ? ['value'] : obj.values,
            isExample: stepType === 'example' ? [true] : [false]
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
     * Deactivate all checked steps
     */
    deactivateStep() {
        for (const prop in this.selectedScenario.stepDefinitions) {
            if (prop !== 'example') {
                for (const s in this.selectedScenario.stepDefinitions[prop]) {
                    if (this.selectedScenario.stepDefinitions[prop][s].checked) {
                        this.selectedScenario.stepDefinitions[prop][s].deactivated = !this.selectedScenario.stepDefinitions[prop][s].deactivated;
                    }
                }
            }
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
     * Check all steps
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
            for (const prop in this.selectedScenario.stepDefinitions) {
                if (prop !== 'example') {
                    for (let i = this.selectedScenario.stepDefinitions[prop].length - 1; i >= 0; i--) {
                        this.checkStep(null, this.selectedScenario.stepDefinitions[prop][i], true);
                    }
                }
            }
            this.activeActionBar = true;
            this.allChecked = true;
        } else {
            for (const prop in this.selectedScenario.stepDefinitions) {
                if (prop !== 'example') {
                    for (let i = this.selectedScenario.stepDefinitions[prop].length - 1; i >= 0; i--) {
                        this.checkStep(null, this.selectedScenario.stepDefinitions[prop][i], false);
                    }
                }
            }
            this.activeActionBar = false;
            this.allChecked = false;
        }
    }

    /**
     * Opens add block form modal
     * @param event
     */
    addBlock(event) {
        const id = localStorage.getItem('id');
        this.addBlockModal.openAddBlockFormModal('scenario', id);
    }

    /**
     * Save a new block
     */
    saveBlock() {
        const saveBlock: any = {given: [], when: [], then: []};
        for (const prop in this.selectedScenario.stepDefinitions) {
            if (prop !== 'example') {
                for (const s in this.selectedScenario.stepDefinitions[prop]) {
                    if (this.selectedScenario.stepDefinitions[prop][s].checked) {
                        saveBlock[prop].push(this.selectedScenario.stepDefinitions[prop][s]);
                    }
                }
            }
        }
        const block: Block = {name: 'TEST', stepDefinitions: saveBlock};
        this.saveBlockModal.openSaveBlockFormModal(block, this);
    }

    /**
     * Copy block
     */
    copyBlock() {
        const copyBlock: any = {given: [], when: [], then: [], example: []};
        for (const prop in this.selectedScenario.stepDefinitions) {
            if (prop !== 'example') {
                for (const s in this.selectedScenario.stepDefinitions[prop]) {
                    if (this.selectedScenario.stepDefinitions[prop][s].checked) {
                        this.selectedScenario.stepDefinitions[prop][s].checked = false;
                        copyBlock[prop].push(this.selectedScenario.stepDefinitions[prop][s]);
                    }
                }
            }
        }
        const block: Block = {stepDefinitions: copyBlock};
        sessionStorage.setItem('copiedBlock', JSON.stringify(block));
        this.allChecked = false;
        this.activeActionBar = false;
        this.toastr.success('successfully copied', 'Step(s)');
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
        sessionStorage.setItem('copiedBlock', JSON.stringify(block));
        this.allExampleChecked = false;
        this.activeExampleActionBar = false;
    }

    /**
     * Save an example block
     * @param event
     */
    saveExampleBlock(event) {
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
     * @param event
     * @param checkValue
     */
    checkAllExampleSteps(event, checkValue: boolean) {
        if (checkValue != null) {
            this.allExampleChecked = checkValue;
        } else {
            this.allExampleChecked = !this.allExampleChecked;
        }
        if (this.allExampleChecked) {
            for (let i = this.selectedScenario.stepDefinitions.example.length - 1; i >= 0; i--) {
                if (i == 0) { continue; }
                this.checkExampleStep(null, this.selectedScenario.stepDefinitions.example[i], true);
            }
            this.activeExampleActionBar = true;
            this.allExampleChecked = true;
        } else {
            for (let i = this.selectedScenario.stepDefinitions.example.length - 1; i >= 0; i--) {
                this.checkExampleStep(null, this.selectedScenario.stepDefinitions.example[i], false);
            }
            this.activeExampleActionBar = false;
            this.allExampleChecked = false;
        }
    }
    /**
     * Set checked step to last checked
     * @param currentStep
     * @returns
     */
    setLastChecked (currentStep, checkbox_id) {
        switch (currentStep.stepType) {
            case 'given': {
                this.givenLastChecked.id = checkbox_id;
                this.givenLastChecked.step = currentStep;
                break
            }
            case 'when': {
                this.whenLastChecked.id = checkbox_id;
                this.whenLastChecked.step = currentStep;
                break
            }
            case 'then': {
                this.thenLastChecked.id = checkbox_id;
                this.thenLastChecked.step = currentStep;
                break
            }
            case 'example': {
                this.exampleLastChecked.id = checkbox_id;
                this.exampleLastChecked.step = currentStep;
                break
            }
        }
    }

    /**
     * Handles checkboxes on click
     * @param event Click event
     * @param step Current step
     * @param checkValue Check value
     */
    handleClick(event, step, step_id, checkbox_id, checkValue: boolean) {
        //Load checkboxes
        this.allCheckboxes = this.checkboxes;

        // Set current step to last checked if undefined given step type
        if (step.stepType === 'given' && this.givenLastChecked.id === undefined) {
            this.setLastChecked(step, checkbox_id);
        } else if ( step.stepType === 'when' && this.whenLastChecked.id === undefined) {
            this.setLastChecked(step, checkbox_id);
        } else if (step.stepType === 'then' && this.thenLastChecked.id === undefined) {
            this.setLastChecked(step, checkbox_id);
        } else if (step.stepType === 'example' && this.exampleLastChecked.id === undefined) {
            this.setLastChecked(step, checkbox_id);
        }

        // if key pressed is shift
        if (event.shiftKey) {
            this.checkMany(step, step_id, checkbox_id);
        } else {
            this.checkStep(event, step, checkValue);
        }

        // Set current step to last checked
        this.setLastChecked (step, checkbox_id);
    }

    /**
     * Checks many steps on shift click
     * @param currentStep
     * @param step_id
     * @param checkbox_id
     */
    checkMany(currentStep, step_id, checkbox_id) {
        // Find in this block start and end step
        let newTmp = checkbox_id;  // current step id
        let lastTmp;
        let start;
        let end;

        switch(currentStep.stepType) {
            case 'given': {
                lastTmp = this.givenLastChecked.id; // last checked step 
                break
            }
            case 'when': {
                lastTmp = this.whenLastChecked.id; // last checked step
                break
            }
            case 'then': {
                lastTmp = this.thenLastChecked.id; // last checked step
                break
            }
            case 'example': {
                lastTmp = this.exampleLastChecked.id; // last checked step
                break
            }
        }

        start = Math.min(newTmp, lastTmp); // get starting & ending array element
        end = Math.max(newTmp, lastTmp);
        
        // Check all steps in the list between start and end
        let id = 'scenario_'+step_id+'_checkbox_'
        this.allCheckboxes.forEach(checkbox => {
            if (checkbox.nativeElement.id === id+start) {
                this.selectedScenario.stepDefinitions[currentStep.stepType][start].checked = checkbox.nativeElement.checked;
            } 
            for (let i = start+1; i < end; i++) {
                if (checkbox.nativeElement.id === id+i) {
                    this.selectedScenario.stepDefinitions[currentStep.stepType][i].checked = !checkbox.nativeElement.checked;     
                }
            }
            if (checkbox.nativeElement.id === id+end ) {
                this.selectedScenario.stepDefinitions[currentStep.stepType][end].checked = checkbox.nativeElement.checked;
            }
        });          
    }

    /**
     * Checks a step
     * @param $event
     * @param step
     * @param checkValue
     */
    checkStep($event, step, checkValue: boolean) {
        if (checkValue != null) {
            step.checked = checkValue;
        } else {
            step.checked = !step.checked;
        }
        let checkCount = 0;
        let stepCount = 0;

        for (const prop in this.selectedScenario.stepDefinitions) {
            if (prop !== 'example') {
                for (let i = this.selectedScenario.stepDefinitions[prop].length - 1; i >= 0; i--) {
                    stepCount++;
                    if (this.selectedScenario.stepDefinitions[prop][i].checked) {
                        checkCount++;
                    }
                }
            }
        }
        if (checkCount >= stepCount) {
            this.allChecked = true;
        } else {
            this.allChecked = false;
        }
        if (checkCount <= 0) {
            this.allChecked = false;
            this.activeActionBar = false;
        } else {
            this.activeActionBar = true;
        }
    }

    /**
     * Checks an example step
     * @param $event
     * @param step
     * @param checkValue
     */
    checkExampleStep($event, step, checkValue: boolean) {
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
     * Removes a step from the scenario
     */
    removeStepFromScenario() {
        for (const prop in this.selectedScenario.stepDefinitions) {
            if (prop !== 'example') {
                for (let i = this.selectedScenario.stepDefinitions[prop].length - 1; i >= 0; i--) {
                    if (this.selectedScenario.stepDefinitions[prop][i].checked) {
                        this.selectedScenario.stepDefinitions[prop].splice(i, 1);
                    }
                }
            }
        }
        this.selectedScenario.saved = false;
        this.allChecked = false;
        this.activeActionBar = false;
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
     * Adds a value to the step
     * @param input
     * @param stepType
     * @param step
     * @param stepIndex
     * @param valueIndex
     */
    addToValues(input: string, stepType: string, step: StepType, stepIndex: number, valueIndex: number) {
        switch (stepType) {
            case 'given':
                if(this.selectedScenario.stepDefinitions.given[stepIndex].isExample[valueIndex]){
                    this.selectedScenario.stepDefinitions.given[stepIndex].values[valueIndex] = '<' + input + '>';
                }
                else {
                    this.selectedScenario.stepDefinitions.given[stepIndex].values[valueIndex] = input;
                }
                break;
            case 'when':
                if(this.selectedScenario.stepDefinitions.when[stepIndex].isExample[valueIndex]){
                    this.selectedScenario.stepDefinitions.when[stepIndex].values[valueIndex] = '<' + input + '>';
                }
                else {
                    this.selectedScenario.stepDefinitions.when[stepIndex].values[valueIndex] = input;
                }
                break;
            case 'then':
                if(this.selectedScenario.stepDefinitions.then[stepIndex].isExample[valueIndex]){
                    this.selectedScenario.stepDefinitions.then[stepIndex].values[valueIndex] = '<' + input + '>';
                }
                else {
                    this.selectedScenario.stepDefinitions.then[stepIndex].values[valueIndex] = input;
                }
                break;
            case 'example':
                this.selectedScenario.stepDefinitions.example[stepIndex].values[valueIndex] = input;
                break;
            case 'addingExample':
                this.createExample(input, step, valueIndex);
                break;
        }
        this.selectedScenario.saved = false;
    }

    /**
     * Adds whether value is example or not
     * @param input
     * @param stepType
     * @param step
     * @param stepIndex
     * @param valueIndex
     */
     addIsExample(input, stepType: string, step: StepType, stepIndex: number, valueIndex: number) {
        if(input == true){
            input = 'example'
        }
        switch (stepType) {
            case 'given':
                this.selectedScenario.stepDefinitions.given[stepIndex].isExample[valueIndex] = (input == 'example') ? true : false;
                break;
            case 'when':
                this.selectedScenario.stepDefinitions.when[stepIndex].isExample[valueIndex] = (input == 'example') ? true : false;
                break;
            case 'then':
                this.selectedScenario.stepDefinitions.then[stepIndex].isExample[valueIndex] = (input == 'example') ? true : false;
                break;
        }
     }

    /**
     * 
     * @returns returns all examples in list
     */
    getExampleList(){
        console.log(this.selectedScenario.stepDefinitions.example && this.selectedScenario.stepDefinitions.example.length && this.selectedScenario.stepDefinitions.example[0].values.length)
        if(this.selectedScenario.stepDefinitions.example && this.selectedScenario.stepDefinitions.example.length && this.selectedScenario.stepDefinitions.example[0].values.length){
            return this.selectedScenario.stepDefinitions.example[0].values
        }
        return undefined
    }

    /**
     * Rename an example
     * @param newName 
     * @param index index of example in values array
     */
    renameExample(newName, index){
        let oldName = this.selectedScenario.stepDefinitions.example[0].values[index]
        this.selectedScenario.stepDefinitions.example[0].values[index] = newName
        this.exampleChild.updateTable();

        this.selectedScenario.stepDefinitions.given.forEach((value, index) => {
            value.values.forEach((val, i) => {
              if(val == '<'+oldName+'>') {
                this.selectedScenario.stepDefinitions.given[index].values[i] = '<'+newName+'>'
              }
            })
          })

          this.selectedScenario.stepDefinitions.when.forEach((value, index) => {
            value.values.forEach((val, i) => {
              if(val == '<'+oldName+'>') {
                this.selectedScenario.stepDefinitions.when[index].values[i] = '<'+newName+'>'
              }
            })
          })

        this.selectedScenario.stepDefinitions.then.forEach((value, index) => {
            value.values.forEach((val, i) => {
              if(val == '<'+oldName+'>') {
                this.selectedScenario.stepDefinitions.then[index].values[i] = '<'+newName+'>'
              }
            })
          })
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
        //const cutInput = input.substr(1, input.length - 2);
        this.handleExamples(input, step, valueIndex);
    }

    /**
     * Handles the update for examples
     * @param input
     * @param step
     * @param valueIndex
     */
    handleExamples(input: string, step: StepType, valueIndex: number) {
        // changes example header name if the name is just changed in step
        if (this.exampleHeaderChanged(input, step, valueIndex)) {
            this.uncutInputs[this.uncutInputs.indexOf(step.values[valueIndex])] = input;
            this.selectedScenario.stepDefinitions.example[0].values[this.selectedScenario.stepDefinitions.example[0].values.indexOf(step.values[valueIndex].substr(1, step.values[valueIndex].length - 2))] = input;
        } else {
            this.uncutInputs.push(input);
            // for first example creates 2 steps
            if (this.selectedScenario.stepDefinitions.example[0] === undefined) {
                this.createFirstExample(input, step);
            } else {
                // else just adds as many values to the examples to fill up the table
                this.fillExamples(input, step);
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

    addRowToExamples(){
        let row = JSON.parse(JSON.stringify(this.selectedScenario.stepDefinitions.example[0]))
        row.values.forEach((value, index) => {
            row.values[index] = 'value'
        });
        this.selectedScenario.stepDefinitions.example.push(row)
        this.exampleChild.updateTable();
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
    setDaisyAutoLogout($event: Event,  checkValue: boolean) {
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
     * Sort the step types for its id
     * @returns
     */
    sortedStepTypes() {
        if (this.originalStepTypes) {
            const sortedStepTypes =  this.originalStepTypes;
            sortedStepTypes.sort((a, b) => {
                return a.id - b.id;
            });
            return sortedStepTypes;
        }
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

    openNewExample(step) {
        console.log(this.newExampleModal)
        this.newExampleModal.openNewExampleModal(this.selectedStory, step);
    }

}
