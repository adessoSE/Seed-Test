import { EventEmitter, Injectable } from '@angular/core';
import { Block } from '../model/Block';
import { Observable } from 'rxjs';
import { ApiService } from '../Services/api.service';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import {catchError, tap} from 'rxjs/operators';
import { Story } from '../model/Story';
import { StepType } from '../model/StepType';
import { StoryService } from './story.service';
import { Scenario } from '../model/Scenario';

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
   * Event emitter to update scenarios with reference
   */
  public updateScenariosRefEvent = new EventEmitter();

  blocks: Block[] = [];
  referenceStories: Story[];
  referenceScenarios: Scenario[];
  block: Block;

  /**
  * Emits the add block to scenario event
  * @param block
  * @param correspondingComponent
  */
  addBlockToScenario(block: Block, correspondingComponent: string, addAsReference: boolean) {
    this.addBlockToScenarioEvent.emit([correspondingComponent, block, addAsReference]);
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
    return this.http.get<Block[]>(str,  ApiService.getOptions())
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
  updateBlock(block: Block):Observable<Block>{
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
  checkBackgroundsOnDelete(block, stories){
    let matchingStories = stories.filter((s) => s !== null && s.background.name === block.name);
    if(matchingStories.length == 1){
      this.deleteBlock(block._id).subscribe(_=>
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
      .put<Block>(this.apiService.apiServer + '/mongo/block', block, ApiService.getOptions())
      .pipe(tap(),
        catchError(this.apiService.handleError)
      );
  }
   /**
   * Search for a references in all stories
   * @param stories
   */
  searchReferences(stories: Story[]){
    this.referenceScenarios = [];
    stories.filter((s) => s !== null).flatMap((story) => story.scenarios
      .filter((scenario) => scenario.hasRefBlock))
      .forEach((scenario) => this.referenceScenarios.push(scenario));
    this.referenceStories = this.referenceScenarios
    .map((scenario) => stories.find((story) => story.scenarios.includes(scenario)))
    .filter((story, index, arr) => story && arr.indexOf(story) === index); 
  }
   /**
   * Add/Delete for reference steps in scenario. 
   */
  stepAsReference() {  
    if(this.blocks.length !== 0){
      for (const block of this.blocks) {
        if (block.usedAsReference === false) {
          delete block.usedAsReference;
          this.updateBlock(block)
          .subscribe(_ => {
            this.updateBlocksEvent.emit();
          });
        }
      }
      this.blocks = [];
    }
    else return 0;
  }

   /**
     * Remove the reference property for the steps
     * @param blockReferenceId
     * @param blocks
     * @param stories
     */
  removeReferenceForStep(blocks:Block[], stories: Story[], blockReferenceId){
    this.searchReferences(stories);
    let blockNoLongerRef = true;
    for (const scen of this.referenceScenarios){
      for (const prop in scen.stepDefinitions) {
        for (let i = scen.stepDefinitions[prop].length - 1; i >= 0; i--) {
          if (scen.stepDefinitions[prop][i]._blockReferenceId == blockReferenceId) {
            blockNoLongerRef = false;
          }
        }
      }
    }
    if (blockNoLongerRef){
      for (const block of blocks){
        if(block._id === blockReferenceId){
          block.usedAsReference = false;
          this.blocks.push(block);
        }
      }
    }
  }
   /**
   * Check reference and delete in all repository
   * @param block
   * @param stories
   */
   deteleBlockReference(block, stories: Story[]) {
    this.searchReferences(stories);
    this.referenceScenarios.forEach((scenario) => {
      this.unpackScenarioWithBlock(block, scenario);
    });
    this.referenceStories.forEach((story) => {
      this.storyService.updateStory(story).subscribe(_resp => {}); 
    });
  }

  /**
   * Unpack references. Wenn delete block unpack all reference in repository
   * @param block
   * @param scenario
   */
  unpackScenarioWithBlock(block, scenario) {
    delete block.usedAsReference; 
    if (block && block.stepDefinitions) {
      for (const s in block.stepDefinitions) {
        block.stepDefinitions[s].forEach((step: StepType, j) => {
          step.checked = false;
          scenario.stepDefinitions[s].push(JSON.parse(JSON.stringify(step)));
        });
        const index = scenario.stepDefinitions[s].findIndex((element) => element._blockReferenceId == block._id);
        if (index > -1) {
          scenario.stepDefinitions[s].splice(index, 1);
        }
      }
    }
  }
 
  /** 
   * convert Steps To Reference
   * @param block
   * @param scenario
   */
  convertStepsToRef(block: Block, scenario: Scenario, storyId){
    let blockStepsToCompare = block.stepDefinitions.when;
    let indexToPush; 
    for (let i = scenario.stepDefinitions.when.length - 1; i >= 0; i--) {
      const value = scenario.stepDefinitions.when[i];
      const foundIndex = blockStepsToCompare.findIndex((blockStep) => 
        blockStep.pre === value.pre && 
        blockStep.mid === value.mid && 
        JSON.stringify(blockStep.values) === JSON.stringify(value.values)
      );
      if (foundIndex !== -1) {
        indexToPush = i;
        scenario.stepDefinitions.when.splice(i, 1);
      }
    }
    const blockReference: StepType = {_blockReferenceId: block._id, id: 0, type: block.name, stepType: 'when',
    pre: '', mid: '', post: '', values: []};
    if (indexToPush < 0 || indexToPush > scenario.stepDefinitions.when.length) {
      throw new Error("Invalid indexToPush");
    }else{
      scenario.stepDefinitions.when.splice(indexToPush, 0, JSON.parse(JSON.stringify(blockReference)));
    } 
    scenario.saved = false;
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
