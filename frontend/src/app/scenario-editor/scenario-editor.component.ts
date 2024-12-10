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
import { BaseEditorComponent } from '../base-editor/base-editor.component';
import { BlockService } from '../Services/block.service';


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
        public blockService: BlockService,
        public scenarioService: ScenarioService,
        public toastr: ToastrService
    ) {}

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
        if (this.selectedStory && scenario) {
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
     * Current step of scenario as ngModel for dropdown
     */
    currentStepNgModel = null;

    /**
     * Last step id after adding new step 
     */
    lastStepId;

    indexOfExampleToDelete;
    scenarioToUpdate: Scenario;
    readonly TEMPLATE_NAME ='scenario';

    /**
     * Subscriptions for all EventEmitter
     */
    runSaveOptionObservable: Subscription;
    renameScenarioObservable: Subscription;
    updateRefObservable: Subscription;
    updateScenariObservable: Subscription;

    @Input() isDark: boolean;

    /**
     * View child of the modals component
     */
    @ViewChild('renameScenarioModal') renameScenarioModal: RenameScenarioComponent;
    @ViewChild('createScenarioModal') createScenarioModal: CreateScenarioComponent;
    @ViewChild('baseEditor') baseEditor: BaseEditorComponent;

    /**
     * Original step types not sorted or changed
     */
    @Input() originalStepTypes: StepType[];
    
    /**
     * List of Blocks
     */
    blocks: Block [];

    /**
      * Currently selected block
      */
    selectedBlock: Block;

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

   /**
    * Subscribes to all necessary events
    */
    ngOnInit() {
        const id = localStorage.getItem('id');
        this.blockService.getBlocks(id).subscribe((resp) => {
            this.blocks = resp;
          });
		this.runSaveOptionObservable = this.apiService.runSaveOptionEvent.subscribe(option => {
            if (option == 'saveScenario') {
                this.saveRunOption();
            }
        });
        this.renameScenarioObservable = this.scenarioService.renameScenarioEvent.subscribe(newName => this.renameScenario(newName));
        this.updateRefObservable = this.blockService.updateBlocksEvent.subscribe(_ => {
            this.blockService.getBlocks(id).subscribe((resp) => {
              this.blocks = resp;
            });
          });
        //currently not used
        this.updateScenariObservable = this.blockService.updateScenariosRefEvent.subscribe(element =>{
            this.updateScenario(element[0], element[1]);
        });
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
    updateScenario(scenario? : Scenario, storyId?) {
        let storyIdUpdate;
        let updatingWithReferences: boolean;
        if (scenario && storyId){
            this.scenarioToUpdate = scenario;
            storyIdUpdate = storyId;
            updatingWithReferences = true;
        }
        else{
            this.scenarioToUpdate = this.selectedScenario;
            storyIdUpdate = this.selectedStory._id;
            updatingWithReferences = false;
        }
        delete this.scenarioToUpdate.hasRefBlock 
        delete this.scenarioToUpdate.saved;
        let steps = this.scenarioToUpdate.stepDefinitions['given'];
        steps = steps.concat(this.scenarioToUpdate.stepDefinitions['when']);
        steps = steps.concat(this.scenarioToUpdate.stepDefinitions['then']);
        steps = steps.concat(this.scenarioToUpdate.stepDefinitions['example']);

        let undefined_steps = [];
        for (const element of steps) {
            if(element !== undefined) {
                if (String(element['type']).includes('Undefined Step')) {
                    undefined_steps = undefined_steps.concat(element);
                }
            }
        }

        Object.keys(this.scenarioToUpdate.stepDefinitions).forEach((key, _) => {
            this.scenarioToUpdate.stepDefinitions[key].forEach((step: StepType) => {
                delete step.checked;
                if (step.outdated) {
                    step.outdated = false;
                }
            });
        });
        if (undefined_steps.length != 0) {
            console.log('There are undefined steps here');
        }

        this.scenarioToUpdate.lastTestPassed = null;
        this.checkOnReferences(this.scenarioToUpdate);
        return new Promise<void>((resolve, _reject) => {this.scenarioService
            .updateScenario(storyIdUpdate, this.scenarioToUpdate)
            .subscribe(_resp => {
                this.updateReferences(this.scenarioToUpdate);
                this.scenarioService.scenarioChangedEmitter();
                if(!updatingWithReferences){
                    this.toastr.success('successfully saved', 'Scenario');
                }
                resolve();
            });
        });
    }
    /**
    * Update/Check for reference
    * @param scenario
    * @param blocks
    */
    updateReferences(scenario){
        const stepsReferences = [];
        for (const prop in scenario.stepDefinitions) {
          for (const step of scenario.stepDefinitions[prop]) {
            for (const block of this.blocks) {
                if(block._id === step._blockReferenceId && block.usedAsReference == undefined){
                    stepsReferences.push(step);
                    block.usedAsReference = true;
                    this.blockService.updateBlock(block)
                    .subscribe(_ => {
                      this.blockService.updateBlocksEvent.emit();
                    });
                }
            }  
          }
        }
        //If the reference was deleted
        if(stepsReferences.length == 0){
            this.blockService.deleteUpdateReferenceForBlock();
        }
        return this.blocks;
     
    }

    addScenarioToStory(event) {
        const scenarioName = event;
        this.addScenarioEvent.emit(scenarioName);
    }
    /**
    * Checking if the scenario has a reference when saving
    * @param scenario
    */
    checkOnReferences(scenario){
        for (const prop in scenario.stepDefinitions) {
            for (const step of scenario.stepDefinitions[prop]) {
                if(step._blockReferenceId){
                    this.scenarioToUpdate.hasRefBlock = true;
                }
            }  
        }
        return this.scenarioToUpdate;
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
     * if the scenario is not saved
     * @returns
     */
    scenarioUnSaved() {
        if (this.selectedScenario == null)
            return false
        else {
            return !(this.testRunning || this.selectedScenario.saved === undefined  || this.selectedScenario.saved);
        }
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

    blockSelectTrigger(block) {
        this.selectedBlock =  this.blocks.find(i => i._id == block._blockReferenceId);
        block.stepDefinitions = this.selectedBlock?.stepDefinitions;
    }
}