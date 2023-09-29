import { Component, Input, ViewChild } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Block } from 'src/app/model/Block';
import { BlockService } from 'src/app/Services/block.service';
import { StepType } from 'src/app/model/StepType';
import { ThemingService } from '../../Services/theming.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-edit-block',
  templateUrl: './edit-block.component.html',
  styleUrls: ['./edit-block.component.css']
})
export class EditBlockComponent {

  @ViewChild('editBlockModal') editBlockModal: any;

  /**
   * Original step types not sorted or changed
   */
  @Input() originalStepTypes: StepType[];

  /**
   * Currently selected block
   */
  @Input() selectedBlock: Block;

  isDark: boolean;

  clipboardBlock: Block = null;

  modalReference: NgbModalRef;

  testRunning = false;

  readonly TEMPLATE_NAME = 'block-editor';
  themeObservable: Subscription;
  /**
   * Subscriptions for all EventEmitter
   */

  constructor(private modalService: NgbModal, public blockService: BlockService, public themeService: ThemingService) {

  }

  ngOnInit() {
    this.isDark = this.themeService.isDarkMode();
    this.themeObservable = this.themeService.themeChanged.subscribe(() => {
      this.isDark = this.themeService.isDarkMode(); 
    });
  }

  /**
   * Opens the edit block form modal
   */
  openEditBlockModal() {
    this.modalReference = this.modalService.open(this.editBlockModal, { ariaLabelledBy: 'modal-basic-title', modalDialogClass: 'edit-block' });
    this.clipboardBlock = JSON.parse(sessionStorage.getItem('copiedBlock'));
    Object.keys(this.selectedBlock.stepDefinitions).forEach((key, _) => {
      this.selectedBlock.stepDefinitions[key].forEach((step: StepType) => {
        //to prevent blocks to be checked after pasting
        step.checked = false;
      });
    });
  }

  editBlockSubmit() {
    console.log(this.selectedBlock);
    this.blockService.editBlock(this.selectedBlock).subscribe((resp) => {

      console.log(resp);

      this.updateBlocksEventEmitter();

    });

    console.log('successfully subscirbed');
    this.modalReference.close();
    console.log('successfully closed');
  }

  updateBlocksEventEmitter() {

    this.blockService.updateBlocksEvent.emit();

  }

  enterSubmit(event) {
    if (event.keyCode === 13) {
      this.editBlockSubmit();
    }
  }

  onClickSubmit() {
    console.log('Go to editBlockSubmit function')
    this.editBlockSubmit();
  }
}


