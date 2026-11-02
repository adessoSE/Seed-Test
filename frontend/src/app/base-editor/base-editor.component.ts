import { ApiService } from 'src/app/Services/api.service';
import { CdkDragDrop, CdkDragStart, DragRef, moveItemInArray, CdkDropList, CdkDrag, CdkDragHandle, CdkDragPreview } from '@angular/cdk/drag-drop';
import { Component, ElementRef, OnInit, DoCheck, AfterViewChecked, AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, inject, output, input, viewChildren, viewChild, effect, signal, untracked } from '@angular/core';
import { NotificationService } from '../Services/notification.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent, ConfirmDialogData } from '../modals/confirm-dialog/confirm-dialog.component';
import { AddBlockFormComponent } from '../modals/add-block-form/add-block-form.component';
import { NewStepRequestComponent } from '../modals/new-step-request/new-step-request.component';
import { SaveBlockFormComponent } from '../modals/save-block-form/save-block-form.component';
import { Block } from '@seed-test/shared/models/Block';
import { Scenario } from '@seed-test/shared/models/Scenario';
import { StepDefinition } from '@seed-test/shared/models/StepDefinition';
import { StepDefinitionBackground } from '@seed-test/shared/models/StepDefinitionBackground';
import { StepType } from '@seed-test/shared/models/StepType';
import { Story } from '@seed-test/shared/models/Story';
import { BlockService } from '../Services/block.service';

import { ExampleTableComponent } from '../example-table/example-table.component';
import { NewExampleComponent } from '../modals/new-example/new-example.component';
import { ExampleService } from '../Services/example.service';
import { onActionTrigger } from '../Services/action-trigger';
import { ScenarioService } from '../Services/scenario.service';
import { BackgroundService } from '../Services/background.service';
import type { EditBlockComponent } from '../modals/edit-block/edit-block.component';
import { ThemingService } from '../Services/theming.service';
import { HighlightInputService } from '../Services/highlight-input.service';
import { firstValueFrom } from 'rxjs';
import { FileExplorerModalComponent } from '../modals/file-explorer-modal/file-explorer-modal.component';
import { MultipleScenario } from '@seed-test/shared/models/MuiltipleScenario';
import { StepValidationService } from '../Services/step-validation.service';
import { NgTemplateOutlet, NgClass, SlicePipe } from '@angular/common';
import { MatFormField, MatSelect, MatOption } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle, MatExpansionPanelDescription } from '@angular/material/expansion';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';

/**
 * Shape of the drag data attached to a step during drag-and-drop reordering
 * (see dragStarted/onDrop) — carries the multi-select indices being moved.
 */
interface StepDragData {
	indices: { index: number; value: StepType }[] | null | undefined;
	values: number[];
	source: BaseEditorComponent;
}

/**
 * Type guard for addStep targets: only a Story carries a `background` block, so its presence
 * tells a Story apart from a Scenario without relying on the templateName string.
 */
function isStory(target: Scenario | Story): target is Story {
	return 'background' in target;
}

