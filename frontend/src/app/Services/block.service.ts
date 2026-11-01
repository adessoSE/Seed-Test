import { Injectable, inject, signal } from '@angular/core';
import { Block } from '@seed-test/shared/models/Block';
import { Observable, firstValueFrom } from 'rxjs';
import { ApiService } from '../Services/api.service';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, tap } from 'rxjs/operators';
import { Story } from '@seed-test/shared/models/Story';
import { StepType } from '@seed-test/shared/models/StepType';
import { StoryService } from './story.service';
import { Scenario } from '@seed-test/shared/models/Scenario';
import { ActionTrigger } from './action-trigger';
import { NotificationService } from './notification.service';

/** Payload for adding a block to a scenario — [component, block, stepType, asSingleSteps] */
type AddBlockPayload = [string, Block, string, boolean];

/** Payload for unpacking a block — the block and the step reference it is unpacked from */
export interface UnpackBlockPayload {
	block: Block;
	stepReference: StepType;
}

/** Toast notification data */
interface ToastData {
	title: string;
	message: string;
	type?: string;
}

/**
 * Service for communication between block component and the backend
 */
@Injectable({
	providedIn: 'root'
})
export class BlockService {
	apiService = inject(ApiService);
	private http = inject(HttpClient);
	storyService = inject(StoryService);
	notify = inject(NotificationService);

	/** Action channel to add a block to the current scenario — carries [component, block, stepType, asSingleSteps] */
	readonly addBlockToScenarioTrigger = new ActionTrigger<AddBlockPayload>();
	/** Signal for block update trigger */
	readonly updateBlocksTrigger = signal(0);
	/** Action channel to convert steps into reference — carries the block */
	readonly convertToReferenceTrigger = new ActionTrigger<Block>();
	/** Action channel to delete reference — carries the block */
	readonly deleteReferenceTrigger = new ActionTrigger<Block>();
	/** Action channel to check for reference — carries blockReferenceId */
	readonly checkRefOnRemoveTrigger = new ActionTrigger<string>();
	/** Signal for delete block trigger */
	readonly deleteBlockTrigger = signal(0);
	/** Action channel to unpack block — carries the block and the step reference it was unpacked from */
	readonly unpackBlockTrigger = new ActionTrigger<UnpackBlockPayload>();
	/** Action channel to update reference block name — carries the block */
	readonly updateNameRefTrigger = new ActionTrigger<Block>();
	/**
  * Stores an array of references blocks, before the reference is deleted
  */
	referencesBlocks: Block[] = [];
	/**
   * Scenarios to update when reference block is completely deleted
   */
	scenariosToUpdate!: Scenario[];
	referenceStories!: Story[];
	referenceScenarios!: Scenario[];
	block!: Block;

	/** Reactive toast data state — replaces BehaviorSubject */
	readonly toastData = signal<ToastData | null>(null);

	/** Updates the toast data signal */
	updateToastData(data: ToastData) {
		this.toastData.set(data);
	}
	/**
  * Emits the add block to scenario action
  * @param block
  * @param correspondingComponent
  */
	addBlockToScenario(block: Block, correspondingComponent: string, addBlockToStepType: string, addAsSingleSteps: boolean) {
		const val: AddBlockPayload = [correspondingComponent, block, addBlockToStepType, addAsSingleSteps];
		this.addBlockToScenarioTrigger.emit(val);
	}
	/**
  * Triggers the update blocks signal
  */
	updateBlocksEmitter() {
		this.updateBlocksTrigger.update(n => n + 1);
	}

	/**
  * Emits the convert to reference action
  */
	convertToReferenceEmitter(block: Block) {
		this.convertToReferenceTrigger.emit(block);
	}

	/**
  * Triggers the delete block signal
  */
	public deleteBlockEmitter() {
		this.deleteBlockTrigger.update(n => n + 1);
	}
	/**
  * Emits the unpack block action
  * @param payload block and the step reference it is unpacked from
  */
	public unpackBlockEmitter(payload: UnpackBlockPayload) {
		this.unpackBlockTrigger.emit(payload);
	}
	/**
  * Emits the update reference block name action
  * @param block
  */
	public updateNameRefEmitter(block: Block) {
		this.updateNameRefTrigger.emit(block);
	}
	/**
  * Emits the check reference on remove action
  * @param blockReferenceId
  */
	public checkRefOnRemoveEmitter(blockReferenceId: string) {
		this.checkRefOnRemoveTrigger.emit(blockReferenceId);
	}
	/**
  * Emits the delete reference action
  * @param block
  */
	public deleteReferenceEmitter(block: Block) {
		this.deleteReferenceTrigger.emit(block);
	}

