import {Component, OnInit, Input, ViewChild, EventEmitter, Output, DoCheck, OnDestroy, AfterViewInit, TemplateRef, QueryList, ElementRef, ViewChildren} from '@angular/core';
import { ApiService } from '../Services/api.service';
import { Story } from '../model/Story';
import { Scenario } from '../model/Scenario';
import { StepType } from '../model/StepType';
import { ToastrService } from 'ngx-toastr';
import { Block } from '../model/Block';
import { RenameScenarioComponent } from '../modals/rename-scenario/rename-scenario.component';
import { Subscription } from 'rxjs';
import { CreateScenarioComponent } from '../modals/create-scenario/create-scenario.component';
import { BaseEditorComponent } from '../base-editor/base-editor.component';
import { NewExampleComponent } from './../modals/new-example/new-example.component';
import * as e from 'express';
import { ExampleTableComponent } from '../example-table/example-table.component';
import { NewStepRequestComponent } from '../modals/new-step-request/new-step-request.component';
import { SaveBlockFormComponent } from '../modals/save-block-form/save-block-form.component';
import { AddBlockFormComponent } from '../modals/add-block-form/add-block-form.component';


/**
 * Component of the Scenario Editor
 */
@Component({
    selector: 'app-scenario-editor',
    templateUrl: './scenario-editor.component.html',
    styleUrls: ['../base-editor/base-editor.component.css','./scenario-editor.component.css'],
})

export class ScenarioEditorComponent extends BaseEditorComponent implements OnInit, DoCheck, AfterViewInit {

