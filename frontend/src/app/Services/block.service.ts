import { EventEmitter, Injectable } from '@angular/core';
import { Block } from '../model/Block';
import { Observable } from 'rxjs';
import { ApiService } from '../Services/api.service';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { catchError, tap } from 'rxjs/operators';
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
  * Emits the delete block in blocks
  */
  public deleteBlockEmitter() {
    this.deleteBlockEvent.emit();
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
    stories.filter((s) => s !== null).flatMap((story) => story.scenarios
      .filter((scenario) => scenario.hasRefBlock))
      .forEach((scenario) => this.referenceScenarios.push(scenario));
    this.referenceStories = this.referenceScenarios
      .map((scenario) => stories.find((story) => story !== null && story.scenarios.includes(scenario)))
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
   * Unpack steps from block. Wenn delete block unpack all reference in repository
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
        //remove the block reference among the steps 
        const index = scenario.stepDefinitions[s].findIndex((element) => element._blockReferenceId == block._id);
        if (index > -1) {
          scenario.stepDefinitions[s].splice(index, 1);
        }
      }
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
      console.error('No found');
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
}