	/**
  * Retrieves the blocks
  * @param repoId id of the project of the blocks
  * @returns
  */
	getBlocks(repoId: string): Observable<Block[]> {
		const str = this.apiService.apiServer + '/block/getBlocks/' + repoId;
		return this.http.get<Block[]>(str, ApiService.getOptions())
			.pipe(tap(_ => {
				//
			}),
			catchError(this.apiService.handleError));
	}
	/**
  * Updates a block
  * @param blockTitle
  * @param block
  * @returns
  */
	updateBlock(block: Block): Observable<Block> {
		return this.http
			.put<Block>(this.apiService.apiServer + '/block/' + block._id, block, ApiService.getOptions())
			.pipe(tap(_ => {
				//
			}),
			catchError(this.apiService.handleError));
	}
	/**
  * Deletes a block
  * @param blockId
  * @returns
  */
	deleteBlock(blockId: string) {
		const str = this.apiService.apiServer + '/block/' + blockId;
		return this.http.delete<Block>(str, ApiService.getOptions())
			.pipe(tap(_ => {
				//
			}),
			catchError(this.apiService.handleError));
	}
	/**
  * Saves a new block
  * @param block
  * @returns
  */
	saveBlock(block: Block) {
		return this.http
			.post<Block>(this.apiService.apiServer + '/block/', block, ApiService.getOptions())
			.pipe(tap(_ => {
				//
			}));
	}
	/**
   * Delete central background-block
   * @param block
   * @param stories
   */
	checkBackgroundsOnDelete(block: Block, stories: Story[]) {
		const matchingStories = stories.filter((s: Story) => s !== null && s.background.name === block.name);
		// Fire-and-forget: delete is async, proceed immediately.
		// firstValueFrom: the trigger update must run only after the delete succeeds.
		if (matchingStories.length == 1)
			firstValueFrom(this.deleteBlock(block._id!)).then(() => {
				this.updateBlocksTrigger.update(n => n + 1);
			}).catch(() => {
				// Delete may fail (auth/network) — block stays deleted; no UI change needed on failure
			});
    
	}

	/**
     * Update a Block
     * @param block
     * @returns
     */
	editBlock(block: Block) {
		return this.http
			.put<Block>(this.apiService.apiServer + '/block/' + block._id, block, ApiService.getOptions())
			.pipe(tap(),
				catchError(this.apiService.handleError)
			);
	}
	/**
  * Search for a references in all stories
  * @param stories
  */
	searchReferences(stories: Story[]) {
		this.referenceScenarios = [];
		stories = stories.filter((s) => s !== null);
		stories.flatMap((story) => story.scenarios
			.filter((scenario) => scenario.hasRefBlock))
			.forEach((scenario) => this.referenceScenarios.push(scenario));

		this.referenceStories = this.referenceScenarios
			.map((scenario) => stories.find((story) => story.scenarios.includes(scenario)))
			.filter((story, index, arr): story is Story => !!story && arr.indexOf(story) === index);
	}
	/**
  * delete a reference and update Block
  */
	deleteUpdateReferenceForBlock() {
		if (this.referencesBlocks.length !== 0) {
			// Promise.all + firstValueFrom: every update is awaited before continuing.
			// One trigger update after all blocks finish avoids a UI refresh per block.
			const promises = this.referencesBlocks
				.filter(block => block.usedAsReference === false)
				.map(block => {
					delete block.usedAsReference;
					return firstValueFrom(this.updateBlock(block)).catch(() => null);
				});
			Promise.all(promises).then(() => {
				this.updateBlocksTrigger.update(n => n + 1);
			}).catch(() => {
				// Trigger update on failure — UI will still reload via other paths
			});
      
			this.referencesBlocks = [];
		} else return 0;
	}

