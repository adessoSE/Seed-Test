import { EventEmitter, Injectable } from '@angular/core';
import { Block } from '../model/Block';
import { BehaviorSubject, Observable} from 'rxjs';
import { ApiService } from '../Services/api.service';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { catchError, tap } from 'rxjs/operators';
import { Story } from '../model/Story';
import { StepType } from '../model/StepType';
import { StoryService } from './story.service';
import { Scenario } from '../model/Scenario';
import { log } from '@angular-devkit/build-angular/src/builders/ssr-dev-server';

/**
 * Service for communication between block component and the backend
 */
@Injectable({
  providedIn: 'root'
})
export class BlockService {

  /**
  * @ignore
  */
  constructor(public apiService: ApiService, private http: HttpClient, public toastr: ToastrService, public storyService: StoryService) { }

  /**
   * Event emitter to add a block to the current scenario
   */
  public addBlockToScenarioEvent = new EventEmitter();
  /**
   * Event emitter to add update a block
   */
  public updateBlocksEvent: EventEmitter<any> = new EventEmitter();
  /**
   * Event emitter to convert steps into reference
   */
  public convertToReferenceEvent: EventEmitter<any> = new EventEmitter();
  /**
   * Event emitter to delete reference
   */
  public deleteReferenceEvent: EventEmitter<any> = new EventEmitter();
  /**
   * Event emitter to check for reference
   */
  public checkRefOnRemoveEvent: EventEmitter<any> = new EventEmitter();
  /**
   * Delete emitter to add delete a block from blocks
   */
  public deleteBlockEvent = new EventEmitter();
  /**
   * Event emitter to unpack Block
   */
  public unpackBlockEvent = new EventEmitter();
  /**
   * Event emitter to update reference Block name
   */
  public updateNameRefEvent = new EventEmitter();

  public updateScenariosRefEvent = new EventEmitter();

  /**
  * Stores an array of references blocks, before the reference is deleted
  */
  referencesBlocks: Block[] = [];
  /**
   * Scenarios to update when reference block is completely deleted
   */
  scenariosToUpdate: Scenario[];
  referenceStories: Story[];
  referenceScenarios: Scenario[];
  block: Block;
  private toastDataSubject = new BehaviorSubject<any>(null);
  toastData$ = this.toastDataSubject.asObservable();

  updateToastData(data: any) {
    this.toastDataSubject.next(data);
  }
  /**
  * Emits the add block to scenario event
  * @param block
  * @param correspondingComponent
  */
  addBlockToScenario(block: Block, correspondingComponent: string, addBlockToStepType: string, addAsSingleSteps: boolean) {
    this.addBlockToScenarioEvent.emit([correspondingComponent, block, addBlockToStepType, addAsSingleSteps]);
  }
  /**
  * Emits the update block in blocks
  */
  updateBlocksEmitter() {
    this.updateBlocksEvent.emit();
  }

  /**
  * Emits the convertation steps in reference block
  */
  convertToReferenceEmitter(block) {
    this.convertToReferenceEvent.emit(block);
  }

