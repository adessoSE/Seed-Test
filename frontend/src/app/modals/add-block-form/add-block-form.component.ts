import { Component, ViewChild } from '@angular/core';
import {NgbModal, NgbModalRef} from '@ng-bootstrap/ng-bootstrap';
import { Block } from 'src/app/model/Block';
import { ApiService } from 'src/app/Services/api.service';
import { StepType } from 'src/app/model/StepType';

@Component({
  selector: 'app-add-block-form',
  templateUrl: './add-block-form.component.html',
  styleUrls: ['./add-block-form.component.css', '../layout-modal/layout-modal.component.css']
})
export class AddBlockFormComponent {

  @ViewChild('addBlockFormModal') addBlockFormModal: any;

  /**
    /**
     * Saved blocks
     */
     blocks: Block[];

     /**
      * Steps of the current block
      */
     stepList: any;

     /**
      * Current selected block list
      */
     selectedBlockList: Block[];

     /**
      * Currently selected block
      */
     selectedBlock: Block;

     /**
      * Columns of the select block table
      */
     displayedColumns: string[] = ['stepType', 'pre'];

     /**
      * Background or Scenario, depending from where the block was saved
      */
     correspondingComponent: string;

     /**
      * Block which is saved to the clipboard
      */
     clipboardBlock: Block;

    /**
     * Boolean, wether Block should be added as reference
     */
     addAsReference: boolean;

     modalReference: NgbModalRef;


  constructor(private modalService: NgbModal, public apiService: ApiService) {}

    /**
     * Opens the add block form modal
     * @param correspondingComponent is either background or scenario
     * @param repoId id of the current repository / project
     */
    openAddBlockFormModal(correspondingComponent: string, repoId: string) {
      this.getAllBlocks(repoId);
      this.correspondingComponent = correspondingComponent;
      this.modalReference = this.modalService.open(this.addBlockFormModal, {ariaLabelledBy: 'modal-basic-title',  modalDialogClass: 'addBlock'});
      if (this.correspondingComponent == 'background') {
        this.clipboardBlock = JSON.parse(sessionStorage.getItem('backgroundBlock'));
      } else if (this.correspondingComponent == 'scenario') {
        this.clipboardBlock = JSON.parse(sessionStorage.getItem('scenarioBlock'));
      }

      
    }

  /**
   * Get all blocks from the backend
   * @param repoId id of the repository / project
   */
    getAllBlocks(repoId: string) {
      this.apiService.getBlocks(repoId).subscribe((resp) => {
          this.blocks = resp;
      });
    }

  /**
   * Changes block selection and updates the shown step list
   * @param event
   */
    changeBlockSelection(event) {
      this.selectedBlock = this.selectedBlockList[0];
      this.selectedBlockList = [];

      this.stepList = [];
      Object.keys(this.selectedBlock.stepDefinitions).forEach((key, index) => {
          this.selectedBlock.stepDefinitions[key].forEach((step: StepType) => {
              this.stepList.push(step);
          });
      });
    }

  /**
   * Copies a block from the clipboard to the scenario
   */
    copiedBlock() {
      if (this.clipboardBlock) {
          this.apiService.addBlockToScenario(this.clipboardBlock, this.correspondingComponent, false);
      }
    }

  /**
   * Adds a block to saved blocks
   */
    addBlockFormSubmit() {
      this.apiService.addBlockToScenario(this.selectedBlock, this.correspondingComponent, this.addAsReference);
      this.modalReference.close();
    }

  /**
   * Deletes a block from the saved blocks
   * @param event click event
   * @param rowIndex index of the deleted block
   * @param block block to be deleted
   */
    deleteBlock(event, rowIndex: number, block: Block) {
      event.stopPropagation();
      this.apiService.deleteBlock(block._id).subscribe(resp => {
          this.blocks.splice(rowIndex, 1);
          this.stepList = [];
          this.selectedBlock = null;
          this.updateBlocksEventEmitter();
      });
    }

    updateBlocksEventEmitter() {
      this.apiService.updateBlocksEvent.emit();
    }

    checkAddAsReference() {
      this.addAsReference = (!this.addAsReference);
    }

    enterSubmit(event) {
      this.addBlockFormSubmit();
    }

    onClickSubmit() {
      this.addBlockFormSubmit();
    }
}