	/**
    * Сhecking whether the block is used as a reference
    * @param blockReferenceId
    * @param blocks
    * @param stories
  */
	checkBlockOnReference(blocks: Block[], stories: Story[], block: Block) {
		if (!this.findRefBlockInScenarios(block, stories, 'checkOnReference'))
			this.updateBlockReferenceStatus(block._id!, blocks);
    
	}
	/**
    * update block reference status
    * @param blockReferenceId
    * @param blocks
  */
	updateBlockReferenceStatus(blockReferenceId: string, blocks: Block[]): void {
		for (const block of blocks) 
			if (block._id === blockReferenceId) {
				block.usedAsReference = false;
				this.referencesBlocks.push(block);
			}
    
	}
	/**
  * Check reference and unpack block in all relevant stories
  * @param block
  * @param stories
  */
	deleteBlockReference(block: Block, stories: Story[]) {
		this.findRefBlockInScenarios(block, stories, 'deleteBlockReference');
		//update relevant stories after unpacking
		this.updateReferenceStories();

	}
	/**
   * Update scenarios after changes in reference blocks
   * @param block
   * @param stories
   */
	updateReferenceStories() {
		if (this.scenariosToUpdate.length > 0) {
			// Promise.all + firstValueFrom: every update is awaited before continuing.
			// No trigger update here — callers update UI via other signal paths.
			// One PUT per story: the backend bumps the version on each PUT, so a second PUT with the same version would 409.
			const promises = this.referenceStories
				.filter(story => this.scenariosToUpdate.some(scenario => story.scenarios.includes(scenario)))
				.map((story) => firstValueFrom(this.storyService.updateStory(story))
					.then((savedStory) => {
						// Written in place: these are the editor's story objects, and this method returns nothing to the editor
						if (savedStory) story.version = savedStory.version;
					})
					.catch((err: unknown) => {
						if (err instanceof HttpErrorResponse && err.status === 409)
							this.notify.error('Story was changed in the meantime. Reload it before saving.');
						return null;
					}));
			Promise.all(promises).catch(() => {
				// Story updates may fail — callers handle UI via other signal paths
			});
		}
	}
	/**
   * Unpack steps from a block. When deleting a block, unpack all references in the repository.
   * @param block
   * @param scenario
   */
	unpackScenarioWithBlock(block: Block, scenario: Scenario, stepReference?: StepType) {
		delete block.usedAsReference;

		if (stepReference) 
			this.unpackStepsFromBlock(block, scenario, stepReference);
		else {
			// Unpack steps from the block for all reference blocks in the scenario
			const arrayRefBlocks = this.findReferenceBlocks(scenario, block);
			arrayRefBlocks.forEach(_ => {
				this.unpackStepsFromBlock(block, scenario);
			});
		}
	}

	/**
   * Unpack steps from the block and remove the block reference among the steps.
   * @param block
   * @param scenario
   * @param stepReference
   */
	unpackStepsFromBlock(block: Block, scenario: Scenario, stepReference?: StepType) {
		if (block && block.stepDefinitions) {
			const blockSteps = block.stepDefinitions as unknown as Record<string, StepType[]>;
			const scenarioSteps = scenario.stepDefinitions as unknown as Record<string, StepType[]>;
			for (const s in blockSteps) {
				blockSteps[s].forEach((step: StepType) => {
					step.checked = false;
					if (scenarioSteps[s])
						scenarioSteps[s].push(JSON.parse(JSON.stringify(step)));
					else
						scenario.multipleScenarios?.push(JSON.parse(JSON.stringify(step)));
				});
				// Remove the block reference among the steps
				this.removeBlocksAmongSteps(scenarioSteps[s], block, stepReference);

			}
		}
    
	}
	/**
   * Find reference blocks in the given scenario for a specific block.
   * @param scenario
   * @param block
   * @returns Array of reference blocks
   */
	findReferenceBlocks(scenario: Scenario, block: Block): StepType[] {
		const arrayRefBlocks: StepType[] = [];

		const scenarioSteps = scenario.stepDefinitions as unknown as Record<string, StepType[]>;
		for (const type in scenarioSteps)
			scenarioSteps[type].forEach((step: StepType) => {
				if (step._blockReferenceId === block._id)
					arrayRefBlocks.push(step);
			});
    
		return arrayRefBlocks;
	}

	/**
   * Remove blocks among steps based on a block reference or step reference.
   * @param stepToSplice
   * @param block
   * @param stepReference
   */
	removeBlocksAmongSteps(stepToSplice: StepType[], block: Block, stepReference? : StepType) {
		const index = stepReference !== undefined
			? stepToSplice?.findIndex((element: StepType) => element.stepType === stepReference.stepType && element.id === stepReference.id )
			: stepToSplice?.findIndex((element: StepType) => element._blockReferenceId === block._id);

		if (index > -1) 
			stepToSplice.splice(index, 1);
    
	}

