import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import {NgbModal, NgbModalRef} from '@ng-bootstrap/ng-bootstrap';
import { Block } from 'src/app/model/Block';
import { StepType } from 'src/app/model/StepType';
import { BlockService } from 'src/app/Services/block.service';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { DeleteBlockToast } from 'src/app/deteleBlock-toast';

@Component({
  selector: 'app-add-block-form',
  templateUrl: './add-block-form.component.html',
  styleUrls: ['./add-block-form.component.css', '../layout-modal/layout-modal.component.css']
})
export class AddBlockFormComponent implements OnInit,OnDestroy {

  @ViewChild('addBlockFormModal') addBlockFormModal: any;
  @ViewChild('newTitle') newTitleLabel: HTMLElement;
  @ViewChild('saveBlockButton') saveBlockButton: HTMLElement;

    /**
     * Saved blocks
     */
    blocks: Block[];
    /**
     * New block name when renaming
     */
    newblockName: string;

     /**
     * Old block name
     */
    oldName:string;

    /**
      * If blocks are saved 
      */
    blockSaved=true;

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

    modalReference: NgbModalRef;
    deleteBlockObservable: Subscription;
   
    constructor(private modalService: NgbModal, public blockService: BlockService, public toastr: ToastrService) {}
     
    ngOnInit() {
       const id = localStorage.getItem('id');
      this.blockService.getBlocks(id).subscribe((resp) => {
        this.blocks = resp;
      });
      this.deleteBlockObservable = this.blockService.deleteBlockEvent.subscribe(_ => {
        this.blockDeleted(this.selectedBlock);
        });
    }
    
    ngOnDestroy() {
      if (!this.deleteBlockObservable.closed) {
        this.deleteBlockObservable.unsubscribe();
      }
    }

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
      this.blockService.getBlocks(repoId).subscribe((resp) => {
          this.blocks = resp;
      });
    }
    
    /**
     * Deletes a block(call a toaster)
     */
    deleteBlock() {
      this.toastr.warning('', 'Do you really want to delete this block? It cannot be restored.', {
				toastComponent: DeleteBlockToast
		  });
    }  

    /**
     * Delete block from blocks
     * @param block selected block
     */
    blockDeleted(block:Block){
       if (this.blocks.find(x => x === this.selectedBlock)){
        this.blockService
        .deleteBlock(block._id)
        .subscribe((resp) => {
          this.blocks.splice(this.blocks.findIndex(x => x === this.selectedBlock), 1);
          this.stepList = [];
          this.selectedBlock = null;
          console.log(resp);
          this.toastr.error('', 'Story deleted');
        }); 
      }
    }

    /**
     * Change block title
     */
    changeBlockTitle() {
      this.newTitleLabel=document.getElementById("newTitle");
      this.newTitleLabel.setAttribute('contentEditable', 'true');
      this.newTitleLabel.style.border='1px inset';
      this.newblockName=null;
      this.blockSaved=false;
      this.newTitleLabel.focus();
    }

    /**
     * Check if a new block name is valid
     */   
    checkName(){
      this.saveBlockButton = document.getElementById("saveBlockButton");
      this.newblockName= this.newTitleLabel.textContent.replace(/\s/g, '');
      if(this.newblockName.trim().length===0){
        this.saveBlockButton.setAttribute('disabled', 'true');
        this.toastr.warning('', 'The field can not be empty. Enter the name.', {});
      }
      else if(( this.newblockName && !this.blocks.find(i => i.name ===  this.newblockName)) || (this.selectedBlock ? this.blocks.find(g => g._id === this.selectedBlock._id && g.name ===  this.newblockName) : false)) {
        this.saveBlockButton.removeAttribute('disabled');
      }
      else  {
        this.saveBlockButton.setAttribute('disabled', 'true');
        this.toastr.warning('', 'This name exists already. Enter unique name.', {});
      }
    }
    /**
     * Changes block selection and updates the shown step list
     * @param event
     */
    changeBlockSelection() {
      this.selectedBlock = this.selectedBlockList[0];
      this.selectedBlockList = [];
      this.stepList = [];
      Object.keys(this.selectedBlock.stepDefinitions).forEach((key, index) => {
          this.selectedBlock.stepDefinitions[key].forEach((step: StepType) => {
              this.stepList.push(step);
          });
      });
      //to avoid an error if the user select another block when the changes haven't been saved
      if(this.blockSaved==false){     
        this.newTitleLabel.setAttribute('contentEditable', 'false');
        this.newTitleLabel.style.border='none';
        this.blockSaved=true;
      }
      //to avoid an error if the user selects another block when new name is undefined
      if(this.newTitleLabel!==undefined)
      {
        if(this.newTitleLabel.textContent.replace(/\s/g, '').trim().length===0)
        this.newTitleLabel.textContent=this.selectedBlock.name;
      }
    }

    /**
     * Copies a block from the clipboard to the scenario
     */
    copiedBlock() {
      if (this.clipboardBlock) {
          this.blockService.addBlockToScenario(this.clipboardBlock, this.correspondingComponent);
      }
    }

    /**
     * Adds a block to saved blocks
     */
    addBlockFormSubmit() {
      this.blockService.addBlockToScenario(this.selectedBlock, this.correspondingComponent);
      this.modalReference.close();
    }
    
    /**
     * Update block when title is changed
     */
    updateBlock(){
      if(this.newblockName==undefined){//if user has not entered anything, name saves without changes
        this.newblockName=this.selectedBlock.name;
      } else{
        this.oldName=this.selectedBlock.name;
        this.selectedBlock.name=this.newblockName;        
        this.blockService
        .updateBlock(this.oldName, this.selectedBlock)
        .subscribe((resp) => {
          this.updateBlocksEventEmitter();
          this.toastr.success('successfully saved', 'Block');
        });
      }
     this.newTitleLabel.setAttribute('contentEditable', 'false');
     this.newTitleLabel.style.border='none';
     this.blockSaved=true;
    }

    updateBlocksEventEmitter() {
      this.blockService.updateBlocksEvent.emit();
    }

    enterSubmit(event) {
      this.addBlockFormSubmit();
    }

    onClickSubmit() {
      this.addBlockFormSubmit();
    }
  }
