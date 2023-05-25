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
    * List with the steps to be saved to the block
    */
  stepListSaveBlock = [];

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
  openSaveBlockFormModal(block: Block, comp, isBackground?: boolean) {
    this.exampleBlock = false;
    this.exampleChecked = false;
    this.block = block;
    this.parentComponent = comp;
    this.isBackground = isBackground;
    if (block.stepDefinitions.example && block.stepDefinitions.example.length > 0) {
      this.exampleBlock = true;
    }
    this.createStepList();
    this.modalReference = this.modalService.open(this.saveBlockFormModal, {ariaLabelledBy: 'modal-basic-title'});
    if(isBackground && isBackground !== undefined){
      (document.getElementById('modalHeader') as HTMLElement).innerHTML = 'Save background as a block';
    }
  }

/**
 * Creates a new step list
 */
  createStepList() {
    this.stepListSaveBlock = [];
    Object.keys(this.block.stepDefinitions).forEach((key, _) => {
        this.block.stepDefinitions[key].forEach((step: StepType) => {
            this.stepListSaveBlock.push(step);
        });
    });
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
    /* if (this.exampleBlock) {
        this.parentComponent.checkAllExampleSteps(false);
    } else {
        this.parentComponent.checkAllSteps(false);
    } */
    this.parentComponent.checkAllSteps(false);
    let title = form.value.blockNameInput;
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
    if (this.backgroundService.backgroundReplaced == true){
      this.block.isBackground = true;
    }
    this.blockService.saveBlock(this.block).subscribe((resp) => {
        console.log(resp);
        this.updateBlocksBackEventEmitter();
        this.toastr.success('successfully saved', 'Background');
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

  isTitleEqual(value): boolean {
    let bool = false;
    this.blocks.forEach(block => {
      if (value === block.name) { bool = true; }
    });
    return bool;
  }
  updateBlocksBackEventEmitter() {
    this.blockService.updateBlocksBackgroundsEvent.emit();
  }
  onSubmit(form: NgForm) {
    this.submitSaveBlock(form);
  }
  closeModal(){
    this.modalReference.close();
  }
}
