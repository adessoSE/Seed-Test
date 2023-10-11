import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import { Block } from 'src/app/model/Block';
import { StepType } from 'src/app/model/StepType';
import { BlockService } from 'src/app/Services/block.service';
import { BackgroundService } from '../../Services/background.service';

@Component({
  selector: 'app-save-block-form',
  templateUrl: './save-block-form.component.html',
  styleUrls: ['./save-block-form.component.css']
})
export class SaveBlockFormComponent implements OnInit, OnDestroy {

  @ViewChild('saveBlockFormModal') saveBlockFormModal: SaveBlockFormComponent;

  /**
     * Block to be saved
     */
  block: Block;

   /**
    * Columns of the save block table
    */
  displayedColumnsSaveBlock: string[] = ['stepType', 'pre'];
  /**
    * Columns of the second save block table
    */
  displayedColumnsSaveBlockExample: string[];

   /**
    * List with the steps to be saved to the block
    */
  stepListSaveBlock = [];
  /**
    * List with the multiple scenarios to be saved to the block
    */
  stepListSaveBlockExample = [];

   /**
    * If the block is an example
    */
  exampleBlock = false;

   /**
    * If an example is checked
    */
  exampleChecked = false;

   /**
    * All Steps
    */
  stepListComplete = [];

   /**
    * Parent component
    */
  parentComponent;

  modalReference: NgbModalRef;

  blocks: Block[];

  updateObservable: Subscription;

  isBackground: boolean;
  backgroundName: string;


  constructor(private modalService: NgbModal, private toastr: ToastrService, public blockService: BlockService, public backgroundService: BackgroundService) {}

  ngOnInit() {
    const id = localStorage.getItem('id');
    this.blockService.getBlocks(id).subscribe((resp) => {
      this.blocks = resp;
    });
    this.updateObservable = this.blockService.updateBlocksEvent.subscribe(_ => {
      this.blockService.getBlocks(id).subscribe((resp) => {
        this.blocks = resp;
      });
    });
  }

  ngOnDestroy() {
    if (!this.updateObservable.closed) {
      this.updateObservable.unsubscribe();
    }
  }

  /**
     * Opens save block form modal
     * @param block
     * @param comp
     */
  openSaveBlockFormModal(block: Block, comp, isBackground?: boolean, backgroundName?) {
    this.exampleBlock = false;
    this.exampleChecked = false;
    this.block = block;
    this.parentComponent = comp;
    this.backgroundName = backgroundName;
    this.isBackground = isBackground;
    if (block.stepDefinitions.example && block.stepDefinitions.example.length > 0) {
      this.exampleBlock = true;
    }
    this.createStepList();
    this.modalReference = this.modalService.open(this.saveBlockFormModal, {ariaLabelledBy: 'modal-basic-title'});
    if(isBackground && isBackground !== undefined){
      document.getElementById('modalHeader').innerHTML = 'Save Background';
      document.getElementById('infoSpan').innerHTML = 'You have replaced the current story background. To save this background in your project, click Submit. If you don`t want to use it anymore and want to delete the current background, click Discard Background.';
      document.getElementById('multipleScenarioDiv').style.display = 'none';
    }
  }

/**
 * Creates a new step list
 */
  createStepList() {
    this.stepListSaveBlock = [];
    this.stepListSaveBlockExample = [];
    this.displayedColumnsSaveBlockExample = [];
    let toastrShown = false;
    Object.keys(this.block.stepDefinitions).forEach((key, _) => {
        this.block.stepDefinitions[key].forEach((step: StepType) => {
          if(step.stepType != 'example'){
            if(step._blockReferenceId && !toastrShown){
              this.toastr.info("Please Note: To avoid complexity issues embedded blocks aren't allowed to be saved in another blocks ","You've selected at least one reference block to save in another block.", {
                timeOut: 8000,
                extendedTimeOut: 3000
              });
              toastrShown = true;
            }else if(!step._blockReferenceId){
              this.stepListSaveBlock.push(step);
            }
          } else {
            this.stepListSaveBlockExample.push(step);
          }
          
        });
    });
    if(this.stepListSaveBlockExample.length > 0) {
      const valueLength = this.stepListSaveBlockExample[0].values.length
      this.displayedColumnsSaveBlockExample.push('stepType')
      for (let index = 0; index < valueLength; index++) {
        this.displayedColumnsSaveBlockExample.push(index.toString())
      }
    }
  }

/**
 * Checks if an example is contained in the step list
 * 
 */
  exampleCheck() {
    this.exampleChecked = !this.exampleChecked;
    if (this.exampleChecked) {
        this.stepListComplete = JSON.parse(JSON.stringify(this.stepListSaveBlock));
        this.stepListSaveBlock = this.stepListSaveBlock.filter(step => {
            return step.stepType.toString() === 'example';
        });
    } else {
        this.stepListSaveBlock = JSON.parse(JSON.stringify(this.stepListComplete));
    }
  }

/**
 * Submits and saves a block
 */
  submitSaveBlock(form: NgForm) {
    let title = form.value.blockNameInput;
    /* if (this.exampleBlock) {
        this.parentComponent.checkAllExampleSteps(false);
    } else {
        this.parentComponent.checkAllSteps(false);
    } */
    this.parentComponent.checkAllSteps(false);
    if (this.isBackground && this.isBackground !== undefined){
      title = this.backgroundName;
    }
    if (title.trim() === '') {
      title = (document.getElementById('blockNameInput') as HTMLInputElement).placeholder;
    }
    if (this.isTitleEqual(title)) {
      this.nameExistsToast();
      return;
    }
    this.block.name = title;
    this.block.repository = localStorage.getItem('repository');
    this.block.source = localStorage.getItem('source');
    this.block.repositoryId = localStorage.getItem('id');
    if(this.exampleChecked){
      this.block.stepDefinitions = {given: [], when: [], then: [], example: this.stepListSaveBlockExample}
    }
    if (this.backgroundService.backgroundReplaced && this.backgroundService.backgroundReplaced !== undefined){
      this.block.isBackground = true;
    }
    this.block.stepDefinitions.when = this.block.stepDefinitions.when.filter((step) => !step._blockReferenceId);
    this.blockService.saveBlock(this.block).subscribe((resp) => {
        console.log(resp);
        this.updateBlocksEventEmitter();
        this.toastr.success('successfully saved', 'Block');
    });
    this.modalReference.close();
  }

  /**
 * Opens warning toast
 */
  nameExistsToast() {
    this.toastr.warning('', 'This name exists already. Enter unique name.', {
    });
  }
  /**
   * If title already used
   * @param value
   */
  isTitleEqual(value): boolean {
    let bool = false;
    this.blocks.forEach(block => {
      if (value === block.name && this.isBackground == this.block.isBackground) { bool = true; }
    });
    return bool;
  }

  updateBlocksEventEmitter() {
    this.blockService.updateBlocksEvent.emit();
  }
  onSubmit(form: NgForm) {
    this.submitSaveBlock(form);
  }
  closeModal(){
    this.modalReference.close();
  }
}
