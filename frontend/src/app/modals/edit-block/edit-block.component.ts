import { Component, Input, ViewChild } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Block } from 'src/app/model/Block';
import { BlockService } from 'src/app/Services/block.service';
import { StepType } from 'src/app/model/StepType';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { StepDefinition } from '../../model/StepDefinition';
import { StepDefinitionBackground } from '../../model/StepDefinitionBackground';
import { Scenario } from '../../model/Scenario';
import { Story } from '../../model/Story';
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

  @Input() isDark: boolean;

  /**
    * Currently selected story
    */
  selectedStory: Story;

  /**
    * currently selected scenario
    */
  selectedScenario: Scenario;


  /**
   * Action Bar Logic
   */
  activeActionBar = false;
  allChecked = false;
  clipboardBlock: Block = null;
  newStepName: boolean;
  saved = true;

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
  }

  copyBlock() {
    const copyBlock: any = { given: [], when: [], then: [], example: [] };
    for (const prop in this.selectedBlock.stepDefinitions) {
      if (prop !== 'example') {
        for (const s in this.selectedBlock.stepDefinitions[prop]) {
          if (this.selectedBlock.stepDefinitions[prop][s].checked) {
            this.selectedBlock.stepDefinitions[prop][s].checked = false;
            copyBlock[prop].push(this.selectedBlock.stepDefinitions[prop][s]);
          }
        }
      }
    }
    const block: Block = { stepDefinitions: copyBlock };
    sessionStorage.setItem('copiedBlock', JSON.stringify(block));
    this.allChecked = false;
    this.activeActionBar = false;
  }

  insertCopiedBlock() {
    Object.keys(this.clipboardBlock.stepDefinitions).forEach((key) => {
      this.clipboardBlock.stepDefinitions[key].forEach((step: StepType) => {
        this.selectedBlock.stepDefinitions[key].push(JSON.parse(JSON.stringify(step)));
      });
    });
    this.saved = false;

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