@Component({
	selector: 'app-base-editor',
	templateUrl: './base-editor.component.html',
	styleUrls: ['./base-editor.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [NgTemplateOutlet, CdkDropList, CdkDrag, NgClass, CdkDragHandle, CdkDragPreview, MatFormField, MatSelect, FormsModule, MatOption, ExampleTableComponent, MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle, MatExpansionPanelDescription, MatTooltip, NewExampleComponent, NewStepRequestComponent, AddBlockFormComponent, SaveBlockFormComponent, FileExplorerModalComponent, SlicePipe, MatIconModule]
})
export class BaseEditorComponent implements OnInit, DoCheck, AfterViewChecked, AfterViewInit {
	notify = inject(NotificationService);
	dialog = inject(MatDialog);
	blockService = inject(BlockService);
	exampleService = inject(ExampleService);
	private readonly cdr = inject(ChangeDetectorRef);
	scenarioService = inject(ScenarioService);
	backgroundService = inject(BackgroundService);
	apiService = inject(ApiService);
	themeService = inject(ThemingService);
	highlightInputService = inject(HighlightInputService);
	private stepValidationService = inject(StepValidationService);

	readonly step_type_input = viewChildren<ElementRef>('step_type_input');

	readonly step_type_pre = viewChildren<ElementRef>('step_type_pre');

	readonly step_type_input1 = viewChildren<ElementRef>('step_type_input1');

	readonly step_type_input2 = viewChildren<ElementRef>('step_type_input2');

	readonly step_type_input3 = viewChildren<ElementRef>('step_type_input3');

	/**
   * View child of the example table
   */
	readonly exampleChildren = viewChildren<ExampleTableComponent>('exampleChildView');

	/**
    * View child of the modals component
    */
	readonly saveBlockModal = viewChild.required<SaveBlockFormComponent>('saveBlockModal');
	readonly addBlockModal = viewChild.required<AddBlockFormComponent>('addBlockModal');
	readonly newStepRequest = viewChild.required<NewStepRequestComponent>('newStepRequest');
	readonly newExampleModal = viewChild.required<NewExampleComponent>('newExampleModal');
	readonly editBlockModal = viewChild.required<EditBlockComponent>('editBlockModal');
	readonly fileExplorerModal = viewChild.required<FileExplorerModalComponent>('fileExplorerModal');


	selectedStory!: Story;

	readonly originalStepTypes = input<StepType[]>([]);

	readonly templateName = input.required<string>();

	/**
   * If the test is running
   */
	readonly testRunning = input(false);

	readonly selectedBlock = input<Block>();

	/**
   * Sets a new selected scenaio
   */
	readonly newlySelectedScenario = input<Scenario>();
	private newlySelectedScenarioEffect = effect(() => {
		const scenario = this.newlySelectedScenario();
		if (!scenario) return;
		untracked(() => {
			if (this.templateName() === 'background' && !this.selectedStory?.background) return;
			// CASE 1: the parent re-sets the same scenario as a new reference after a block insert
			// (markScenarioUnsaved). That must keep the user's step selection, so only a different
			// scenario resets it. scenario_id repeats across stories, so the shared stepDefinitions
			// reference (kept by the shallow copy in markScenarioUnsaved) is part of the identity.
			const isOtherScenario = this.selectedScenario && (
				this.selectedScenario.scenario_id !== scenario.scenario_id ||
				this.selectedScenario.stepDefinitions !== scenario.stepDefinitions);
			if (isOtherScenario)
				this.checkAllSteps(false);

			this.selectedScenario = scenario;
			// Reset on every re-set too: the inserted block's inputs still need regex highlighting
			this.initialRegex = true;
		});
	});

	readonly uncheckBackgroundCheckboxes = input<boolean>();
	private uncheckBackgroundCheckboxesEffect = effect(() => {
		const showBackground = this.uncheckBackgroundCheckboxes();
		if (!showBackground) return;
		untracked(() => {
			if (this.templateName() === 'background' && !this.selectedStory?.background) return;
			this.checkAllSteps(false);
		});
	});

	/**
   * Sets a new selected story
   */
	readonly newlySelectedStory = input<Story>();
	private newlySelectedStoryEffect = effect(() => {
		const story = this.newlySelectedStory();
		if (!story) return;
		untracked(() => {
			this.selectedStory = story;
			this.initialRegex = true;
			if (this.templateName() === 'background' && this.selectedStory && this.selectedStory.background) {
				if (!this.selectedStory.background.stepDefinitions.when)
					this.selectedStory.background.stepDefinitions.when = [];

				const cleanStepDefs = {
					when: this.selectedStory.background.stepDefinitions.when
				};
				this.selectedStory.background.stepDefinitions = cleanStepDefs;
			}
		});
	});

	/**
   * Checks for an example step
   * @param index
   */
	readonly checkRowIndex = input<number>();
	private checkRowIndexEffect = effect(() => {
		const index = this.checkRowIndex();
		if (index === undefined) return;
		untracked(() => {
			this.checkStep(this.selectedScenario.multipleScenarios![index]);
		});
	});

	/** Handles checkRowIndex event from example table */
	handleCheckRowIndex(index: number) {
		this.checkStep(this.selectedScenario.multipleScenarios![index]);
	}

	/**
   * Checks if user investigates AI output
   */
	readonly isReviewing = input<boolean>(false);

	readonly blockSelectTriggerEvent = output<StepType>();

	/**
	 * Emitted after a block was inserted in place. The parent must re-set its signal-held
	 * scenario or story to a new reference: OnPush headers only re-render on a new reference,
	 * so an in-place `saved = false` leaves the "Save Scenario" button stale.
	 */
	readonly blockInserted = output<void>();

	/**
   * currently selected scenario
   */
	selectedScenario!: Scenario;

	/**
   * Name for a new step
   */
	newStepName = 'New Step';

	/**
   * To track changes on edit-block
   */

	saved = true;

	lastToFocus: string = '';

	/**
   * If the action bar is active
   */
	activeActionBar = false;

	/**
   * inputs including the <> for the examples
   */
	uncutInputs: string[] = [];

	/**
   * If all steps are checked
   */
	allChecked = false;

	lastVisitedTemplate: string = '';
	lastCheckedCheckboxIDx: number = 0;

	/**
   * Flag to check how much enable steps left
   */
	activatedSteps = 0;
	/**
   * If all examples steps are deactivated
   */
	allDeactivated: boolean = false;
	/**
   * If selected steps is a reference block
   */
	isReferenceBlock: boolean = false;
	/**
   * Block saved to clipboard
   */
	clipboardBlock: { stepDefinitions: Record<string, StepType[]>; multipleScenarios: MultipleScenario[] } | null = null;
	/**
     * Blocks in Repository
     */
	readonly blocks = signal<Block[]>([]);

	/**
	 * Formats a step value for the editable fallback control.
	 * Imported or legacy steps can omit optional second and third values.
	 * Returns the stored text unchanged: the contenteditable text is read back on input and saved as the value,
	 * so any display-only decoration here would be persisted and corrupt the step.
	 */
	formatStepValue(values: readonly string[] | null | undefined, index: number): string {
		return values?.[index] ?? '';
	}

	indexOfExampleToDelete: number | null = null;

	dragging: DragRef | null = null;

	exampleChild!: ExampleTableComponent;

	regexInStory: boolean = false;
	initialRegex: boolean = true;

	activeHeader: string | null = null;

	readonly isDark = input(false);

	/** Re-run highlight when theme changes */
	private themeEffect = effect(() => {
		this.themeService.isDark();
		this.highlightInputOnInit();
	});

	/** Adds block steps to scenario when block service emits — every queued request runs once, even when several arrive in one tick */
	private addBlockEffect = onActionTrigger(this.blockService.addBlockToScenarioTrigger, blockValue => {
		if (this.templateName() == 'background' && blockValue[0] == 'background') {
			if (!this.selectedStory?.background) return;
			const whenSteps = blockValue[1].stepDefinitions['when'] || [];
			if (whenSteps.length === 0) {
				// Background only supports 'when' steps — warn user if block has none
				this.notify.warning(
					'The selected block contains no "When" steps. Background only supports "When" steps.',
					'Block not applicable'
				);
				return;
			}
			whenSteps.forEach((step: StepType) => {
				this.uncheckStep(step);
				this.selectedStory.background.stepDefinitions['when'].push(JSON.parse(JSON.stringify(step)));
			});
			this.markUnsaved();
			this.blockInserted.emit();
		}
		if (this.templateName() == 'scenario' && blockValue[0] == 'scenario') {
			if (!blockValue[3]) {
				const blockReference: StepType = {
					_blockReferenceId: blockValue[1]._id, id: 0, type: blockValue[1].name ?? '',
					stepType: blockValue[2].toLowerCase(), pre: '', mid: '', post: '', values: []
				};
				const blockExamples = blockValue[1].stepDefinitions['example'];

				if (blockExamples &&
            blockExamples.length > 0 &&
            blockExamples[0] &&
            blockExamples[0].values &&
            blockExamples[0].values.length > 0)
					// Initialzes Examples Table when Selected Scenario doesn't have any Examples
					if (this.selectedScenario?.multipleScenarios?.length === undefined || this.selectedScenario?.multipleScenarios?.length === 0) {
						this.selectedScenario.multipleScenarios![0] = blockExamples[0];
						this.selectedScenario.multipleScenarios![1] = {values: [...Array(blockExamples[0].values.length)].fill('value')};
					} else {
						// Adds new Example if non-existent
						const missingValues = blockExamples[0].values
							.map((x: string) => {return x;})
							.filter((x: string) => this.selectedScenario.multipleScenarios![0].values.indexOf(x) == -1);

						missingValues.forEach((v: string) => {
							this.exampleService.newExampleEmit(v);
						});
					}

				this.addStep(blockReference, this.selectedScenario, 'scenario');
			} else
				this.insertStepsWithExamples(blockValue[1] as unknown as { stepDefinitions: Record<string, StepType[]> });

			this.markUnsaved();
			this.blockInserted.emit();
		}
	});

	/** Adds example value when example service emits new example */
	private newExampleEffect = onActionTrigger(this.exampleService.newExampleTrigger, value => {
		this.addToValues(value, 0, 0, '');
		// The request comes from a MatDialog outside this OnPush tree, so the table must be re-checked explicitly
		this.cdr.markForCheck();
	});

	/** Renames example when example service emits rename */
	private renameExampleEffect = onActionTrigger(this.exampleService.renameExampleTrigger, value => {
		this.renameExample(value.name, value.column);
		// The request comes from a MatDialog outside this OnPush tree, so the table must be re-checked explicitly
		this.cdr.markForCheck();
	});

	/** Unchecks all steps when scenario changes */
	private scenarioChangedEffect = effect(() => {
		const trigger = this.scenarioService.scenarioChangedTrigger();
		if (trigger === 0) return;
		if (this.templateName() === 'background' && !this.selectedStory?.background) return;
		this.checkAllSteps(false);
		this.initialRegex = true;
	});

	/** Handles focus and highlighting when step_type_input1 view children change */
	private stepTypeInput1Effect = effect(() => {
		//scenario first input value
		const fields = this.step_type_input1();
		if (fields.length === 0) return;
		untracked(() => {
			fields.forEach(in_field => {
				if (in_field && in_field.nativeElement.id === this.lastToFocus)
					in_field.nativeElement.focus();

			});
			this.lastToFocus = '';
			this.highlightInputOnInit();
		});
	});

	/** Unchecks all steps when background changes */
	private backgroundChangedEffect = effect(() => {
		const trigger = this.backgroundService.backgroundChangedTrigger();
		if (trigger === 0) return;
		if (this.templateName() === 'background' && !this.selectedStory?.background) return;
		this.checkAllSteps(false);
	});

	/** Handles copy/don't-copy option for steps with examples */
	// Queued per request: a re-created editor must not replay an earlier copy request
	private copyExampleOptionEffect = onActionTrigger(
		this.apiService.copyStepWithExampleTrigger,
		option => {
			if (this.clipboardBlock)
				if (option == 'copy')
					this.insertStepsWithExamples(this.clipboardBlock);
				else if (option == 'dontCopy')
					this.insertStepsWithoutExamples();
		}
	);

	/** Reloads blocks when block service triggers update */
	private updateBlocksEffect = effect(() => {
		const trigger = this.blockService.updateBlocksTrigger();
		if (trigger === 0) return;
		untracked(() => this.reloadBlocks());
	});

	/** Fetches blocks from the backend and updates the local signal */
	private async reloadBlocks() {
		const id = localStorage.getItem('id')!;
		const resp = await firstValueFrom(this.blockService.getBlocks(id));
		this.blocks.set(resp);
	}

	ngOnInit(): void {
		const id = localStorage.getItem('id') ?? '';
		this.blockService.getBlocks(id).subscribe({
			next: (resp) => {
				this.blocks.set(resp);
			},
			// Without an error path the editor silently shows no blocks when the backend is unreachable
			error: () => this.notify.error('Could not load blocks')
		});
	}


	/**
   * retrieves the saved block from the session storage
   */
	ngDoCheck(): void {
		switch (this.templateName()) {
			case 'background':
				this.clipboardBlock = JSON.parse(
					sessionStorage.getItem('scenarioBlock') ?? 'null'
				);
				break;

			case 'scenario':
				this.clipboardBlock = JSON.parse(
					sessionStorage.getItem('scenarioBlock') ?? 'null'
				);
				break;

			case 'example':
				this.clipboardBlock = JSON.parse(
					sessionStorage.getItem('copiedExampleBlock') ?? 'null'
				);
				break;

			case 'block-editor':
				this.clipboardBlock = JSON.parse(sessionStorage.getItem('copiedEditBlock') ?? 'null');
				break;

			default:
				break;
		}
		if (this.allChecked) 
			this.checkAllSteps(this.allChecked);
    
	}

	ngAfterViewChecked() {
		// this.regexDOMChangesHelper();
		if (this.initialRegex) 
			this.highlightInputOnInit();
    
	}

	ngAfterViewInit(): void {
		this.regexDOMChangesHelper();
		if (this.initialRegex) 
			this.highlightInputOnInit();
    

		const exampleChildren = this.exampleChildren();
		if (exampleChildren.at(-1)! != undefined) 
			this.exampleChild = exampleChildren.at(-1)!;
    
	}

	/**
   * Fills example values
   * @param stepType
   * @param index
   * @param step
   */

	fillExampleValues(_value: unknown, _index: number) {
		// if (!this.selectedScenario.stepDefinitions[stepType][0] || !this.selectedScenario.stepDefinitions[stepType][0].values.some(r => step.values.includes(r))) {
		//   this.selectedScenario.stepDefinitions[stepType].push(JSON.parse(JSON.stringify(step)));
		// }
		// if (index == 0) {
		//   step.values.forEach((el) => {
		//     const s = "<" + el + ">";
		//     if (!this.uncutInputs.includes(s)) {
		//       this.uncutInputs.push(s);
		//     }
		//   });
		// }
	}

	/**
   * Adds a value to the step
   * @param input
   * @param stepIndex
   * @param valueIndex
   * @param stepType
   * @param step Optional argument
   */
	addToValues(
		input: string,
		stepIndex: number,
		valueIndex: number,
		stepType: string,
		_step?: StepType
	) {
		switch (this.templateName()) {
			case 'background':
				if (!this.selectedStory?.background) return;
				this.selectedStory.background.stepDefinitions.when[stepIndex].values[valueIndex] = input;
				this.markUnsaved();
				break;
			case 'scenario':
				//updates scenario steps
				this.updateScenarioValues(input, stepIndex, valueIndex, stepType);
				this.markUnsaved();
				break;
			case 'example':
				this.handleExamples(input);
				this.markUnsaved();
				break;
			case 'block-editor':
				switch (stepType) {
					case 'given':
						this.selectedBlock()!.stepDefinitions.given[stepIndex].values[valueIndex] = input;
						break;
					case 'when':
						this.selectedBlock()!.stepDefinitions.when[stepIndex].values[valueIndex] = input;
						break;
					case 'then':
						this.selectedBlock()!.stepDefinitions.then[stepIndex].values[valueIndex] = input;
						break;
					default:
						console.error('Unknown stepType:', stepType);
						break;
				}
				// this.markUnsaved();
				break;
		}
	}

	/**
   * Updates input values of scenario step types
   * @param input
   * @param stepIndex
   * @param valueIndex
   * @param stepType
   */
	updateScenarioValues(
		input: string,
		stepIndex: number,
		valueIndex: number,
		stepType: string
	) {
		switch (stepType) {
			case 'given':
				if (this.selectedScenario.stepDefinitions.given[stepIndex].isExample?.[valueIndex])
					this.selectedScenario.stepDefinitions.given[stepIndex].values[valueIndex] = '<' + input + '>';
				else
					this.selectedScenario.stepDefinitions.given[stepIndex].values[valueIndex] = input;

				break;
			case 'when':
				if (this.selectedScenario.stepDefinitions.when[stepIndex].isExample?.[valueIndex])
					this.selectedScenario.stepDefinitions.when[stepIndex].values[valueIndex] = '<' + input + '>';
				else
					this.selectedScenario.stepDefinitions.when[stepIndex].values[valueIndex] = input;

				break;
			case 'then':
				if (this.selectedScenario.stepDefinitions.then[stepIndex].isExample?.[valueIndex])
					this.selectedScenario.stepDefinitions.then[stepIndex].values[valueIndex] = '<' + input + '>';
				else
					this.selectedScenario.stepDefinitions.then[stepIndex].values[valueIndex] = input;

				break;
			case 'example':
				this.selectedScenario.multipleScenarios![stepIndex].values[valueIndex] = input;
				this.markUnsaved();
		}
	}

	/**
    * Adds step
    * @param step 
    * @param selectedScenario 
    * @param templateName
    * @param step_idx Optional argument
    */
	// Receives a Scenario for scenario/example steps and a Story for background steps
	async addStep(step: StepType, selectedScenario: Scenario | Story, templateName: string, step_idx?: number) {
		let lastEl: number;
		let newStep: StepType | undefined;
		const stepLocation = isStory(selectedScenario) ? selectedScenario.background.stepDefinitions : selectedScenario.stepDefinitions;
		if (step.type == 'Upload File')
			try {
				const result = await this.fileExplorerModal().openFileExplorerModal();
				if (!result) return;
				const preSelectValues = [result.filename];
				newStep = this.createNewStep(step, stepLocation);
				preSelectValues.forEach((value: string, index: number) => {
					if (value)
						newStep!.values[index] = value;
                
				});
			} catch (error) {
				console.error('Error while opening file explorer modal:', error);
			}
		else 
			newStep = this.createNewStep(step, stepLocation);
    
		if (!newStep) return;

		if (newStep['type'] === this.newStepName)
			this.newStepRequest().openNewStepRequestModal(newStep['stepType']);
		else {
			switch (newStep.stepType) {
				case 'given':
					// Story targets have no given block, so only Scenario targets get the step
					if (isStory(selectedScenario)) break;
					selectedScenario.stepDefinitions.given.push(newStep);
					lastEl = selectedScenario.stepDefinitions.given.length - 1;
					this.lastToFocus =
						templateName + '_' + step_idx + '_input_pre_' + lastEl;
					break;
				case 'when':
					switch (templateName) {
						case 'scenario':
							if (isStory(selectedScenario)) break;
							selectedScenario.stepDefinitions.when.push(newStep);
							lastEl = selectedScenario.stepDefinitions.when.length - 1;
							this.lastToFocus =
								templateName + '_' + step_idx + '_input_pre_' + lastEl;
							break;

						case 'background':
							if (!isStory(selectedScenario)) break;
							selectedScenario.background.stepDefinitions.when.push(newStep);
							lastEl =
								selectedScenario.background.stepDefinitions.when.length - 1;
							this.lastToFocus = templateName + '_step_input_pre_' + lastEl;
							break;
					}
					break;

				case 'then':
					if (isStory(selectedScenario)) break;
					selectedScenario.stepDefinitions.then.push(newStep);
					lastEl = selectedScenario.stepDefinitions.then.length - 1;
					this.lastToFocus =
						templateName + '_' + step_idx + '_input_pre_' + lastEl;
					break;
				default:
					break;
			}
			this.markUnsaved();
		}
	}

	/**
   * Adds a step to the Block
   * @param step
   * @param position
   */
	addStepToBlock(step: StepType, position?: number) {
		const newStep = this.createNewStep(
			step,
			this.selectedBlock()!.stepDefinitions
		);
		switch (newStep.stepType) {
			case 'given':
				if (position) 
					this.selectedBlock()!.stepDefinitions.given.splice(position, 0, newStep);
				else 
					this.selectedBlock()!.stepDefinitions.given.push(newStep);
        
				break;
			case 'when':
				if (position) 
					this.selectedBlock()!.stepDefinitions.when.splice(position, 0, newStep);
				else 
					this.selectedBlock()!.stepDefinitions.when.push(newStep);
        
				break;
			case 'then':
				if (position) 
					this.selectedBlock()!.stepDefinitions.then.splice(position, 0, newStep);
				else 
					this.selectedBlock()!.stepDefinitions.then.push(newStep);
        
				break;
		}
	}

	/**
   * Open an examples modal
   * @param useCaseString
   */
	openExampleModal(useCaseString: string) {
		this.newExampleModal().openNewExampleModal(this.selectedScenario, useCaseString);
	}

	/**
   * Creates a new step
   * @param step
   * @param stepDefinitions
   * @returns
   */
	createNewStep(step: StepType, stepDefinitions: StepDefinition | StepDefinitionBackground): StepType {
		const obj = JSON.parse(JSON.stringify(step));
		const newId = this.getLastIDinStep(stepDefinitions, obj.stepType) + 1;
		const newStep: StepType = {
			_blockReferenceId: step._blockReferenceId,
			id: newId,
			mid: obj.mid,
			pre: obj.pre,
			post: obj.post,
			stepType: obj.stepType,
			type: obj.type,
			values: obj.values,
			isExample: [...Array(obj.values.length)].fill(false),
			origin: 'created-by-user'
		};
		return newStep;
	}

	/**
   * Gets the last id in the steps
   * @param stepDefs
   * @param stepStepType
   * @returns
   */

	getLastIDinStep(stepDefs: StepDefinition | StepDefinitionBackground, stepStepType: string): number {
		// Background only has a 'when' key — cast to a Record so 'given'/'then' lookups
		// (which never execute for background step defs) still type-check.
		const stepsRecord = stepDefs as unknown as Record<string, StepType[]>;
		switch (stepStepType) {
			case 'given':
				return this.buildID(stepsRecord.given);
			case 'when':
				return this.buildID(stepsRecord.when);
			case 'then':
				return this.buildID(stepsRecord.then);
			default:
				return 0;
		}
	}

	/**
   * gets the id of the step
   * @param step
   * @returns
   */
	buildID(step: StepType[]): number {
		if (step.length !== 0) 
			return step[step.length - 1].id;
		else 
			return 0;
    
	}

	getKeysList(stepDefs: StepDefinition) {
		if (stepDefs != null) 
			return Object.keys(stepDefs);
		else 
			return '';
    
	}

	/**
  * Sort the step types 
  * @returns 
  */

	sortedStepTypes(): (StepType | { type: string; label: string })[] {
		const given = [];
		const when = [];
		const then = [];

		for (const step of this.originalStepTypes()) 
			if (step.stepType === 'given') 
				given.push(step);
			else if (step.stepType === 'when') 
				when.push(step);

			else if (step.stepType === 'then') 
				then.push(step);
      
    
		given.sort((a, b) => a.id - b.id);
		when.sort((a, b) => a.id - b.id);
		then.sort((a, b) => a.id - b.id);

		return [
			{ type: 'Header', label: 'Given' },
			...given,
			{ type: 'Header', label: 'When' },
			...when,
			{ type: 'Header', label: 'Then' },
			...then
		];
		// if (this.originalStepTypes) {
		//   // const given = [];
		//   // const when = [];
		//   // const then = [];

		//   // for (const step of this.originalStepTypes) {
		//   //   if (step.stepType === "given") {
		//   //     given.push(step);
		//   //   } else if (step.stepType === "when") {
		//   //     when.push(step);

		//   //   } else if (step.stepType === 'then') {
		//   //     then.push(step);

		//   //   }
		//   // }
		//   this.originalStepTypes.sort((a, b) => a.id - b.id);
		//   // when.sort((a, b) => a.id - b.id);
		//   // then.sort((a, b) => a.id - b.id);

		//   return [
		//     { type: 'Header', label: '' },
		//     ...this.originalStepTypes
		//   ];
		// }
		// return [];
	}


	getUniqueSteps(): StepType[] {
		const uniqueStepTypes: StepType[] = [];
		const addedTypes: Set<string> = new Set();
		let screenshotAdded: boolean = false;

		for (const step of this.sortedStepTypes()) {
			// sortedStepTypes() also yields header markers ({ type, label }) mixed into the
			// list — cast to StepType since only step entries hit the branches below.
			const stepCopy = { ...step } as StepType;
			//for all unique steps set steptype to "when" for edit-block
			stepCopy.stepType = 'when';

			if (stepCopy.type === 'Screenshot' && !screenshotAdded) {
				stepCopy.pre =
					'I take a screenshot. Optionally: Focus the page on the element';
				uniqueStepTypes.push(stepCopy);
				addedTypes.add(stepCopy.type);
				screenshotAdded = true;
			} else if (!addedTypes.has(stepCopy.type)) {
				uniqueStepTypes.push(stepCopy);
				addedTypes.add(stepCopy.type);
			}
		}

		return uniqueStepTypes;
	}

	toggleHeader(header: string): void {
		if (this.activeHeader === header) 
			this.activeHeader = null;
		else 
			this.activeHeader = header;
    
	}

	isHeaderActive(header: string): boolean {
		return this.activeHeader === header;
	}


	/**
   * Gets the steps list (For Background: it should be set to 1 in order to enter when-Block)
   * @param stepDefs
   * @param i number of steptype
   * @returns
   */
	getStepsList(stepDefs: StepDefinition, i: number) {
		switch (i) {
			case 0:
				return stepDefs.given;
			case 1:
				return stepDefs.when;
			case 2:
				return stepDefs.then;
		}
		// return stepDefs.example;
	}

	/**
   * Gets the steps list (For BlockPreview)
   * @param stepDefs
   * @returns
   */
	getStepsListBlockPreview(stepDefs: StepDefinition) {
		const { given = [], when = [], then = [] } = stepDefs || {};
		const allStepValues = [...given, ...when, ...then];
		return allStepValues;
	}

	/**
   * Drag and drop event for a step
   * @param event
   * @param stepDefs
   * @param stepIndex
   */

	onDrop(event: CdkDragDrop<StepDragData>, stepDefs: StepDefinition, stepIndex: number) {
		if (this.selectedCount(stepDefs, stepIndex) > 1) {
			const indices = event.item.data.indices!;
			const change = event.currentIndex - event.previousIndex;

			let newList: StepType[] | undefined;

			if (change > 0) {
				const startOfList = this.getStepsList(stepDefs, stepIndex)!.slice(
					0,
					event.currentIndex + 1
				);
				const middleOfList: StepType[] = [];
				const endOfList = this.getStepsList(stepDefs, stepIndex)!.slice(
					event.currentIndex + 1
				);
				indices.forEach((element: { index: number; value: StepType }) => {
					middleOfList.push(element.value);
				});
				const startOfListFiltered = startOfList.filter(
					(el) => !middleOfList.includes(el)
				);
				const endOfListFiltered = endOfList.filter(
					(el) => !middleOfList.includes(el)
				);
				startOfListFiltered.push(...middleOfList);
				startOfListFiltered.push(...endOfListFiltered);
				newList = startOfListFiltered;
			} else if (change < 0) {
				const startOfList = this.getStepsList(stepDefs, stepIndex)!.slice(
					0,
					event.currentIndex
				);
				const middleOfList: StepType[] = [];
				const endOfList = this.getStepsList(stepDefs, stepIndex)!.slice(
					event.currentIndex
				);
				indices.forEach((element: { index: number; value: StepType }) => {
					middleOfList.push(element.value);
				});
				const startOfListFiltered = startOfList.filter(
					(el) => !middleOfList.includes(el)
				);
				const endOfListFiltered = endOfList.filter(
					(el) => !middleOfList.includes(el)
				);
				startOfListFiltered.push(...middleOfList);
				startOfListFiltered.push(...endOfListFiltered);
				newList = startOfListFiltered;
			} else
				newList = this.getStepsList(stepDefs, stepIndex);

			this.updateList(stepIndex, newList!);
		} else
			moveItemInArray(
				this.getStepsList(stepDefs, stepIndex)!,
				event.previousIndex,
				event.currentIndex
			);
    
		this.markUnsaved();
	}

	onDropBlock(
		event: CdkDragDrop<StepDragData>,
		stepDefs: StepDefinition,
		stepIndex: number
	) {
		moveItemInArray(
			this.getStepsList(stepDefs, stepIndex)!,
			event.previousIndex,
			event.currentIndex
		);
		this.markUnsaved();
	}

	/**
   * Marks story or scenario unsaved depending on template
   */
	markUnsaved() {
		switch (this.templateName()) {
			case 'background':
				if (!this.selectedStory?.background) return;
				this.selectedStory.background.saved = false;
				this.backgroundService.backgroundReplaced = false;
				break;
			case 'scenario':
				this.selectedScenario.saved = false;
				break;
			case 'example':
				this.selectedScenario.saved = false;
				break;
			case 'default':
				break;
		}
	}

	uncheckStep(step: StepType | MultipleScenario) {
		step.checked = false;
	}

	/** Updates step definitions list (background & scenario)
   * @param stepIndex
   * @param newList List afret dragging
   *  */

	updateList(stepIndex: number, newList: StepType[]) {
		switch (this.templateName()) {
			case 'background':
				if (!this.selectedStory?.background) return;
				this.selectedStory.background.stepDefinitions.when = newList;
				break;
			case 'scenario':
				if (stepIndex === 0) 
					this.selectedScenario.stepDefinitions.given = newList;
				else if (stepIndex === 1) 
					this.selectedScenario.stepDefinitions.when = newList;
				else if (stepIndex === 2) 
					this.selectedScenario.stepDefinitions.then = newList;
        
				break;
		}
	}

	/**
   * Maps all selected steps to their index
   * Sets dragging boolean
   * @param event
   * @param i
   */

	dragStarted(event: CdkDragStart, stepDefs: StepDefinition, i: number): void {
		this.dragging = event.source._dragRef;
		let indices = null;
		switch (this.templateName()) {
			case 'background':
				/* indices = stepDefs.when
          .map(function(element, index) {return {index: index, value: element}})
          .filter(function(element) { 
            return element.value.checked}); */
				indices = this.getCheckedValues(stepDefs, i);
				break;
			case 'scenario':
				indices = this.getCheckedValues(stepDefs, i);
        
				/* if (i === 0) {
          indices = stepDefs.given
          .map(function(element, index) {return {index: index, value: element}})
          .filter(function(element) { return element.value.checked});
        } else if (i === 1) {
          indices = stepDefs.when
          .map(function(element, index) {return {index: index, value: element}})
          .filter(function(element) { return element.value.checked});
        } else if (i === 2) {
          indices = stepDefs.then
          .map(function(element, index) {return {index: index, value: element}})
          .filter(function(element) { return element.value.checked});
        } */
				break;
		}
		event.source.data = {
			indices,
			values: indices!.map((a: { index: number; value: StepType }) => a.index),
			source: this
		};
	}

	/**
   * Iterates through steps and returns the "checked" values
   * @param indices Dragging indices
   * @param stepDefs Stepdefinitions (background or scenario)
   * @param i Step index (For background: currently set to 1 in order to enter when-block)
   * @return Checked values of steps
   */
	getCheckedValues(stepDefs: StepDefinition, i: number) {
		if (i === 0) 
			return stepDefs.given
				.map((element, index) => {
					return { index: index, value: element };
				})
				.filter((element) => {
					return element.value.checked;
				});
		else if (i === 1) 
			return stepDefs.when
				.map((element, index) => {
					return { index: index, value: element };
				})
				.filter((element) => {
					return element.value.checked;
				});
		else if (i === 2) 
			return stepDefs.then
				.map((element, index) => {
					return { index: index, value: element };
				})
				.filter((element) => {
					return element.value.checked;
				});
    
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

	isSelected(stepDefs: StepDefinition, i: number, j: number): boolean | undefined {
		switch (this.templateName()) {
			case 'background':
				//return stepDefs.when[j].checked;
				return this.returnCheckedValue(stepDefs, i, j);

			case 'scenario':
				/* if (i === 0) {
          return stepDefs.given[j].checked;
        } else if (i === 1) {
            return stepDefs.when[j].checked;
        } else if (i === 2) {
            return stepDefs.then[j].checked;
        }
        return false; */
				return this.returnCheckedValue(stepDefs, i, j);
		}
	}

	/**
   * Returns values of "checked" property
   * @param stepDefs
   * @param i Step index (Background: must set to 1 in order to enter when-block)
   * @param j
   * @returns
   */
	returnCheckedValue(stepDefs: StepDefinition, i: number, j: number) {
		if (i === 0) 
			return stepDefs.given[j].checked;
		else if (i === 1) 
			return stepDefs.when[j].checked;
		else if (i === 2) 
			return stepDefs.then[j].checked;
    
		return false;
	}

	/**
   * Returns count of all selected step from one stepDefinition
   * @param stepDefs
   * @param i
   * @returns
   */

	selectedCount(stepDefs: StepDefinition, i: number) {
		let result: number = 0;
		switch (this.templateName()) {
			case 'background':
				//this.selectedStory.background.stepDefinitions.when.forEach(element => { if(element.checked){counter++;} });
				result = this.countChecked(stepDefs, i);
				break;
			case 'scenario':
				/* if (i === 0) {
          this.selectedScenario.stepDefinitions.given.forEach(element => { if(element.checked){counter++;} });
        } else if (i === 1) {
          this.selectedScenario.stepDefinitions.when.forEach(element => { if(element.checked){counter++;} });
        } else if (i === 2) {
          this.selectedScenario.stepDefinitions.then.forEach(element => { if(element.checked){counter++;} });
        } */
				result = this.countChecked(stepDefs, i);
				break;
		}
		return result;
	}

	countChecked(stepDefs: StepDefinition, i: number) {
		let counter = 0;
		if (i === 0) 
			stepDefs.given.forEach((element) => {
				if (element.checked) 
					counter++;
        
			});
		else if (i === 1) 
			stepDefs.when.forEach((element) => {
				if (element.checked) 
					counter++;
        
			});
		else if (i === 2) 
			stepDefs.then.forEach((element) => {
				if (element.checked) 
					counter++;
        
			});
    
		return counter;
	}

	/**
   * Check all steps
   * @param checkValue
   */
	checkAllSteps(checkValue?: boolean) {
		if (checkValue != undefined) 
			this.allChecked = checkValue;
		else 
			this.allChecked = !this.allChecked;
    
		this.isReferenceBlock = false;
		switch (this.templateName()) {
			case 'background':
				if (!this.selectedStory?.background) return;
				this.checkOnIteration(
					this.selectedStory.background.stepDefinitions,
					this.allChecked
				);
				break;

			case 'scenario':
				this.checkOnIteration(
					this.selectedScenario.stepDefinitions,
					this.allChecked
				);
				this.disableSaveBlock();
				break;

			case 'example':
				this.checkOnIteration(
					this.selectedScenario.multipleScenarios,
					this.allChecked
				);
				break;

			case 'block-editor':
				this.checkOnIteration(
					this.selectedBlock()!.stepDefinitions,
					this.allChecked
				);
				break;
		}
	}

	checkOnIteration(stepsList: StepDefinition | StepDefinitionBackground | MultipleScenario[] | undefined, checkValue: boolean) {
		if (!stepsList) return;
		// CASE 1: example table — rows are a plain array and row 0 is the header. Iterating the
		// keys of this array (for-in) would repeat the row loop once per key, so rows are walked once here
		if (this.templateName() === 'example') {
			const examples = stepsList as MultipleScenario[];
			for (let i = examples.length - 1; i > 0; i--)
				this.checkStep(examples[i], checkValue);
			return;
		}
		// CASE 2: background & scenario — named step lists, each walked once
		const stepsRecord = stepsList as Partial<Record<'given' | 'when' | 'then', StepType[]>>;
		for (const key of ['given', 'when', 'then'] as const) {
			const steps = stepsRecord[key] ?? [];
			for (let i = steps.length - 1; i >= 0; i--)
				this.checkStep(steps[i], checkValue);
		}
	}

	/**
   *  Handles checkboxes on click
   * @param event Click event
   * @param step Current step
   * @param checkbox_id Checkbox id
   * @param checkValue Optional value
   */
	handleClick(event: MouseEvent, step: StepType | MultipleScenario, checkbox_id: number, _checkValue?: boolean) {
		// if key pressed is shift
		this.isReferenceBlock = false;
		if (event.shiftKey && this.lastVisitedTemplate == this.templateName()) 
			this.checkMany(step as StepType, checkbox_id);
		else 
			this.checkStep(step);
    
		// Set current step to last checked
		this.lastCheckedCheckboxIDx = checkbox_id;
		this.lastVisitedTemplate = this.templateName();
	}

	/**
   * Checks many steps on shift click
   * @param currentStep
   * @param checkbox_id
   */

	checkMany(currentStep: StepType, checkbox_id: number) {
		const newTmp: number = checkbox_id; // current step id
		const lastTmp = this.lastCheckedCheckboxIDx;
		// Find in this block start and end step

		const start = Math.min(newTmp, lastTmp); // get starting & ending array element
		const end = Math.max(newTmp, lastTmp);

		// Check all steps in the list between start and end
		switch (this.templateName()) {
			case 'scenario': {
				const scenarioSteps = (this.selectedScenario.stepDefinitions as unknown as Record<string, StepType[]>)[currentStep.stepType];
				const scenario_val = scenarioSteps[lastTmp].checked;
				for (let i = start + 1; i <= end; i++)
					scenarioSteps[i].checked = scenario_val;

				break;
			}
			case 'background': {
				if (!this.selectedStory?.background) break;
				const bgSteps = (this.selectedStory.background.stepDefinitions as unknown as Record<string, StepType[]>)[currentStep.stepType];
				const background_val = bgSteps[lastTmp].checked;
				for (let i = start + 1; i <= end; i++)
					bgSteps[i].checked = background_val;

				break;
			}
			case 'example':
				break;
		}
		setTimeout(() => {
			this.areAllStepsChecked();
		}, 20);
	}

	/**
   * Checks a step
   * @param step
   * @param checkValue Optional value
   */

	checkStep(step: StepType | MultipleScenario, checkValue?: boolean) {
		switch (this.templateName()) {
			case 'block-editor': {
				if (checkValue != null)
					step.checked = checkValue;
				else
					step.checked = !step.checked;

				let checkCount = 0;
				let stepCount = 0;

				for (const prop in this.selectedBlock()!.stepDefinitions) {
					const blockSteps = (this.selectedBlock()!.stepDefinitions as unknown as Record<string, StepType[]>)[prop];
					for (let i = blockSteps.length - 1; i >= 0; i--) {
						stepCount++;
						if (blockSteps[i].checked)
							checkCount++;

					}
				}

				if (checkCount >= stepCount)
					this.allChecked = true;
				else
					this.allChecked = false;

				if (checkCount <= 0) {
					this.allChecked = false;
					this.activeActionBar = false;
				} else
					this.activeActionBar = true;

				break;
			}
			default:
				if (checkValue !== undefined) 
					step.checked = checkValue;
				else {
					step.checked = !step.checked;
					this.disableSaveBlock();
				}
				this.areAllStepsChecked();
				break;
		}
	}

	/**
   * Enables/disables "Save steps as Block" if only reference-block-steps selected
   */
	disableSaveBlock() {
		if (this.templateName() !== 'scenario') 
			return;
    

		const { stepDefinitions } = this.selectedScenario;
		let allSelectedSteps = 0;
		let onlyReferenceSteps = 0;

		for (const prop in stepDefinitions)
			if (prop !== 'example')
				this.updateStepCounts((stepDefinitions as unknown as Record<string, StepType[]>)[prop], (step: StepType) => {
					allSelectedSteps++;
					if (step._blockReferenceId) 
						onlyReferenceSteps++;
          
				});
    

		this.isReferenceBlock = onlyReferenceSteps === allSelectedSteps;
	}
	/**
   * Update step counts
   */
	updateStepCounts(steps: StepType[], callback: (step: StepType) => void) {
		for (let i = steps.length - 1; i >= 0; i--) 
			if (steps[i].checked) 
				callback(steps[i]);
      
    
	}

	/**
   * Enables/disables action bar and checkbox in it depending on whether all steps are checked
   */
	areAllStepsChecked() {
		let checkCount = 0;
		let stepCount = 0;

		switch (this.templateName()) {
			case 'scenario': {
				const scenarioStepDefs = this.selectedScenario.stepDefinitions as unknown as Record<string, StepType[]>;
				for (const prop in scenarioStepDefs)
					if (prop !== 'example')
						for (
							let i = scenarioStepDefs[prop].length - 1;
							i >= 0;
							i--
						) {
							stepCount++;
							if (scenarioStepDefs[prop][i].checked)
								checkCount++;

						}


				this.updateAllActionBar(checkCount, stepCount);
				break;
			}

			case 'background': {
				if (!this.selectedStory?.background) break;
				const bgStepDefs = this.selectedStory.background.stepDefinitions as unknown as Record<string, StepType[]>;
				for (const prop in bgStepDefs)
					for (
						let i =
							bgStepDefs[prop].length - 1;
						i >= 0;
						i--
					) {
						stepCount++;
						if (bgStepDefs[prop][i].checked)
							checkCount++;

					}

				this.updateAllActionBar(checkCount, stepCount);
				break;
			}

			case 'example':
				for (
					let i = this.selectedScenario.multipleScenarios!.length - 1;
					i > 0;
					i--
				) {
					stepCount++;
					if (this.selectedScenario.multipleScenarios![i].checked)
						checkCount++;

				}
				this.updateAllActionBar(checkCount, stepCount);
				break;
			default:
				break;
		}
	}

	/**
   * De-/activates buttons & checkbox in action bar
   * @param checkCount
   * @param stepCount
   */
	updateAllActionBar(checkCount: number, stepCount: number) {
		this.allChecked = checkCount >= stepCount;
		if (checkCount <= 0) {
			this.allChecked = false;
			this.activeActionBar = false;
		} else 
			this.activeActionBar = true;
    
	}

	/** Action bar methods */

	/**
   * Save a new block
   *
   */

	saveBlock(): void {
		//const saveBlock = {given: [], when: [], then: [], example: []};
		let saveBlock;

		switch (this.templateName()) {
			case 'background':
				if (!this.selectedStory?.background) break;
				saveBlock = this.addStepsToBlockOnIteration(
					JSON.parse(
						JSON.stringify(this.selectedStory.background.stepDefinitions)
					)
				);
				/* for (const prop in this.selectedStory.background.stepDefinitions) {
            for (const s in this.selectedStory.background.stepDefinitions[prop]) {
              if (this.selectedStory.background.stepDefinitions[prop][s].checked) {
                saveBlock[prop].push(this.selectedStory.background.stepDefinitions[prop][s]);
              }
            }
        } */
				break;

			case 'scenario':
				saveBlock = this.addStepsToBlockOnIteration(JSON.parse(JSON.stringify(this.selectedScenario.stepDefinitions)), JSON.parse(JSON.stringify(this.selectedScenario.multipleScenarios)));
				/* for (const prop in this.selectedScenario.stepDefinitions) {
            if (prop !== 'example') {
                for (const s in this.selectedScenario.stepDefinitions[prop]) {
                  if (this.selectedScenario.stepDefinitions[prop][s].checked) {
                    saveBlock[prop].push(this.selectedScenario.stepDefinitions[prop][s]);
                  }
                }
            }
        } */
				break;
			default:
				break;
		}

		const block: Block = { name: 'TEST', stepDefinitions: saveBlock as unknown as StepDefinition };
		this.saveBlockModal().openSaveBlockFormModal(block, this);
	}

	/**
   * Return examples to steps
   *
   */
	reactivateExampleSteps() {
		// this.selectedScenario.multipleScenarios.forEach((value, index) => {
		//   value.values.forEach((val, i) => {
		//    this.selectedScenario.multipleScenarios[index + 1].deactivated = false
		//   });
		// });
		this.setIsExampleFlags(false);
	}

	/**
	 * Sets the isExample flag of every value in the selected scenario's given/when/then steps.
	 * @param value false marks the values as plain (non-example) values; undefined clears the flag
	 */
	private setIsExampleFlags(value: boolean | undefined) {
		// isExample typed as boolean[] but runtime needs undefined assignment
		const steps = this.selectedScenario.stepDefinitions;
		for (const list of [steps.given, steps.when, steps.then])
			for (const step of list)
				step.values.forEach((_val: string, i: number) => { (step.isExample as (boolean | undefined)[])[i] = value; });
	}

	/**
   * Delete rows or deactivate examples
   *
   */
	deleteRows() {
		this.setIsExampleFlags(undefined);
	}
	/**
   * Deactivates all checked step
   *
   */

	deactivateStep(): void {
		switch (this.templateName()) {
			case 'background':
				if (!this.selectedStory?.background) break;
				this.deactivateOnIteration(
					this.selectedStory.background.stepDefinitions
				);
				/* for (const prop in this.selectedStory.background.stepDefinitions) {
          for (const s in this.selectedStory.background.stepDefinitions[prop]) {
              if (this.selectedStory.background.stepDefinitions[prop][s].checked) {
                this.selectedStory.background.stepDefinitions[prop][s].deactivated = !this.selectedStory.background.stepDefinitions[prop][s].deactivated;
              }
          }
        } */
				//this.selectedStory.background.saved = false;
				this.markUnsaved();
				break;

			case 'scenario':
				this.deactivateOnIteration(this.selectedScenario.stepDefinitions);
				/* for (const prop in this.selectedScenario.stepDefinitions) {
          if (prop !== 'example') {
              for (const s in this.selectedScenario.stepDefinitions[prop]) {
                  if (this.selectedScenario.stepDefinitions[prop][s].checked) {
                      this.selectedScenario.stepDefinitions[prop][s].deactivated = !this.selectedScenario.stepDefinitions[prop][s].deactivated;
                  }
              }
          }
        } */
				//this.selectedScenario.saved = false;
				this.markUnsaved();
				break;
			case 'example':
				{
          
					const examples = this.selectedScenario.multipleScenarios!;
					const totalSteps = Object.keys(examples).length;
					examples.forEach((example: MultipleScenario) => {
						if (example.checked && this.activatedSteps < totalSteps - 1) {
							example.deactivated = !example.deactivated;
							if (example.deactivated) this.activatedSteps++;
						}
					});
					if (this.activatedSteps === totalSteps - 1) 
						this.deactivateAllExampleSteps();
					else this.reactivateExampleSteps();
				}
				//this.selectedScenario.saved = false;
				this.markUnsaved();
				break;

			case 'block-editor':
				this.deactivateOnIteration(this.selectedBlock()!.stepDefinitions);
				break;

			default:
				break;
		}
	}
	/**
   * Deactivates all example steps
   *
   */
	deactivateAllExampleSteps() {
		this.activatedSteps = 0;
		this.allDeactivated = true;
		this.multipleScenariosDeactivated();
	}

	multipleScenariosDeactivated() {
		this.setIsExampleFlags(undefined);
	}

	deactivateOnIteration(stepsList: StepDefinition | StepDefinitionBackground) {
		//background & scenario
		const stepsRecord = stepsList as unknown as Record<string, StepType[]>;
		for (const prop in stepsRecord)
			if (prop !== 'example')
				for (const s in stepsRecord[prop])
					if (stepsRecord[prop][s].checked) {
						stepsRecord[prop][s].deactivated = !stepsRecord[prop][s].deactivated;
						this.uncheckStep(stepsRecord[prop][s]);
					}


	}

	/**
   * Removes a step
   *
   */

	removeStep() {
		switch (this.templateName()) {
			case 'background':
				if (!this.selectedStory?.background) break;
				this.removeStepOnIteration(this.selectedStory.background.stepDefinitions);
				/* for (const prop in this.selectedStory.background.stepDefinitions) {
          for (let i = this.selectedStory.background.stepDefinitions[prop].length - 1; i >= 0; i--) {
            if (this.selectedStory.background.stepDefinitions[prop][i].checked) {
              this.selectedStory.background.stepDefinitions[prop].splice(i, 1);
            }
          }
        } */
				//this.selectedStory.background.saved = false;
				this.markUnsaved();
				break;
			case 'scenario':
				this.removeStepOnIteration(this.selectedScenario.stepDefinitions);
				/* for (const prop in this.selectedScenario.stepDefinitions) {
          if (prop !== 'example') {
            for (let i = this.selectedScenario.stepDefinitions[prop].length - 1; i >= 0; i--) {
              if (this.selectedScenario.stepDefinitions[prop][i].checked) {
                this.selectedScenario.stepDefinitions[prop].splice(i, 1);
              }
            }
          }
        } */
				//this.selectedScenario.saved = false;
				this.markUnsaved();
				break;
			case 'example':
				for (let i = this.selectedScenario.multipleScenarios!.length - 1; i > 0; i--)
					if (this.selectedScenario.multipleScenarios![i].checked) {
						if (i - 1 == 0 && this.selectedScenario.multipleScenarios!.length - 2 == 0) {
							this.deleteRows();
							this.selectedScenario.multipleScenarios = [];
							this.markUnsaved();
							return;
						}
						this.selectedScenario.multipleScenarios!.splice(i, 1);
					}
        
				this.exampleService.updateExampleTableEmit();
				this.markUnsaved();
				break;

			case 'block-editor':
				this.removeStepOnIteration(this.selectedBlock()!.stepDefinitions);
				break;

			default:
				break;
		}
		this.checkAllSteps(false);
	}

	/**
   * Removes step on iteration
   * @param stepsList Step definitions or examples
   */
	removeStepOnIteration(stepsList: StepDefinition | StepDefinitionBackground) {
		//background & scenario
		const stepsRecord = stepsList as unknown as Record<string, StepType[]>;
		for (const prop in stepsRecord)
			if (this.templateName() !== 'example' && prop !== 'example')
				for (let i = stepsRecord[prop].length - 1; i >= 0; i--)
					if (stepsRecord[prop][i].checked) {
						this.uncheckStep(stepsRecord[prop][i]);
						if (stepsRecord[prop][i]._blockReferenceId)
							this.blockService.checkRefOnRemoveEmitter(
								stepsRecord[prop][i]._blockReferenceId!
							);

						stepsRecord[prop].splice(i, 1);
					}


		if (this.allChecked)
			this.activeActionBar = !this.activeActionBar;

	}

	/**
   * Copy a block
   *
   */

	copyBlock(): void {
		//const copyBlock = {given: [], when: [], then: [], example: []};
		let block;
		let backgroundBlock: Block;
		switch (this.templateName()) {
			case 'background':
				if (!this.selectedStory?.background) break;
				block = this.addStepsToBlockOnIteration(this.selectedStory.background.stepDefinitions as unknown as Record<string, StepType[]>);
				/* for (const prop in this.selectedStory.background.stepDefinitions) {
          for (const s in this.selectedStory.background.stepDefinitions[prop]) {
            if (this.selectedStory.background.stepDefinitions[prop][s].checked) {
              this.selectedStory.background.stepDefinitions[prop][s].checked = false;
              copyBlock[prop].push(this.selectedStory.background.stepDefinitions[prop][s]);
            }
          }
        }*/
				backgroundBlock = { stepDefinitions: block as unknown as StepDefinition };
				sessionStorage.setItem('scenarioBlock', JSON.stringify(backgroundBlock));
				this.notify.success('successfully copied', 'Step(s)');
				break;

			case 'scenario': {
				block = this.addStepsToBlockOnIteration(this.selectedScenario.stepDefinitions as unknown as Record<string, StepType[]>, this.selectedScenario.multipleScenarios);
				/* for (const prop in this.selectedScenario.stepDefinitions) {
          if (prop !== 'example') {
            for (const s in this.selectedScenario.stepDefinitions[prop]) {
              if (this.selectedScenario.stepDefinitions[prop][s].checked) {
                this.selectedScenario.stepDefinitions[prop][s].checked = false;
                copyBlock[prop].push(this.selectedScenario.stepDefinitions[prop][s]);
              }
            }
          }
        }*/
				const scenarioBlock: Block = { stepDefinitions: block as unknown as StepDefinition };
				sessionStorage.setItem('scenarioBlock', JSON.stringify(scenarioBlock));
				this.notify.success('successfully copied', 'Step(s)');
				break;
			}

			case 'example': {
				block = [];
				for (let i = this.selectedScenario.multipleScenarios!.length - 1; i > 0; i--)
					if (this.selectedScenario.multipleScenarios![i].checked)
						block.push(this.selectedScenario.multipleScenarios![i]);


				const exampleBlock = {
					multipleScenarios: block
				};
				sessionStorage.setItem('copiedExampleBlock', JSON.stringify(exampleBlock));
				this.notify.success('successfully copied', 'Examples');
				break;
			}

			case 'block-editor': {
				block = this.addStepsToBlockOnIteration(
					this.selectedBlock()!.stepDefinitions as unknown as Record<string, StepType[]>
				);
				const editBlock: Block = { stepDefinitions: block as unknown as StepDefinition };
				sessionStorage.setItem('copiedEditBlock', JSON.stringify(editBlock));
				this.notify.success('successfully copied', 'Step(s)');
				break;
			}

			default:
				break;
		}
		this.checkAllSteps(false);
	}

	/**
   * Iterates through @param stepsList and adds it to a block
   * @param stepsList Step Definitions or examples
   * @returns
   */
	addStepsToBlockOnIteration(stepList: Record<string, StepType[]>, multipleScenarios?: MultipleScenario[]) {
		const stepsList = JSON.parse(JSON.stringify(stepList));
		const copyBlock: Record<string, (StepType | MultipleScenario)[]> = { given: [], when: [], then: [], example: [] };
		const stepsListIterate: Record<string, StepType[]> = { given: [], when: [], then: [] };
		const examplesToBeCopied: string[] = [];
		Object.keys(stepsListIterate).forEach((key: string, _: number) => {
			for (const s in stepsList[key])
				if (stepsList[key][s].checked) {
					this.uncheckStep(stepsList[key][s]);
					copyBlock[key].push(stepsList[key][s]);
					stepsList[key][s].values.forEach((value: string, index: number) => {
						if (stepsList[key][s].isExample[index])
							examplesToBeCopied.push(value.slice(1, -1));

					});
				}

		});
		if (examplesToBeCopied.length > 0) {
			const indexList: number[] = [];
			multipleScenarios![0].values.forEach((value: string, index: number) => {
				if (examplesToBeCopied.includes(value))
					indexList.push(index);

			});
			multipleScenarios!.forEach((element: MultipleScenario) => {
				const filteredExamples = element.values.filter((_val: string, index: number) =>
					indexList.includes(index)
				);
				element.values = filteredExamples;
				copyBlock['example'].push(element);
			});
		}
    
		return copyBlock;
	}
	/**
   * Insert block from clipboard
   *
   */
	insertCopiedBlock(): void {
		switch (this.templateName()) {
			case 'background':
				this.insertBackgroundBlock();
				break;
			case 'scenario':
				this.insertScenarioBlock();
				break;
			case 'example':
				this.insertExampleBlock();
				break;
			case 'block-editor':
				this.insertBlockEditorBlock();
				break;
			default:
				break;
		}
	}

	insertBackgroundBlock(): void {
		const clipboardRefBlock: StepType[] = [];
		Object.keys(this.clipboardBlock!.stepDefinitions).forEach((key, _) => {
			if (key === 'when')
				this.handleWhenKey(key, clipboardRefBlock);

		});
		if (this.clipboardBlock!.stepDefinitions.when.length !== clipboardRefBlock.length)
			this.markUnsaved();


	}

	handleWhenKey(key: string, clipboardRefBlock: StepType[]): void {
		if (!this.selectedStory?.background) return;
		this.clipboardBlock!.stepDefinitions[key].forEach((step: StepType) => {
			//to prevent blocks to be checked after pasting
			if (!step._blockReferenceId) {
				this.uncheckStep(step);
				(this.selectedStory.background.stepDefinitions as unknown as Record<string, StepType[]>)[key].push(JSON.parse(JSON.stringify(step)));
			} else 
				clipboardRefBlock.push(step);
      
		});
	}

	insertScenarioBlock(): void {
		if (this.clipboardBlock!.stepDefinitions['example'].length !== 0)
			this.handleScenarioWithExample();
		else 
			this.handleScenarioWithoutExample();
    
	}

	handleScenarioWithExample(): void {
		const ref = this.dialog.open(ConfirmDialogComponent, {
			data: {
				title: 'Block contains multiple scenario(s)',
				message: 'Do you want to copy it?',
				buttons: [
					{ label: 'Copy with multiple scenario(s)', value: 'copy', color: 'primary' },
					{ label: 'Copy without multiple scenario(s)', value: 'dontCopy' }
				]
			} as ConfirmDialogData
		});
		ref.afterClosed().subscribe(result => {
			if (result === 'copy') this.apiService.copyStepWithExampleOption('copy');
			else if (result === 'dontCopy') this.apiService.copyStepWithExampleOption('dontCopy');
		});
	}

	handleScenarioWithoutExample(): void {
		Object.keys(this.clipboardBlock!.stepDefinitions).forEach((key, _) => {
			if (key !== 'example')
				this.clipboardBlock!.stepDefinitions[key].forEach((step: StepType) => {
					this.uncheckStep(step);
					(this.selectedScenario.stepDefinitions as unknown as Record<string, StepType[]>)[key].push(JSON.parse(JSON.stringify(step)));
				});

		});
		this.highlightInputOnInit();
		this.markUnsaved();
	}

	insertExampleBlock(): void {
		this.clipboardBlock!.multipleScenarios.forEach((example: MultipleScenario) => {
			this.selectedScenario.multipleScenarios!.push(example);
		});
		this.exampleService.updateExampleTableEmit();
		this.markUnsaved();
	}

	insertBlockEditorBlock(): void {
		Object.keys(this.clipboardBlock!.stepDefinitions).forEach((key, _) => {
			this.clipboardBlock!.stepDefinitions[key].forEach((step: StepType) => {
				step.checked = false;
				(this.selectedBlock()!.stepDefinitions as unknown as Record<string, StepType[]>)[key].push(JSON.parse(JSON.stringify(step)));
			});

		});
	}

	/**
   * Changes the name of the example in the clipboard
   * @param indices indices of names to change
   * @param num number to append to the name
   */
	changeExampleName(block: { stepDefinitions: Record<string, StepType[]> }, indices: number[], num: number) {
		indices.forEach((index: number) => {
			const oldName = block.stepDefinitions['example'][0].values[index];
			let newName;
			if (num > 1) 
				newName = oldName.split(' - ')[0] + ' - ' + num;
			else 
				newName = oldName + ' - ' + num;
      
			block.stepDefinitions['example'][0].values[index] = newName;
			Object.keys(block.stepDefinitions).forEach((key, _) => {
				if (key != 'example') 
					block.stepDefinitions[key].forEach((step: StepType, i: number) => {
						step.values.forEach((value: string, j: number) => {
							if (value === '<' + oldName + '>') 
								block.stepDefinitions[key][i].values[j] = '<' + newName + '>';
              
						});
					});
        
			});
		});
	}

	/**
   * Inserts copied steps with examples
   * Checks for unique example names
   */
	insertStepsWithExamples(block: { stepDefinitions: Record<string, StepType[]> }) {
		if (this.selectedScenario.multipleScenarios!.length != 0) {
			let indices = this.selectedScenario.multipleScenarios![0].values
				.map((x: string) => block.stepDefinitions['example'][0].values.indexOf(x))
				.filter((x: number) => x != -1);
			let num = 1;
			while (indices.length > 0) {
				this.changeExampleName(block, indices, num);
				num++;
				indices = this.selectedScenario.multipleScenarios![0].values
					.map((x: string) => block.stepDefinitions['example'][0].values.indexOf(x))
					.filter((x: number) => x != -1);
			}
		}
		Object.keys(block.stepDefinitions).forEach((key: string, _: number) => {
			if (key != 'example')
				block.stepDefinitions[key].forEach((step: StepType, _j: number) => {
					this.uncheckStep(step);
					(this.selectedScenario.stepDefinitions as unknown as Record<string, StepType[]>)[key].push(
						JSON.parse(JSON.stringify(step))
					);
				});
			else if (key == 'example') 
				this.insertCopiedExamples(block);
      
		});
		this.highlightInputOnInit();
		this.markUnsaved();
	}

	/**
   * Inserts copied steps without example
   * Removes examplenames from steps values
   */
	insertStepsWithoutExamples() {
		Object.keys(this.clipboardBlock!.stepDefinitions).forEach((key: string, _: number) => {
			if (key != 'example')
				this.clipboardBlock!.stepDefinitions[key].forEach(
					(step: StepType, _j: number) => {
						const stepCopy = JSON.parse(JSON.stringify(step));
						step.isExample!.forEach((isExample: boolean, index: number) => {
							if (isExample) {
								stepCopy.isExample[index] = false;
								stepCopy.values[index] = '';
							}
						});
						(this.selectedScenario.stepDefinitions as unknown as Record<string, StepType[]>)[key].push(
							JSON.parse(JSON.stringify(stepCopy))
						);
					}
				);

		});
		this.highlightInputOnInit();
		this.markUnsaved();
	}

	/**
   * checks if example name of clipboard already in selected scenario and if sets toaster
   * checks for number of values and adds 'value' in case of different lengths of clipboard and selected scenario
   * checks for example names and adds ' - Copy' in case of double names
   */
	insertCopiedExamples(block: { stepDefinitions: Record<string, StepType[]> }) {
		const selectedExampleDefs = this.selectedScenario.multipleScenarios!;
		const blockExampleDefs = block.stepDefinitions['example'];

		if (selectedExampleDefs.length === 0) {
			this.selectedScenario.multipleScenarios = blockExampleDefs;
			return;
		}

		if (selectedExampleDefs.length === blockExampleDefs.length)
			this.insertValuesIntoSelectedExamples(selectedExampleDefs, blockExampleDefs);
		else if (selectedExampleDefs.length < blockExampleDefs.length) {
			this.insertValuesIntoSelectedExamples(selectedExampleDefs, blockExampleDefs, true);
			this.insertNewExamples(selectedExampleDefs, blockExampleDefs);
		} else {
			this.insertValuesIntoSelectedExamples( selectedExampleDefs, blockExampleDefs);
			this.insertPlaceholderValues(selectedExampleDefs, selectedExampleDefs[0].values.length);
		}
		this.exampleService.updateExampleTableEmit();
		this.markUnsaved();
	}

	insertValuesIntoSelectedExamples(
		selectedExampleDefs: MultipleScenario[],
		blockExampleDefs: MultipleScenario[],
		useSelectedLength = false
	) {
		const length = useSelectedLength
			? selectedExampleDefs.length
			: blockExampleDefs.length;
		for (let i = 0; i < length; i++)
			blockExampleDefs[i].values.forEach((val: string) => {
				selectedExampleDefs[i].values.push(val);
			});

	}

	insertNewExamples(selectedExampleDefs: MultipleScenario[], blockExampleDefs: MultipleScenario[]) {
		const selectedLength = selectedExampleDefs.length;
		for (let i = selectedLength; i < blockExampleDefs.length; i++) {
			const clipboardValueLength = blockExampleDefs[i].values.length;
			const selectedValueLength =
				selectedExampleDefs[i - 1].values.length - clipboardValueLength;
			selectedExampleDefs.push(
				JSON.parse(JSON.stringify(selectedExampleDefs[i - 1]))
			);
			for (let j = 0; j < selectedValueLength; j++)
				selectedExampleDefs[i].values[j] = 'value';

			for (let k = 0; k < clipboardValueLength; k++)
				selectedExampleDefs[i].values[selectedValueLength + k] =
					blockExampleDefs[i].values[k];

		}
	}

	insertPlaceholderValues(selectedExampleDefs: MultipleScenario[], length: number) {
		selectedExampleDefs.forEach((element: MultipleScenario) => {
			for (let i = element.values.length; i < length; i++)
				element.values.push('value');

		});
	}

	/**
   * Opens add block modal
   *
   */

	addBlock() {
		const id = localStorage.getItem('id') ?? '';
		this.addBlockModal().openAddBlockFormModal(this.templateName(), id);
	}

	/**
   * Block methods
   */

	editBlock(event: Event, blockStep: StepType) {
		event.stopPropagation();
		const block = this.getBlockInSteps(blockStep._blockReferenceId!);
		this.editBlockModal().openEditBlockModal(block);
		const x = document.getElementsByClassName('stepBlockContainer')[0];
		x.setAttribute('aria-expanded', 'false');
	}

	/**
   * get Block in Scenario to edit/unpack
   * @param blockId
   */

	getBlockInSteps(blockId: string): Block {
		let foundBlock: Block | undefined;
		this.blocks().forEach((block: Block) => {
			if (block._id?.toString() === blockId.toString())
				foundBlock = block;

		});
		return foundBlock!;
	}
	/**
   * Methods for referenced Blocks (only implemented for scenarios)
   */

	/**
   * Select Block by blockId to get Block Object
   * @param blockId: _id of the Block
   */
	selectBlock(block: StepType) {
		this.blockSelectTriggerEvent.emit(block);
		block.blockStepExpanded = true;
	}

	/**
   * Unselect Block and reset selected Block
   */
	unselectBlock(blockStep: StepType) {
		blockStep.blockStepExpanded = false;
	}

	showUnpackBlockToast(block: Block | null, stepReference: StepType, event: Event) {
		event.stopPropagation();
		if (!block)
			block = this.getBlockInSteps(stepReference._blockReferenceId!);

		const toastData = { block: block, stepReference: stepReference };
		const ref = this.dialog.open(ConfirmDialogComponent, {
			data: {
				title: 'Unpack Block',
				message: 'Unpacking the Block will remove its reference to the original Block! Do you want to unpack the block?',
				buttons: [
					{ label: 'Unpack', value: 'unpack', color: 'warn' },
					{ label: 'Cancel', value: 'cancel' }
				]
			} as ConfirmDialogData
		});
		// Emitter expects Block but subscriber uses { block, stepReference } — legacy type mismatch
		ref.afterClosed().subscribe(result => {
			if (result === 'unpack') this.blockService.unpackBlockEmitter(toastData);
		});
	}

	/* Example case methods */

	/**
   * List all examples from scenario
   * @returns returns all examples in list
   */
	getExampleList() {
		if (this.templateName() != 'block-editor') {
			if (this.selectedScenario.multipleScenarios &&
          this.selectedScenario.multipleScenarios.length > 0 &&
          this.selectedScenario.multipleScenarios[0] &&
          this.selectedScenario.multipleScenarios[0].values &&
          this.selectedScenario.multipleScenarios[0].values.length > 0) 
				return this.selectedScenario.multipleScenarios[0].values;
			
			return undefined;
		}

	}

	/**
   * Checks the input if an example should be generated or removed
   * @param input
   * @param stepIndex
   * @param valueIndex
   * @param stepType
   */
	addIsExample(input: string, stepIndex: number, valueIndex: number, stepType: string) {
		switch (stepType) {
			case 'given':
				this.selectedScenario.stepDefinitions.given[stepIndex].isExample![valueIndex] = input == 'example' ? true : false;
				break;
			case 'when':
				this.selectedScenario.stepDefinitions.when[stepIndex].isExample![valueIndex] = input == 'example' ? true : false;
				break;
			case 'then':
				this.selectedScenario.stepDefinitions.then[stepIndex].isExample![valueIndex] = input == 'example' ? true : false;
				break;
		}
	}

	/**
   * Rename an example
   * @param newName
   * @param index index of example in values array
   */
	renameExample(newName: string, index: number) {
		if (this.templateName() == 'example') {
			const oldName =
				this.selectedScenario.multipleScenarios![0].values[index];
			this.selectedScenario.multipleScenarios![0].values[index] = newName;
			this.uncutInputs[this.uncutInputs.indexOf('<' + oldName + '>')] =
				'<' + newName + '>';

			this.selectedScenario.stepDefinitions.given.forEach((value, index) => {
				value.values.forEach((val, i) => {
					if (val == '<' + oldName + '>') 
						this.selectedScenario.stepDefinitions.given[index].values[i] =
							'<' + newName + '>';
          
				});
			});

			this.selectedScenario.stepDefinitions.when.forEach((value, index) => {
				value.values.forEach((val, i) => {
					if (val == '<' + oldName + '>') 
						this.selectedScenario.stepDefinitions.when[index].values[i] =
							'<' + newName + '>';
          
				});
			});

			this.selectedScenario.stepDefinitions.then.forEach((value, index) => {
				value.values.forEach((val, i) => {
					if (val == '<' + oldName + '>') 
						this.selectedScenario.stepDefinitions.then[index].values[i] =
							'<' + newName + '>';
          
				});
			});
			this.exampleService.updateExampleTableEmit();
			this.markUnsaved();
		}
	}

	/**
   * Handles the update for examples
   * @param input
   * @param step
   * @param valueIndex
   */
	handleExamples(input: string) {
		this.uncutInputs.push(input);
		// for first example creates 2 steps
		if (this.selectedScenario.multipleScenarios?.[0] === undefined)
			this.createFirstExample(input);
		else 
		// else just adds as many values to the examples to fill up the table
			this.fillExamples(input);
    
	}

	/**
   * Fill all example values after an example step was added
   * @param cutInput
   * @param step
   */
	fillExamples(cutInput: string) {
		if (this.templateName() == 'example') {
			this.selectedScenario.multipleScenarios![0].values.push(cutInput);
			// if the table has no rows add a row

			if (this.selectedScenario.multipleScenarios![1] === undefined) {
				const multipleScenarios: MultipleScenario = {
					values: ['value'],
					checked: false,
					deactivated: false
				};
				this.selectedScenario.multipleScenarios!.push(multipleScenarios);
				const len = this.selectedScenario.multipleScenarios![0].values.length;
				for (let j = 1; j < len; j++)
					this.selectedScenario.multipleScenarios![this.selectedScenario.multipleScenarios!.length - 1].values.push('value');

			} else
				for (let j = 1; j < this.selectedScenario.multipleScenarios!.length; j++)
					this.selectedScenario.multipleScenarios![j].values.push('value');
        
      
			this.exampleService.updateExampleTableEmit();
		}
	}

	/**
   * Creates the first example of the scenario
   * @param cutInput
   * @param step
   */
	createFirstExample(cutInput: string) {
		const multipleScenarios1: MultipleScenario = {
			values: [cutInput]
		};
		const multipleScenarios2: MultipleScenario = {
			values: ['value'],
			checked: false,
			deactivated: false
		};
		const multipleScenarios3: MultipleScenario = {
			values: ['value'],
			checked: false,
			deactivated: false
		};
		this.selectedScenario.multipleScenarios!.push(...[multipleScenarios1, multipleScenarios2, multipleScenarios3]);
		const table = document.getElementsByClassName('mat-mdc-table')[0];
		if (table)
			table.classList.add('mat-mdc-elevation-z8');

		// if (this.templateName() === 'scenario'){
		this.setIsExampleFlags(false);
		// }
		// Without this the Save button stays on "Without changes" and the new table is never persisted
		this.markUnsaved();
		// The click came from the modal, outside the scenario editor's OnPush tree, so its Save button must be re-checked explicitly
		this.cdr.markForCheck();
	}

	/**
   * Add Value Row
   */
	addExampleValueRow() {
		const row = JSON.parse(
			JSON.stringify(this.selectedScenario.multipleScenarios![0])
		);
		row.values.forEach((_value: string, index: number) => {
			row.values[index] = 'value';
		});
		this.selectedScenario.multipleScenarios!.push(row);
		this.exampleService.updateExampleTableEmit();
		this.markUnsaved();
	}

	/**
   * Add value and style input
   * Value is in textContent and style is in innerHTML
   * If initialCall only check if a regex is already there and hightlight it
   * Only hightlights input in first field of regexSteps, only then steps for now. Gets checked with stepPre
   * @param element HTML element of contentedible div
   * @param stepIndex for addToValue
   * @param valueIndex for addToValue
   * @param stepType for addToValue
   * @param step for addToValue
   * @param stepPre pre text of step
   * @param initialCall if call is from ngAfterView
   * @param sd the type of scenario block (given,when,then)
   */
	highlightInput(
		element: HTMLElement,
		stepIndex?: number,
		valueIndex?: number,
		stepType?: string,
		step?: StepType,
		stepPre?: string,
		initialCall?: boolean,
		sd?: string
	) {
		const textField = element;
		const textContent = textField.textContent;
		let regexDetected = false;

		if (!initialCall)
			this.addToValues(textContent, stepIndex!, valueIndex!, stepType!, step);
    

		if (!initialCall) 
			this.initialRegex = false;
    

		if (initialCall && regexDetected) 
			this.regexInStory = true;
    

		regexDetected = this.highlightInputService.highlightInput(
			element,
			initialCall,
			this.isDark(),
			this.regexInStory,
			valueIndex,
			stepPre,
			sd === 'then'
		);

		this.regexInStory = regexDetected || this.regexInStory;
	}

	/**
   * Helper for inital hightlighting
   */
	highlightInputOnInit() {
		// Regex Highlight on init
		this.regexInStory = false;
		this.initialRegex = false;
		//Logic currently not needed since regex only in then step
		/*if(this.step_type_input){ //background
        this.step_type_input.forEach(in_field => {  
          this.highlightRegex(in_field.nativeElement.id,undefined,undefined,undefined,undefined,true)
        });
      }*/

		if (this.step_type_input1() && this.step_type_input1().length > 0) {
			//scenario first input value
			const stepTypePre = this.step_type_pre();
			const stepTypeInput_1 = this.step_type_input1().filter((in_field) => in_field !== undefined);
			stepTypeInput_1.forEach((in_field, index) => {
				if (in_field && stepTypePre[index]) 
					this.highlightInput(
						in_field.nativeElement,
						undefined,
						0,
						undefined,
						undefined,
						stepTypePre[index].nativeElement.innerText,
						true,
						// mies hin geschumelt, muss checken ob es nur im then ist beim highlighten für den regex
						in_field.nativeElement.id.includes('_2_input') ? 'then' : undefined
					);
        
			});
			//Logic currently not needed since regex only in first input field
			/*this.step_type_input2.forEach((in_field, index) => {  //scenario second input value
        this.highlightRegex(in_field.nativeElement.id,undefined,1,undefined,undefined,stepTypePre1[index].nativeElement.innerText, true)
      });
      this.step_type_input3.forEach((in_field, index) => {  //scenario third input value
        this.highlightRegex(in_field.nativeElement.id,undefined,2,undefined,undefined,stepTypePre1[index].nativeElement.innerText, true)
      });*/
		}
	}

	/**
   * Helper for DOM change subscription
   */
	regexDOMChangesHelper() {

		//Logic currently not needed
		/*this.step_type_input.changes.subscribe(_ => { //background
      this.step_type_input.forEach(in_field => {
        if (in_field.nativeElement.id === this.lastToFocus) {
          in_field.nativeElement.focus();
        }
      });
      this.lastToFocus = '';
    });*/

		// this.step_type_pre.changes.subscribe(_ => { //scenario text before first input value
		//   this.step_type_pre.forEach(in_field => {
		//     if (in_field && in_field.nativeElement.id === this.lastToFocus) {
		//       in_field.nativeElement.focus();
		//     }
		//   });
		//   this.lastToFocus = '';
		//   this.highlightInputOnInit()
		// });

		// Converted from QueryList .changes.subscribe to signal effect (stepTypeInput1Effect)
		// The effect tracks this.step_type_input1() and runs on view children changes

		//Logic currently not needed
		/*this.step_type_input2.changes.subscribe(_ => { //scenario second input value
      this.step_type_input2.forEach(in_field => {
        if (in_field.nativeElement.id === this.lastToFocus) {
          in_field.nativeElement.focus();
        }
      });
      this.lastToFocus = '';
    });
    this.step_type_input3.changes.subscribe(_ => { //scenario third input value
      this.step_type_input3.forEach(in_field => {
        if (in_field.nativeElement.id === this.lastToFocus) {
          in_field.nativeElement.focus();
        }
      });
      this.lastToFocus = '';
    });*/

	}

	matchString (element: HTMLElement) {
		const textContent = element.textContent;
		const examplesRegex = /<[^>]*>/;
		const match = textContent.match(examplesRegex);
		if (match && this.templateName() === 'block-editor') 
			element.contentEditable = 'false';
     
	}

	/**
   * Quote validation on blur events
   */
	onStepInputQuoteValidation(event: FocusEvent, _stepIndex?: number, _valueIndex?: number, _stepType?: string): void {
		const element = event.target as HTMLElement;
		const text = element.textContent || '';
    
		this.stepValidationService.validateAndShowQuoteWarning(text, element);
	}

}