  /**
  * Emits the delete block in blocks
  */
  public deleteBlockEmitter() {
    this.deleteBlockEvent.emit();
  }
  /**
  * Emits the references in scenarios
  */
  public updateScenariosRefEmitt(scenario, storyId) {
    this.updateScenariosRefEvent.emit([scenario, storyId]);
  }
  /**
* Emits the unpack block event
* @param block
*/
  public unpackBlockEmitter(block) {
    this.unpackBlockEvent.emit(block);
  }
  /**
  * Emits the update a reference block name event
  * @param block
  */
  public updateNameRefEmitter(block) {
    this.updateNameRefEvent.emit(block);
  }
  /**
  * Emits the checking stories for references event 
  * @param blockReferenceId
  */
  public checkRefOnRemoveEmitter(blockReferenceId) {
    this.checkRefOnRemoveEvent.emit(blockReferenceId);
  }
  /**
  * Emits the delete block as reference 
  * @param block
  */
  public deleteReferenceEmitter(block: Block) {
    this.deleteReferenceEvent.emit(block);
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
    return this.http.delete<any>(str, ApiService.getOptions())
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
      .post<any>(this.apiService.apiServer + '/block', block, ApiService.getOptions())
      .pipe(tap(_ => {
        //
      }));
  }
  /**
   * Delete central background-block
   * @param block
   * @param stories
   */
  checkBackgroundsOnDelete(block, stories) {
    let matchingStories = stories.filter((s) => s !== null && s.background.name === block.name);
    if (matchingStories.length == 1) {
      this.deleteBlock(block._id).subscribe(_ =>
        this.updateBlocksEvent.emit()
      )
    }
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
      .filter((story, index, arr) => story && arr.indexOf(story) === index);
  }
  /**
  * delete a reference and update Block
  */
  deleteUpdateReferenceForBlock() {
    if (this.referencesBlocks.length !== 0) {
      for (const block of this.referencesBlocks) {
        if (block.usedAsReference === false) {
          delete block.usedAsReference;
          this.updateBlock(block)
            .subscribe(_ => {
              this.updateBlocksEvent.emit();
            });
        }
      }
      this.referencesBlocks = [];
    }
    else return 0;
  }

