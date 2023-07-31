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
  * Event emitter to delete reference
   */
   public deleteReferenceEvent: EventEmitter<any> = new EventEmitter();
    /**
  * Event emitter to check for reference
   */
    public checkRefOnRemoveEvent: EventEmitter<any> = new EventEmitter();
  /**
  * Event emitter to track blocks updates
   */
  public updateBlocksBackgroundsEvent: EventEmitter<any> = new EventEmitter();
  /**
  * Delete emitter to add delete a block from blocks
   */
  public deleteBlockEvent = new EventEmitter();

  blocks: Block[];
  referenceStories: Story[];
  referenceScenarios;
  block: Block;

  /**
     * Event emitter to unpack Block
     */
  public unpackBlockEvent = new EventEmitter();
 

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
  * Emits the update block in background list
   */
  updateBlocksBackgroundsEmitter() {
    this.updateBlocksBackgroundsEvent.emit();
  }
  
  /**
  * Emits the delete block in blocks
  */
  public deleteBlockEmitter() {
    this.deleteBlockEvent.emit();
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
  updateBlock(oldTitle: string, block: Block):Observable<Block>{
    return this.http
    .put<Block>(this.apiService.apiServer + '/block/' + oldTitle, block, ApiService.getOptions())
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
   * @param blockId
   */
  searchReferences(stories: Story[], blockId){
    this.referenceScenarios = [];
    stories.flatMap((story) => story.scenarios.filter((scenario) =>{
      for (const prop in scenario.stepDefinitions) {
        for (const step of scenario.stepDefinitions[prop]) {
          if (step.isReferenceBlock === true && step._id === blockId) {
            this.referenceScenarios.push(scenario);
          }
        }
      }
    }));
    this.referenceStories = this.referenceScenarios
    .map((scenario) => stories.find((story) => story.scenarios.includes(scenario)))
    .filter((story, index, arr) => story && arr.indexOf(story) === index); 
  }
   /**
   * Add/Delete for reference steps in scenario   
   */
  stepAsReference() {  
    if(this.blocks){
      for (const block of this.blocks) {
        if (block.usedAsReference === false) {
          delete block.usedAsReference;
          this.updateBlock(block.name, block)
          .subscribe(_ => {
            this.updateBlocksEvent.emit();
          });
        }
      }
    }
    else return 0;
  }

   /**
     * Remove the reference property for the block
     * @param blockId
     * @param blocks
     * @param stories
     * @returns
     */
  removeReferenceForStep(blocks:Block[], stories: Story[], blockId){
    this.searchReferences(stories, blockId)
    if(this.referenceScenarios.length == 0){
      for (const block of blocks) {
        if (block._id === blockId) {
          block.usedAsReference = false;
        }
      }
      this.blocks = blocks;
    }
  }
   /**
   * Check reference and delete in all repository
   * @param block
   * @param stories
   */
   deteleBlockReference(block, stories: Story[]) {
    this.searchReferences(stories, block._id);
    this.referenceScenarios.forEach((scenario) => {
      this.unpackScenarioWithBlock(block, scenario);
    });
    this.referenceStories.forEach((story) => {
      this.storyService.updateStory(story).subscribe(_resp => {}); 
    });
  }

  /**
   * Unpack all reference in repository
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
        const index = scenario.stepDefinitions[s].findIndex((element) => element._id == block._id);
        if (index > -1) {
          scenario.stepDefinitions[s].splice(index, 1);
        }
      }
    }
  }
  /**
     * Emits the unpack block event
     */
  public unpackBlockEmitter(block) {
    this.unpackBlockEvent.emit(block);
  }
   /**
     * Emits the checking stories for references event 
     */
   public checkRefOnRemoveEmitter(blockId) {
    this.checkRefOnRemoveEvent.emit(blockId);
  }
  /**
     * Emits the delete block as reference 
     */
  public deleteReferenceEmitter(block: Block) {
    this.deleteReferenceEvent.emit(block);
  }
}