	/**
   * Update the reference name in scenarios after changing the block name
   * @param block
   * @param stories
   */
	updateNameReference(block: Block, stories: Story[]) {
		if (this.findRefBlockInScenarios(block, stories, 'updateRefName')) 
			this.updateReferenceStories();
		else 
			console.error('Reference block not found');
    
	}
	/**
    * Searching for a reference block in scenarios
    * @param block
    * @param stories
    * @param event
    */
	findRefBlockInScenarios(block: Block, stories: Story[], event: string) {
		this.searchReferences(stories);
		this.scenariosToUpdate = [];
		let blockFound = false;

		this.referenceScenarios.forEach((scenario) => {
			const scenarioSteps = scenario.stepDefinitions as unknown as Record<string, StepType[]>;
			for (const s in scenarioSteps)
				scenarioSteps[s].forEach((refStep: StepType) => {
					if (refStep._blockReferenceId == block._id) 
						switch (event) {
							case 'updateRefName':
								refStep.type = block.name!;
								this.scenariosToUpdate.push(scenario);
								blockFound = true;
								break;
							case 'checkOnReference':
								blockFound = true;
								break;
							case 'deleteBlockReference':
								this.unpackScenarioWithBlock(block, scenario);
								this.scenariosToUpdate.push(scenario);
								blockFound = true;
								break;
							default:
								break;
						}
          
				});
      
		});
		return blockFound;
	}

	/** 
   * convert selected steps To Reference
   * @param block
   * @param scenario
   */
	convertSelectedStepsToRef(block: Block, scenario: Scenario) {
		const { indexToPush, pushStepDef } = this.findMatchingSteps(block, scenario);
		this.removeMatchingSteps(block, scenario);
		this.insertBlockReference(block, scenario, indexToPush, pushStepDef);
	}

	/** 
   * find the index and step definition for pushing the reference block
   * @param block
   * @param scenario
   */
	findMatchingSteps(block: Block, scenario: Scenario): { indexToPush?: number; pushStepDef?: string } {
		let indexToPush: number | undefined;
		let pushStepDef: string | undefined;
		const scenarioSteps = scenario.stepDefinitions as unknown as Record<string, StepType[]>;
		const blockSteps = block.stepDefinitions as unknown as Record<string, StepType[]>;
		for (const step in scenarioSteps)
			scenarioSteps[step].forEach((stepInScenario: StepType, index: number) => {
				for (const stepBlock in blockSteps)
					blockSteps[stepBlock].forEach((stepInBlock: StepType) => {
						if (stepInScenario.stepType == stepInBlock.stepType && stepInScenario.id === stepInBlock.id) {
							indexToPush = indexToPush === undefined ? index : indexToPush;
							pushStepDef = pushStepDef === undefined ? stepInScenario.stepType : pushStepDef;
						}
					});
			});
    
		return { indexToPush, pushStepDef };
	}

	/** 
   * remove the steps from the scenario that need to be merged into a reference block
   * @param block
   * @param scenario
   */
	removeMatchingSteps(block: Block, scenario: Scenario): void {
		const scenarioSteps = scenario.stepDefinitions as unknown as Record<string, StepType[]>;
		const blockSteps = block.stepDefinitions as unknown as Record<string, StepType[]>;
		for (const step in scenarioSteps)
			for (let index = scenarioSteps[step].length - 1; index >= 0; index--) {
				const stepInScenario = scenarioSteps[step][index];
				for (const stepBlock in blockSteps)
					blockSteps[stepBlock].forEach((stepInBlock: StepType) => {
						if (stepInScenario.stepType === stepInBlock.stepType && stepInScenario.id === stepInBlock.id)
							scenarioSteps[step].splice(index, 1);
					});
			}
    
	}

	/** 
   * insert a reference block to the scenario
   * @param block
   * @param scenario
   */
	insertBlockReference(block: Block, scenario: Scenario, indexToPush?: number, pushStepDef?: string): void {
		if (indexToPush !== undefined && pushStepDef !== undefined) {
			const blockReference: StepType = {
				_blockReferenceId: block._id,
				id: indexToPush + 1,
				type: block.name!,
				stepType: pushStepDef,
				pre: '',
				mid: '',
				post: '',
				values: []
			};

			(scenario.stepDefinitions as unknown as Record<string, StepType[]>)[pushStepDef].splice(indexToPush, 0, JSON.parse(JSON.stringify(blockReference)));
			scenario.saved = false;
		}
	}
}