  /**
    * Сhecking whether the block is used as a reference
    * @param blockReferenceId
    * @param blocks
    * @param stories
  */
  checkBlockOnReference(blocks: Block[], stories: Story[], block: Block) {
    if (!this.findRefBlockInScenarios(block, stories, 'checkOnReference')) {
      this.updateBlockReferenceStatus(block._id, blocks);
    }
  }
  /**
    * update block reference status
    * @param blockReferenceId
    * @param blocks
  */
  updateBlockReferenceStatus(blockReferenceId: string, blocks): void {
    for (const block of blocks) {
      if (block._id === blockReferenceId) {
        block.usedAsReference = false;
        this.referencesBlocks.push(block);
      }
    }
  }
  /**
  * Check reference and unpack block in all relevant stories
  * @param block
  * @param stories
  */
  deleteBlockReference(block, stories: Story[]) {
    this.findRefBlockInScenarios(block, stories, "deleteBlockReference")
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
      this.referenceStories.forEach((story) => {
        this.scenariosToUpdate.forEach((scenario) => {
          if (story.scenarios.includes(scenario)) {
            this.storyService.updateStory(story).subscribe(_resp => { });
          }
        });
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

    if (stepReference) {
      this.unpackStepsFromBlock(block, scenario, stepReference);
    }else {
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
      for (const s in block.stepDefinitions) {
      
        block.stepDefinitions[s].forEach((step: StepType) => {
          step.checked = false;
          scenario.stepDefinitions[s].push(JSON.parse(JSON.stringify(step)));
        });
        
        console.log(s, block, stepReference);
        // Remove the block reference among the steps
        this.removeBlocksAmongSteps(scenario.stepDefinitions[s], block, stepReference);

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

    for (const type in scenario.stepDefinitions) {
      scenario.stepDefinitions[type].forEach((step) => {
        if (step._blockReferenceId === block._id) {
          arrayRefBlocks.push(step);
        }
      });
    }
    return arrayRefBlocks;
  }

  /**
   * Remove blocks among steps based on a block reference or step reference.
   * @param stepToSplice
   * @param block
   * @param stepReference
   */
  removeBlocksAmongSteps(stepToSplice, block, stepReference? : StepType) {
    
    const index = stepReference !== undefined
      ? stepToSplice?.findIndex((element) => element.stepType === stepReference.stepType && element.id === stepReference.id )
      : stepToSplice?.findIndex((element) => element._blockReferenceId === block._id);

    if (index > -1) {
      stepToSplice.splice(index, 1);
    }
  }

  /**
   * Update the reference name in scenarios after changing the block name
   * @param block
   * @param stories
   */
  updateNameReference(block: Block, stories: Story[]) {
    if (this.findRefBlockInScenarios(block, stories, 'updateRefName')) {
      this.updateReferenceStories();
    } else {
      console.error('Reference block not found');
    }
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
      for (const s in scenario.stepDefinitions) {
        scenario.stepDefinitions[s].forEach((refStep) => {
          if (refStep._blockReferenceId == block._id) {
            switch (event) {
              case 'updateRefName':
                refStep.type = block.name;
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
          }
        });
      }
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
    let indexToPush;
    let pushStepDef;
    for (const step in scenario.stepDefinitions) {
      scenario.stepDefinitions[step].forEach((stepInScenario, index) => {
        for (const stepBlock in block.stepDefinitions) {
          block.stepDefinitions[stepBlock].forEach((stepInBlock) => {
            if (stepInScenario.stepType == stepInBlock.stepType && stepInScenario.id === stepInBlock.id) {
              indexToPush = indexToPush === undefined ? index : indexToPush;
              pushStepDef = pushStepDef === undefined ? stepInScenario.stepType : pushStepDef;
            }
          })
        }
      })
    }
    return { indexToPush, pushStepDef };
  }

 /** 
   * remove the steps from the scenario that need to be merged into a reference block
   * @param block
   * @param scenario
   */
  removeMatchingSteps(block: Block, scenario: Scenario): void {
    for (const step in scenario.stepDefinitions) {
      for (let index = scenario.stepDefinitions[step].length - 1; index >= 0; index--) {
        const stepInScenario = scenario.stepDefinitions[step][index];
        for (const stepBlock in block.stepDefinitions) {
          block.stepDefinitions[stepBlock].forEach((stepInBlock) => {
            if (stepInScenario.stepType === stepInBlock.stepType && stepInScenario.id === stepInBlock.id) {
              scenario.stepDefinitions[step].splice(index, 1);
            }
          });
        }
      }
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
        type: block.name,
        stepType: pushStepDef,
        pre: '',
        mid: '',
        post: '',
        values: [],
      };

      scenario.stepDefinitions[pushStepDef].splice(indexToPush, 0, JSON.parse(JSON.stringify(blockReference)));
      scenario.saved = false;
    }
  }

  //CURRENTLY NOT ACTIVATED 
  convertStepsInAllStories(block: Block, stories: Story[]){
    let foundScenarios = [];
    let foundStories = [];
    let blockStepsToCompare = block.stepDefinitions.when;

    stories.forEach((story) => story !== null && story.scenarios.forEach((scenario) => {
      for (let i = scenario.stepDefinitions.when.length - 1; i >= 0; i--) {
        const value = scenario.stepDefinitions.when[i];
        if (blockStepsToCompare.some((blockStep) =>
          blockStep.pre === value.pre &&
          blockStep.mid === value.mid &&
          JSON.stringify(blockStep.values) === JSON.stringify(value.values))
        ) {
          scenario.stepDefinitions.when.splice(i, 1);
          foundScenarios.push(scenario);
          foundStories.push(story);
        }
      }
    }));
    const uniqueSetScenarios = new Set(foundScenarios);
    const uniqueSetStories = new Set(foundStories);
    foundScenarios = Array.from(uniqueSetScenarios);
    foundStories = Array.from(uniqueSetStories);
    foundStories.forEach((story)=> story.scenarios.forEach((scenario) =>{
      foundScenarios.forEach((scen)=>{
        if(scenario == scen){
          const blockReference: StepType = {_blockReferenceId: block._id, id: 0, type: block.name, stepType: 'when',
            pre: '', mid: '', post: '', values: []};
          scenario.stepDefinitions.when.push(JSON.parse(JSON.stringify(blockReference)));
          this.updateScenariosRefEmitt(scen,  story._id);
        };
      });
    })
    );
  }
}
