import { Component, OnInit, OnChanges, SimpleChanges, ChangeDetectionStrategy, inject, output, input, viewChild, signal, effect, untracked } from '@angular/core';
import { ApiService } from '../Services/api.service';
import { Story } from '@seed-test/shared/models/Story';
import { Scenario } from '@seed-test/shared/models/Scenario';
import { StepType } from '@seed-test/shared/models/StepType';
import { StepDefinition } from '@seed-test/shared/models/StepDefinition';
import { NotificationService } from '../Services/notification.service';
import { Block } from '@seed-test/shared/models/Block';
import { RenameScenarioComponent } from '../modals/rename-scenario/rename-scenario.component';
import { CreateScenarioComponent } from '../modals/create-scenario/create-scenario.component';
import { ScenarioService } from '../Services/scenario.service';
import { BaseEditorComponent } from '../base-editor/base-editor.component';
import { BlockService } from '../Services/block.service';
import { firstValueFrom } from 'rxjs';
import { TitleCasePipe } from '@angular/common';
import { ExampleComponent } from '../example-table/example.component';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { onActionTrigger } from '../Services/action-trigger';


/**
 * Component of the Scenario Editor
 */
@Component({
	selector: 'app-scenario-editor',
	templateUrl: './scenario-editor.component.html',
	styleUrls: ['../base-editor/base-editor.component.css', './scenario-editor.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [BaseEditorComponent, ExampleComponent, RenameScenarioComponent, CreateScenarioComponent, TitleCasePipe, MatIconModule, MatTooltipModule]
})

export class ScenarioEditorComponent implements OnInit, OnChanges{
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
	// eslint-disable-next-line @angular-eslint/no-input-rename
	protected readonly selectedScenarioInput = input.required<Scenario>({ alias: 'selectedScenario' });
	/** Plain signal — updated by effect when input changes; avoids linkedSignal race conditions */
	readonly selectedScenario = signal<Scenario | null>(null);

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
	lastStepId!: number;

	indexOfExampleToDelete!: number;
	scenarioToUpdate!: Scenario;
	readonly TEMPLATE_NAME = 'scenario';

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
	readonly blocks = signal<Block[]>([]);

	/**
      * Currently selected block
      */
	selectedBlock!: Block;

	/**
	 * Reacts to run-save-option trigger -- saves and runs the scenario.
	 * Queued per request, so this editor (re-created on every scenario selection) does not replay an earlier request.
	 */
	private runSaveOptionEffect = onActionTrigger(
		this.apiService.runSaveOptionTrigger,
		option => {
			if (option == 'saveScenario')
				this.saveRunOption();
		}
	);

	/**
	 * Reacts to rename-scenario trigger -- updates scenario name.
	 * The handler runs untracked: renameScenario() reads the selection, which would otherwise rename the next selected scenario.
	 */
	private renameScenarioEffect = onActionTrigger(this.scenarioService.renameScenarioTrigger, newName => {
		if (!newName) return;
		this.renameScenario(newName);
	});

	/** Selects the scenario when the selectedScenario input changes (replaces ngOnChanges block) */
	private selectedScenarioInputEffect = effect(() => {
		const newScenario = this.selectedScenarioInput();
		// Guard: skip when input is undefined (e.g., initial load or no scenario selected)
		if (!newScenario) return;
		untracked(() => this.selectScenario(newScenario));
	});

	/**
	 * Reacts to block updates -- reloads blocks from backend
	 */
	private updateBlocksEffect = effect(() => {
		const trigger = this.blockService.updateBlocksTrigger();
		if (trigger === 0) return;
		untracked(() => this.reloadBlocks());
	});

	/** Fetches blocks from the backend and updates the local signal */
	private async reloadBlocks() {
		const id = localStorage.getItem('id');
		if (!id) return;
		const resp = await firstValueFrom(this.blockService.getBlocks(id));
		this.blocks.set(resp);
	}

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
	readonly addScenarioEvent = output<string>();

	/**
     * Event emitter to run a test
     */
	readonly runTestScenarioEvent = output<{ scenarioId: number }>();

	/**
     * Scenario navigation events
     */
	readonly navigateLeft = output<void>();
	readonly navigateRight = output<void>();


	/**
    * Loads initial blocks on component init
    */
	ngOnInit() {
		const id = localStorage.getItem('id');
		if (!id) return;
		this.blockService.getBlocks(id).subscribe({
			next: (resp) => {
				this.blocks.set(resp);
			},
			error: () => this.notify.error('Could not load blocks', 'Blocks')
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
        

		// selectedScenario is now a signal input — handled by selectedScenarioInputEffect
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
		this.scenarioToUpdate = this.selectedScenario()!;
		const storyIdUpdate = this.selectedStory()._id;
		delete this.scenarioToUpdate.hasRefBlock;
		delete this.scenarioToUpdate.saved;

		Object.keys(this.scenarioToUpdate.stepDefinitions).forEach((key, _) => {
			(this.scenarioToUpdate.stepDefinitions as unknown as Record<string, StepType[]>)[key].forEach((step: StepType) => {
				delete step.checked;
				if (step.outdated) 
					step.outdated = false;
                
			});
		});

		this.scenarioToUpdate.lastTestPassed = undefined;
		this.checkOnReferences(this.scenarioToUpdate);
		return new Promise<void>((resolve, _reject) => {
			this.scenarioService
				// storyIdUpdate comes from selectedStory()._id above
				.updateScenario(storyIdUpdate!, this.scenarioToUpdate)
				.subscribe({
					next: _resp => {
						this.updateReferences(this.scenarioToUpdate);
						this.scenarioService.scenarioChangedEmitter();
						this.notify.success('successfully saved', 'Scenario');

						resolve();
					},
					// Not resolved on failure: saveRunOption awaits this promise, so no run starts against an unsaved scenario
					error: () => this.notify.error('Could not save scenario', 'Scenario')
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
				for (const block of this.blocks())
					if (block._id === step._blockReferenceId && block.usedAsReference == undefined){
						stepsReferences.push(step);
						block.usedAsReference = true;
						this.blockService.updateBlock(block)
							.subscribe({
								next: _ => {
									this.blockService.updateBlocksEmitter();
								},
								error: () => this.notify.error('Could not update block reference', 'Block')
							});
					}
          
        
		//If the reference was deleted
		if (stepsReferences.length == 0)
			this.blockService.deleteUpdateReferenceForBlock();
        
		return this.blocks();
     
	}

	addScenarioToStory(event: string) {
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
		this.deleteScenarioEvent.emit(this.selectedScenario()!);
	}

	/**
     * Save an example block
     *
     */
	saveExampleBlock() {
		const saveBlock: Record<string, StepType[]> = {given: [], when: [], then: [], example: []};
		const stepDefs = this.selectedScenario()!.stepDefinitions as unknown as Record<string, StepType[]>;
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
			this.selectedScenario()!.name = newTitle;

		this.selectedScenario()!.saved = false;
	}

	/**
     * Selects a scenario
     * @param scenario
     */
	selectScenario(scenario: Scenario | null) {
		if (scenario) 
			if (!scenario.multipleScenarios) 
				scenario.multipleScenarios = [];
            
        
		this.selectedScenario.set(scenario as Scenario);
		this.arrowLeft = this.checkArrowLeft();
		this.arrowRight = this.checkArrowRight();
	}

	/**
     * Checks if there exists a scenario before this one
     * @returns
     */
	checkArrowLeft(): boolean {
		const scenarioIndex = this.scenarios().indexOf(this.selectedScenario()!);
		return this.scenarios()[scenarioIndex - 1] === undefined;
	}

	/**
      * Checks if there exists a scenario after this one
      * @returns
      */
	checkArrowRight(): boolean {
		const scenarioIndex = this.scenarios().indexOf(this.selectedScenario()!);
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
		return this.testRunning || !this.selectedScenario() || this.selectedScenario()!.saved === undefined  || this.selectedScenario()!.saved;
	}

	/**
      * if the scenario is not saved
      * @returns
      */
	scenarioUnSaved() {
		if (!this.selectedScenario())
			return false;
		else
			return !(this.testRunning || this.selectedScenario()!.saved === undefined  || this.selectedScenario()!.saved);
         
	}

	/**
     * Change the comment
     * @param newComment
     */
	commentChange(newComment: string) {
		if (!this.selectedScenario()) return;
		this.selectedScenario()!.comment = newComment;
		this.selectedScenario()!.saved = false;
	}

	/**
      * Open Modal to rename the scenario
      */
	changeScenarioTitle() {
		if (!this.selectedScenario()) return;
		this.renameScenarioModal().openRenameScenarioModal(this.selectedScenario()!.name);
	}

	openCreateScenario() {
		this.createScenarioModal().openCreateScenarioModal(this.selectedStory());
	}

	/**
	 * Re-sets the scenario to a new reference after a block was inserted in place, so the OnPush header shows "Save Scenario"
	 */
	markScenarioUnsaved() {
		this.selectedScenario.update(s => (s ? { ...s, saved: false } : s));
	}

	blockSelectTrigger(block: StepType & { stepDefinitions?: StepDefinition }) {
		this.selectedBlock = this.blocks().find(i => i._id == block._blockReferenceId)!;
		block.stepDefinitions = this.selectedBlock?.stepDefinitions;
	}
}
