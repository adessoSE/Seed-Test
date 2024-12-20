import { Component, OnInit, ViewChild, OnDestroy, Input } from '@angular/core';
import {NgbModal, NgbModalRef} from '@ng-bootstrap/ng-bootstrap';
import { Block } from 'src/app/model/Block';
import { StepType } from 'src/app/model/StepType';
import { BlockService } from 'src/app/Services/block.service';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { DeleteToast } from 'src/app/delete-toast';
import { ApiService } from 'src/app/Services/api.service';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'app-add-block-form',
  templateUrl: './add-block-form.component.html',
  styleUrls: ['./add-block-form.component.css', '../layout-modal/layout-modal.component.css']
})
export class AddBlockFormComponent implements OnInit,OnDestroy {

  @ViewChild('addBlockFormModal') addBlockFormModal: any;
 
  currentStepType = new FormControl('When');
    /**
     * Saved blocks
     */
    blocks: Block[];
    /**
     * New block name when renaming
     */
    newBlockName: string;

     /**
     * Old block name
     */
    oldName:string;
    selectedTemplate: string;
    /**
      * Sets a new selected story
      */
    @Input()
    set templateName(name) {
      this.selectedTemplate = name;
    }
    /**
      * If blocks are saved 
      */
    blockSaved: boolean;
    /**
      * If save button is disable
      */
    saveBlockButtonDisable: boolean;

    /**
      * Steps of the current block
      */
    stepList: any;

    /**
      * Current selected block list
      */
    selectedBlockList: Block[];

    /**
      *The type of step to which to add the block
      */
    addBlockToStepType: string[] = ['Given', 'When', 'Then'];
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
     * Boolean, wether Block should be added as a single steps
     */
    addAsSingleSteps: boolean;

    modalReference: NgbModalRef;
    deleteBlockObservable: Subscription;
   
    constructor(private modalService: NgbModal, 
      public blockService: BlockService, 
      public toastr: ToastrService,
      public apiService: ApiService) {}
     
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
      if (this.selectedTemplate === 'background'){
        this.checkaddAsSingleSteps(); 
      }
      this.blockSaved = true;
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

    getFilteredListBlocks() {
      return this.blocks.filter((b)=> b.isBackground == undefined)
    }
    /**
     * Deletes a block(call a toastr)
     */
    deleteBlock() {
      this.apiService.nameOfComponent('block');
      let warningMessage = '';
      let warningQuestion = '';
      if(this.selectedBlock.usedAsReference){
        warningMessage = "This block has a references and you're going to delete them. It cannot be restored."
        warningQuestion = 'Delete this block and all its references?'
      }
      else {
        warningMessage = 'Are you sure you want to delete this block? It cannot be restored.';
        warningQuestion = 'Delete Block?';
      }
      this.toastr.warning(warningMessage, warningQuestion, {
				toastComponent: DeleteToast
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
          if(block.usedAsReference){
            this.blockService.deleteReferenceEmitter(block);
          }
          this.blocks.splice(this.blocks.findIndex(x => x === this.selectedBlock), 1);
          this.stepList = [];
          this.selectedBlock = null;
          this.updateBlocksEventEmitter();
          this.toastr.error('', 'Block deleted');
        }); 
      }
    }
    /**
     * Change block title
     */
    changeBlockTitle() {
      this.blockSaved = !this.blockSaved;
    }
    /**
     * Check if a new block name is valid
     */   
    checkName(inputValue){
      this.newBlockName = inputValue;
      const isNameValid = this.newBlockName.trim().length > 0;
      const isNameUnique = !this.blocks.some(i => i.name === this.newBlockName) || (this.selectedBlock && this.blocks.some(g => g._id === this.selectedBlock._id && g.name === this.newBlockName));
      
      this.saveBlockButtonDisable = !(isNameValid && isNameUnique);
      
      if (!isNameValid) {
        this.toastr.warning('', 'The field cannot be empty. Enter a name.', {});
      } else if (!isNameUnique) {
        this.toastr.warning('', 'This name already exists. Enter a unique name.', {});
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
      if(!this.blockSaved){     
        this.blockSaved = !this.blockSaved;
        delete this.saveBlockButtonDisable;
        delete this.newBlockName;
      }
    }

    /**
     * Copies a block from the clipboard to the scenario
     */
    copiedBlock() {
      if (this.clipboardBlock) {
        this.blockService.addBlockToScenario(this.clipboardBlock, this.correspondingComponent, null, false);
      }
    }

    /**
     * Add a block to a scenario
     */
    addBlockFormSubmit() {
      this.blockService.addBlockToScenario(this.selectedBlock, this.correspondingComponent, this.currentStepType.value, this.addAsSingleSteps);
      delete this.addAsSingleSteps;
      delete this.selectedBlock;
      this.stepList = [];
      this.currentStepType = new FormControl('When');
      this.modalReference.close();
    }
    
    /**
     * Update block when title is changed
     */
    updateBlock(){
      if(!this.saveBlockButtonDisable){
        if(this.newBlockName == undefined){//if user has not entered anything, name saves without changes
          this.newBlockName = this.selectedBlock.name;
        } else{
          this.selectedBlock.name = this.newBlockName.trim();    
          this.blockService
          .updateBlock(this.selectedBlock)
          .subscribe(_ => {
            if(this.selectedBlock.usedAsReference){
              this.blockService.updateNameRefEmitter(this.selectedBlock);
            }
            this.updateBlocksEventEmitter();
            this.toastr.success('successfully saved', 'Block');
          });
        }
       this.blockSaved = true;
       delete this.newBlockName;
      }
 
    }

    updateBlocksEventEmitter() {
      this.blockService.updateBlocksEvent.emit();
    }

    checkaddAsSingleSteps() {
      this.addAsSingleSteps = (!this.addAsSingleSteps);
    }

    enterSubmit(event) {
      this.addBlockFormSubmit();
    }

    onClickSubmit() {
      this.addBlockFormSubmit();
    }
    closeModal(){
      delete this.addAsSingleSteps;
      delete this.selectedBlock;
      this.currentStepType = new FormControl('When');
      this.stepList = [];
      this.modalReference.close();
    }
  }