	/**
     * Constructor
     * @param apiService
     * @param toastr
     */
	 constructor(
        apiService: ApiService,
        toastr: ToastrService
    ) {
        super(toastr, apiService);
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
    //uncutInputs: string[] = [];

    /**
     * if the example action bar is active
     */
    activeExampleActionBar = false;

    /**
     * If all example steps are checked
     */
    allExampleChecked = false;

    /**
     * Block of example saved to the clipboard
     */
    clipboardExampleBlock: Block = null;


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

	clipboardBlock;

    readonly TEMPLATE_NAME ='scenario';

    /**
     * Subscribtions for all EventEmitter
     */
    runSaveOptionObservable: Subscription;
    addBlocktoScenarioObservable: Subscription;
    renameScenarioObservable: Subscription;
    //newExampleObservable: Subscription;
    //renameExampleObservable: Subscription;
    
    //public dragging: DragRef = null;

    @Input() isDark: boolean;


    /**
     * View child of the example table
     */
    //@ViewChild('exampleChildView') exampleChild: ExampleTableComponent;

    /**
     * View child of the modals component
     */
		//@ViewChild('saveBlockModal') saveBlockModal: SaveBlockFormComponent;
		//@ViewChild('addBlockModal')addBlockModal: AddBlockFormComponent;
    @ViewChild('renameScenarioModal') renameScenarioModal: RenameScenarioComponent;
    @ViewChild('createScenarioModal') createScenarioModal: CreateScenarioComponent;
    //@ViewChild('newExampleModal') newExampleModal: NewExampleComponent;
		//@ViewChild('newStepRequest') newStepRequest: NewStepRequestComponent;


		//@ViewChildren('step_type_input1') step_type_input1: QueryList<ElementRef>;
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

    ngAfterViewInit(): void {
      /* this.step_type_input1.changes.subscribe(_ => {
				this.step_type_input1.forEach(in_field => {  
					if ( in_field.nativeElement.id === this.lastToFocus) {
						in_field.nativeElement.focus();
					}
				});
				this.lastToFocus = '';
			});
			 */
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

			/* this.addBlocktoScenarioObservable = this.apiService.addBlockToScenarioEvent.subscribe(block => {
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
			}); */ 

        this.renameScenarioObservable = this.apiService.renameScenarioEvent.subscribe(newName => this.renameScenario(newName));
        //this.newExampleObservable = this.apiService.newExampleEvent.subscribe(value => {super.addToValues(value.name, 0,0, 'addingExample')});
        //this.renameExampleObservable = this.apiService.renameExampleEvent.subscribe(value =>{this.renameExample(value.name, value.column)});
        
    }

    ngOnDestroy() {
        if (!this.runSaveOptionObservable.closed) {
            this.runSaveOptionObservable.unsubscribe();
        }
        /* if (!this.addBlocktoScenarioObservable.closed) {
            this.addBlocktoScenarioObservable.unsubscribe();
        } */ 
        if (!this.renameScenarioObservable.closed) {
            this.renameScenarioObservable.unsubscribe();
        }
        /* if (!this.newExampleObservable.closed) {
            this.newExampleObservable.unsubscribe();
        }
        if (!this.renameExampleObservable.closed) {
            this.renameExampleObservable.unsubscribe();
        } */ 
    }


		/* addToValues(input: string, stepIndex: number, valueIndex: number, stepType: string, step?: StepType): void {
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
          this.handleExamples(input, step);
          break;
			}

			this.selectedScenario.saved = false;
		} */

		/* insertCopiedBlock(): void {
			Object.keys(this.clipboardBlock.stepDefinitions).forEach((key, index) => {
				this.clipboardBlock.stepDefinitions[key].forEach((step: StepType, j) => {
					if (key != 'example') {
						this.selectedScenario.stepDefinitions[key].push(JSON.parse(JSON.stringify(step)));
					}
				});
			});
			this.selectedScenario.saved = false;
		} */

		/* copyBlock(): void {
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
      const scenarioBlock: Block = {stepDefinitions: copyBlock};
        sessionStorage.setItem('scenarioBlock', JSON.stringify(scenarioBlock));
      this.allChecked = false;
      this.activeActionBar = false;
      this.toastr.success('successfully copied', 'Step(s)');
		
		} */

		/* removeStep(): void {
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
		} */

		/* deactivateStep(): void {
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
		} */

		/* saveBlock(temp_name: any): void {
			this.saveBlock(temp_name);
		} */

		/* addStep(step: StepType, storyOrScenario: any, templateName: any, step_idx?: any): void {
			let lastEl;
    	let newStep;
			newStep = this.createNewStep(step, storyOrScenario.stepDefinitions);
			if (newStep['type'] === this.newStepName) {
				this.newStepRequest.openNewStepRequestModal(newStep['stepType']);
			} else {
				switch (newStep.stepType) {
					case 'given':
						storyOrScenario.stepDefinitions.given.push(newStep);
						lastEl = storyOrScenario.stepDefinitions.given.length-1;
						this.lastToFocus = templateName+'_'+step_idx+'_input_pre_'+ lastEl;
						break;
					case 'when':
						storyOrScenario.stepDefinitions.when.push(newStep);
						lastEl = storyOrScenario.stepDefinitions.when.length-1;
						this.lastToFocus = templateName+'_'+step_idx+'_input_pre_'+ lastEl;
						break;
					case 'then':
						storyOrScenario.stepDefinitions.then.push(newStep);
						lastEl = storyOrScenario.stepDefinitions.then.length-1;
						this.lastToFocus = templateName+'_'+step_idx+'_input_pre_'+ lastEl;
						break;
					case 'example':
						this.addExampleStep(step);
						break;
					default:
						break;
				}
				storyOrScenario.saved = false;
			} 
		} */


    /**
     * If a step from the example should be removed
     * @param index
     */
    /* @Input()
    removeRowIndex(index) {
      super.removeStep('scenario');
      this.selectedScenario.saved = false;
    } */

    /**
     * Checks for an example step
     * @param index
     */
    /* @Input()
    checkRowIndex(index: number) {
      this.checkExampleStep(this.selectedScenario.stepDefinitions.example[index], null);
    }  */

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
    /* addExampleStep(step: StepType) {
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
    } */

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
        sessionStorage.setItem('copiedExampleBlock', JSON.stringify(block));
        this.allExampleChecked = false;
        this.activeExampleActionBar = false;
        this.toastr.success('successfully copied', 'Examples');
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
    /* checkAllExampleSteps(checkValue: boolean) {
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
    } */
    
    /**
     * Checks an example step
     * @param step
     * @param checkValue
     */
    /* checkExampleStep(step, checkValue: boolean) {
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
    } */

    /**
     * remove step from examples
     */
    /* removeStepFromExample() {
        for (let i = this.selectedScenario.stepDefinitions.example.length - 1; i >= 1; i--) {
            if (this.selectedScenario.stepDefinitions.example[i].checked) {
                this.selectedScenario.stepDefinitions.example.splice(i, 1);
                this.exampleChild.updateTable();
            }
        }
        this.selectedScenario.saved = false;
        this.allExampleChecked = false;
        this.activeExampleActionBar = false;
    } */

    /**
     * Checks the input if an example should be generated or removed
     * @param input
     * @param stepType
     * @param step
     * @param stepIndex
     * @param valueIndex
     */
    /* addIsExample(input, stepIndex: number, valueIndex: number, stepType?: string, step?: StepType) {
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
    } */

    /**
     * List all examples from scenario
     * @returns returns all examples in list
     */
    /* getExampleList(){
			if(this.selectedScenario.stepDefinitions.example && this.selectedScenario.stepDefinitions.example.length && this.selectedScenario.stepDefinitions.example[0].values.length){
				return this.selectedScenario.stepDefinitions.example[0].values
			}
      return undefined
    } */

    /**
     * Handles the update for examples
     * @param input
     * @param step
     * @param valueIndex
     */
    /* handleExamples(input: string, step: StepType, valueIndex?: number) {
      this.uncutInputs.push(input);
      // for first example creates 2 steps
			if (this.selectedScenario.stepDefinitions.example[0] === undefined) {
				this.createFirstExample(input, step);
			} else {
				// else just adds as many values to the examples to fill up the table
				this.fillExamples(input, step);
			}

    } */

    /**
     * Creates the first example of the scenario
     * @param cutInput
     * @param step
     */
    createFirstExample(cutInput: string, step: StepType) {
      for (let i = 0; i <= 2; i++) {
				const newStep = this.createNewStep(step, this.selectedScenario.stepDefinitions, 'example');
				this.selectedScenario.stepDefinitions.example.push(newStep);
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
    /* fillExamples(cutInput: string, step: StepType) {
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
      this.exampleChild.updateTable()
    } */
    /**
     * Adds a value to every example
     */
    addRowToExamples(){
        let row = JSON.parse(JSON.stringify(this.selectedScenario.stepDefinitions.example[0]))
        row.values.forEach((value, index) => {
            row.values[index] = 'value'
        });
        this.selectedScenario.stepDefinitions.example.push(row)
        this.exampleChild.updateTable();
    }

    /**
     * Insert a copied block to the example block
     */
    insertCopiedExampleBlock() {
        Object.keys(this.clipboardExampleBlock.stepDefinitions).forEach((key, index) => {
            this.clipboardExampleBlock.stepDefinitions[key].forEach((step: StepType, j) => {
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
                }
            });
        });
          this.selectedScenario.saved = false;
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
        console.log(this.createScenarioModal)
        this.createScenarioModal.openCreateScenarioModal(this.selectedStory);
    }

    openNewExample(step) {
      console.log(this.newExampleModal)
      this.newExampleModal.openNewExampleModal(this.selectedScenario, step);
    } 

	/**
    * Rename an example
    * @param newName 
    * @param index index of example in values array
    */
	/* renameExample(newName, index){
		let oldName = this.selectedScenario.stepDefinitions.example[0].values[index]
		this.selectedScenario.stepDefinitions.example[0].values[index] = newName
		this.uncutInputs[this.uncutInputs.indexOf('<'+oldName+'>')] = '<'+newName+'>';
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
	} */
	

}
