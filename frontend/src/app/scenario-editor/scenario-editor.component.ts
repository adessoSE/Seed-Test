import { Component, OnInit, Input, OnChanges, SimpleChanges, OnDestroy, ChangeDetectionStrategy, inject, output, input, viewChild } from '@angular/core';
import { ApiService } from '../Services/api.service';
import { Story } from '@shared/models/Story';
import { Scenario } from '@shared/models/Scenario';
import { StepType } from '@shared/models/StepType';
import { StepDefinition } from '@shared/models/StepDefinition';
import { NotificationService } from '../Services/notification.service';
import { Block } from '@shared/models/Block';
import { RenameScenarioComponent } from '../modals/rename-scenario/rename-scenario.component';
import { Subscription } from 'rxjs';
import { CreateScenarioComponent } from '../modals/create-scenario/create-scenario.component';
import { ScenarioService } from '../Services/scenario.service';
import { BaseEditorComponent } from '../base-editor/base-editor.component';
import { BlockService } from '../Services/block.service';
import { TitleCasePipe } from '@angular/common';
import { ExampleComponent } from '../example-table/example.component';


/**
 * Component of the Scenario Editor
 */
@Component({
    selector: 'app-scenario-editor',
    templateUrl: './scenario-editor.component.html',
    styleUrls: ['../base-editor/base-editor.component.css', './scenario-editor.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [BaseEditorComponent, ExampleComponent, RenameScenarioComponent, CreateScenarioComponent, TitleCasePipe]
})

export class ScenarioEditorComponent implements OnInit, OnChanges, OnDestroy{
	apiService = inject(ApiService);
	blockService = inject(BlockService);
	scenarioService = inject(ScenarioService);
	notify = inject(NotificationService);


	/**
     * Lists the scenarios which are to be displayed
     */
	readonly scenarios = input<Scenario[]>([]);

	/**
     * Sets a new selected story
     */
	readonly selectedStory = input.required<Story>();


	/**
     * ALT: Logic wandered to ngOnChanges.
     * @Input()
     * set newlySelectedScenario(scenario: Scenario) {
     * this.selectedScenario = scenario;
     * if (this.selectedStory && scenario) {
     * this.selectScenario(scenario);
     * }
     * }
     */
	@Input() selectedScenario!: Scenario;

	readonly isReviewing = input<boolean>(false);

	testRunning!: boolean;

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
	lastStepId: any;

	indexOfExampleToDelete!: number;
	scenarioToUpdate!: Scenario;
	readonly TEMPLATE_NAME = 'scenario';

	/**
     * Subscriptions for all EventEmitter
     */
	runSaveOptionObservable!: Subscription;
	renameScenarioObservable!: Subscription;
	updateRefObservable!: Subscription;
	updateScenariObservable!: Subscription;

	readonly isDark = input(false);

	/**
     * View child of the modals component
     */
	readonly renameScenarioModal = viewChild.required<RenameScenarioComponent>('renameScenarioModal');
	readonly createScenarioModal = viewChild.required<CreateScenarioComponent>('createScenarioModal');
	readonly baseEditor = viewChild.required<BaseEditorComponent>('baseEditor');

	/**
     * Original step types not sorted or changed
     */
	readonly originalStepTypes = input<StepType[]>([]);
    
	/**
     * List of Blocks
     */
	blocks!: Block[];

	/**
      * Currently selected block
      */
	selectedBlock!: Block;

	/**
     * Event emitter to delete the scenario
     */
	readonly deleteScenarioEvent = output<Scenario>();

	/**
     * Event emitter to select a new scenario
     */
	readonly selectNewScenarioEvent = output<Scenario>();

	/**
     * Event emitter to add a new scenario
     */
	readonly addScenarioEvent = output<any>();

	/**
     * Event emitter to run a test
     */
	readonly runTestScenarioEvent = output<any>();

	/**
     * Scenario navigation events
     */
	readonly navigateLeft = output<void>();
	readonly navigateRight = output<void>();


	/**
    * Subscribes to all necessary events
    */
	ngOnInit() {
		const id = localStorage.getItem('id')!;
		this.blockService.getBlocks(id).subscribe((resp) => {
			this.blocks = resp;
		});
		this.runSaveOptionObservable = this.apiService.runSaveOptionEvent.subscribe(option => {
			if (option == 'saveScenario') 
				this.saveRunOption();
            
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

	/**
     * Will be called, when an @Input value is changing
     */
	ngOnChanges(changes: SimpleChanges) {
		// When a new scenarioList is being transferred (used for usual Scenarios and AI)
		const scenarios = this.scenarios();
  if (changes['scenarios']) 
			if (scenarios && scenarios.length > 0) 
				this.selectScenario(scenarios[0]);
			else 
				this.selectScenario(null);
        

		// When a specific scenario is selected
		if (changes['selectedScenario']) {
			const newScenario = changes['selectedScenario'].currentValue;
			if (newScenario) 
				this.selectScenario(newScenario);
            
		}
	}

	ngOnDestroy() {
		if (this.runSaveOptionObservable && !this.runSaveOptionObservable.closed) 
			this.runSaveOptionObservable.unsubscribe();
        
		if (this.renameScenarioObservable && !this.renameScenarioObservable.closed) 
			this.renameScenarioObservable.unsubscribe();
        
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
	updateScenario(scenario?: Scenario, storyId?: string) {
		let storyIdUpdate;
		let updatingWithReferences: boolean;
		if (scenario && storyId){
			this.scenarioToUpdate = scenario;
			storyIdUpdate = storyId;
			updatingWithReferences = true;
		} else {
			this.scenarioToUpdate = this.selectedScenario;
			storyIdUpdate = this.selectedStory()._id;
			updatingWithReferences = false;
		}
		delete this.scenarioToUpdate.hasRefBlock; 
		delete this.scenarioToUpdate.saved;
		let steps = this.scenarioToUpdate.stepDefinitions.given;
		steps = steps.concat(this.scenarioToUpdate.stepDefinitions.when);
		steps = steps.concat(this.scenarioToUpdate.stepDefinitions.then);
		steps = steps.concat(this.scenarioToUpdate.stepDefinitions.example || []);

		let undefined_steps: StepType[] = [];
		for (const element of steps) 
			if (element !== undefined) 
				if (String(element['type']).includes('Undefined Step')) 
					undefined_steps = undefined_steps.concat(element);
        

		Object.keys(this.scenarioToUpdate.stepDefinitions).forEach((key, _) => {
			(this.scenarioToUpdate.stepDefinitions as unknown as Record<string, StepType[]>)[key].forEach((step: StepType) => {
				delete step.checked;
				if (step.outdated) 
					step.outdated = false;
                
			});
		});
		if (undefined_steps.length != 0) 
			console.log('There are undefined steps here');
        

		this.scenarioToUpdate.lastTestPassed = undefined;
		this.checkOnReferences(this.scenarioToUpdate);
		return new Promise<void>((resolve, _reject) => {
			this.scenarioService
				.updateScenario(storyIdUpdate, this.scenarioToUpdate)
				.subscribe(_resp => {
					this.updateReferences(this.scenarioToUpdate);
					this.scenarioService.scenarioChangedEmitter();
					if (!updatingWithReferences)
						this.notify.success('successfully saved', 'Scenario');
                
					resolve();
				});
		});
	}
	/**
    * Update/Check for reference
    * @param scenario
    * @param blocks
    */
	updateReferences(scenario: Scenario){
		const stepsReferences = [];
		const stepDefs = scenario.stepDefinitions as unknown as Record<string, StepType[]>;
		for (const prop in stepDefs)
			for (const step of stepDefs[prop])
				for (const block of this.blocks) 
					if (block._id === step._blockReferenceId && block.usedAsReference == undefined){
						stepsReferences.push(step);
						block.usedAsReference = true;
						this.blockService.updateBlock(block)
							.subscribe(_ => {
								this.blockService.updateBlocksEvent.emit();
							});
					}
          
        
		//If the reference was deleted
		if (stepsReferences.length == 0)
			this.blockService.deleteUpdateReferenceForBlock();
        
		return this.blocks;
     
	}

	addScenarioToStory(event: any) {
		const scenarioName = event;
		this.addScenarioEvent.emit(scenarioName);
	}
	/**
    * Checking if the scenario has a reference when saving
    * @param scenario
    */
	checkOnReferences(scenario: Scenario){
		const stepDefs = scenario.stepDefinitions as unknown as Record<string, StepType[]>;
		for (const prop in stepDefs)
			for (const step of stepDefs[prop])
				if (step._blockReferenceId)
					this.scenarioToUpdate.hasRefBlock = true;
              
        
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
		const saveBlock: Record<string, StepType[]> = {given: [], when: [], then: [], example: []};
		const stepDefs = this.selectedScenario.stepDefinitions as unknown as Record<string, StepType[]>;
		for (const prop in stepDefs)
			for (let s = 0; s < stepDefs[prop].length; s++)
				if ((prop == 'example' && stepDefs[prop][s].checked) || this.includesExampleStep(stepDefs[prop][s]))
					saveBlock[prop].push(stepDefs[prop][s]);
				
			
		const _block: Block = {stepDefinitions: saveBlock as unknown as StepDefinition};
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
			if (element[0] == '<' && element[element.length - 1] == '>') 
				includesExample = true;
            
		});
		return includesExample;
	}

	/**
     * Renames the scenario
     * @param newTitle
     */
	renameScenario(newTitle: string) {
		if (newTitle && newTitle.replace(/\s/g, '').length > 0) 
			this.selectedScenario.name = newTitle;
        
		this.selectedScenario.saved = false;
	}

	/**
     * Selects a scenario
     * @param scenario
     */
	selectScenario(scenario: Scenario | null) {
		if (scenario) 
			if (!scenario.multipleScenarios) 
				scenario.multipleScenarios = [];
            
        
		this.selectedScenario = scenario as Scenario;
		this.arrowLeft = this.checkArrowLeft();
		this.arrowRight = this.checkArrowRight();
	}

	/**
     * Checks if there exists a scenario before this one
     * @returns
     */
	checkArrowLeft(): boolean {
		const scenarioIndex = this.scenarios().indexOf(this.selectedScenario);
		return this.scenarios()[scenarioIndex - 1] === undefined;
	}

	/**
     * Checks if there exists a scenario after this one
     * @returns
     */
	checkArrowRight(): boolean {
		const scenarioIndex = this.scenarios().indexOf(this.selectedScenario);
		return this.scenarios()[scenarioIndex + 1] === undefined;
	}

	/**
     * Select the scenario before
     */
	scenarioShiftLeft() {
		this.navigateLeft.emit();
	}

	/**
     * Selects the next scenario
     */
	scenarioShiftRight() {
		this.navigateRight.emit();
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
			return false;
		else 
			return !(this.testRunning || this.selectedScenario.saved === undefined  || this.selectedScenario.saved);
        
	}

	/**
     * Change the comment
     * @param newComment
     */
	commentChange(newComment: string) {
		this.selectedScenario.comment = newComment;
		this.selectedScenario.saved = false;
	}

	/**
     * Open Modal to rename the scenario
     */
	changeScenarioTitle() {
		this.renameScenarioModal().openRenameScenarioModal(this.selectedScenario.name);
	}

	openCreateScenario() {
		this.createScenarioModal().openCreateScenarioModal(this.selectedStory());
	}

	blockSelectTrigger(block: any) {
		this.selectedBlock = this.blocks.find(i => i._id == block._blockReferenceId)!;
		block.stepDefinitions = this.selectedBlock?.stepDefinitions;
	}
}