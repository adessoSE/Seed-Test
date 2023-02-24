import {Component, Input, ViewChild} from '@angular/core';
import {NgbModal, NgbModalRef} from '@ng-bootstrap/ng-bootstrap';
import {Block} from 'src/app/model/Block';
import {ApiService} from 'src/app/Services/api.service';
import {StepType} from 'src/app/model/StepType';
import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import {StepDefinition} from '../../model/StepDefinition';
import {StepDefinitionBackground} from '../../model/StepDefinitionBackground';

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

  /**
   * Action Bar Logic
   */
  activeActionBar = false;
  allChecked = false;
  clipboardBlock: Block = null;
  newStepName: boolean;
  saved = true;

  modalReference: NgbModalRef;

  /**
   * Subscriptions for all EventEmitter
   */

  constructor(private modalService: NgbModal, public apiService: ApiService) {

  }

  /**
   * Opens the edit block form modal
   */
  openEditBlockModal() {
    this.modalReference = this.modalService.open(this.editBlockModal, {ariaLabelledBy: 'modal-basic-title', size: 'sm'});
    this.clipboardBlock = JSON.parse(sessionStorage.getItem('copiedBlock'));
  }


  deactivateStep() {
    for (const prop in this.selectedBlock.stepDefinitions) {
      for (const s in this.selectedBlock.stepDefinitions[prop]) {
        if (this.selectedBlock.stepDefinitions[prop][s].checked) {
          this.selectedBlock.stepDefinitions[prop][s].deactivated = !this.selectedBlock.stepDefinitions[prop][s].deactivated;
        }
      }
    }
    this.saved = false;

  }

  removeStepFromBlock() {
    for (const prop in this.selectedBlock.stepDefinitions) {
      for (let i = this.selectedBlock.stepDefinitions[prop].length - 1; i >= 0; i--) {
        if (this.selectedBlock.stepDefinitions[prop][i].checked) {
          this.selectedBlock.stepDefinitions[prop].splice(i, 1);
        }
      }
    }
    this.saved = false;
    this.allChecked = false;
    this.activeActionBar = false;
  }

  copyBlock() {
    const copyBlock: any = {given: [], when: [], then: [], example: []};
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
    const block: Block = {stepDefinitions: copyBlock};
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

  sortedStepTypes() {
    const sortedStepTypes = this.originalStepTypes;
    sortedStepTypes.sort((a, b) => {
      return a.id - b.id;
    });
    return sortedStepTypes;
  }

  /**
   * Gets the last id in the steps
   * @param stepDefs
   * @param stepStepType
   * @returns
   */
  getLastIDinStep(stepDefs: any, stepStepType: string): number {
    switch (stepStepType) {
      case 'given':
        return this.buildID(stepDefs.given);
      case 'when':
        return this.buildID(stepDefs.when);
      case 'then':
        return this.buildID(stepDefs.then);
      case 'example':
        return this.buildID(stepDefs.example);
    }
  }

  /**
   * gets the id of the step
   * @param step
   * @returns
   */
  buildID(step): number {
    if (step.length !== 0) {
      return step[step.length - 1].id;
    } else {
      return 0;
    }
  }

  /**
   * Creates a new step
   * @param step
   * @param stepDefinitions
   * @returns
   */
  createNewStep(step: StepType, stepDefinitions: StepDefinitionBackground): StepType {
    const obj = JSON.parse(JSON.stringify(step));
    const newId = this.getLastIDinStep(stepDefinitions, obj.stepType) + 1;
    return {
      id: newId,
      mid: obj.mid,
      pre: obj.pre,
      post: obj.post,
      stepType: obj.stepType,
      type: obj.type,
      values: obj.values,
      isExample: obj.stepType === 'example' ? [true] : [false]
    };
  }

  /**
   * Adds a step to the Block
   * @param step
   * @param position
   */
  addStepToBlock(step, position?: number) {
    const newStep = this.createNewStep(step, this.selectedBlock.stepDefinitions);
    switch (newStep.stepType) {
      case 'given':
        if (position) {
          this.selectedBlock.stepDefinitions.given.splice(position, 0, newStep);
        } else {
          this.selectedBlock.stepDefinitions.given.push(newStep);
        }
        break;
      case 'when':
        if (position) {
          this.selectedBlock.stepDefinitions.when.splice(position, 0, newStep);
        } else {
          this.selectedBlock.stepDefinitions.when.push(newStep);
        }
        break;
      case 'then':
        if (position) {
          this.selectedBlock.stepDefinitions.then.splice(position, 0, newStep);
        } else {
          this.selectedBlock.stepDefinitions.then.push(newStep);
        }
        break;
    }
    this.saved = false;

  }

  onDropBlock(event: CdkDragDrop<any>, stepDefs: StepDefinition, stepIndex: number) {
    moveItemInArray(this.getStepList(stepDefs, stepIndex), event.previousIndex, event.currentIndex);
    this.saved = false;
  }

  /**
   * Checks one step in the checkbox
   * @param event
   * @param step
   * @param checkValue
   */
  checkStep(step, checkValue) {
    if (checkValue != null) {
      step.checked = checkValue;
    } else {
      step.checked = !step.checked;
    }
    let checkCount = 0;
    let stepCount = 0;

    for (const prop in this.selectedBlock.stepDefinitions) {
        for (let i = this.selectedBlock.stepDefinitions[prop].length - 1; i >= 0; i--) {
          stepCount++;
          if (this.selectedBlock.stepDefinitions[prop][i].checked) {
            checkCount++;
        }
      }
    }
    if (checkCount >= stepCount) {
      this.allChecked = true;
    } else {
      this.allChecked = false;
    }
    if (checkCount <= 0) {
      this.allChecked = false;
      this.activeActionBar = false;
    } else {
      this.activeActionBar = true;
    }
  }

  addToValuesBlock(input: string, stepIndex: number, valueIndex: number) {
    this.selectedBlock.stepDefinitions.when[stepIndex].values[valueIndex] = input;
    this.saved = false;
  }

  getStepList(stepDefs: StepDefinition, i: number) {
    if (i === 0) {
      return stepDefs.given;
    } else if (i === 1) {
      return stepDefs.when;
    } else if (i === 2) {
      return stepDefs.then;
    } else {
      return stepDefs.example;
    }
  }

  checkAllSteps(checkValue) {
    if (checkValue != null) {
      this.allChecked = checkValue;
    } else {
      this.allChecked = !this.allChecked;
    }
    if (this.allChecked) {
      for (const prop in this.selectedBlock.stepDefinitions) {
          for (let i = this.selectedBlock.stepDefinitions[prop].length - 1; i >= 0; i--) {
            this.checkStep(this.selectedBlock.stepDefinitions[prop][i], true);
        }
      }
      this.activeActionBar = true;
      this.allChecked = true;
    } else {
      for (const prop in this.selectedBlock.stepDefinitions) {
        for (let i = this.selectedBlock.stepDefinitions[prop].length - 1; i >= 0; i--) {
          this.checkStep(this.selectedBlock.stepDefinitions[prop][i], false);
        }
      }
      this.activeActionBar = false;
      this.allChecked = false;
    }
  }

  getKeysList(stepDefs: StepDefinition) {
    if (stepDefs != null) {
      return Object.keys(stepDefs);
    } else {
      return '';
    }
  }

  editBlockSubmit() {
    this.apiService.editBlock(this.selectedBlock).subscribe();
    this.modalReference.close();
  }

  enterSubmit(event) {
    if (event.keyCode === 13) {
      this.editBlockSubmit();
    }
  }

  onClickSubmit() {
    this.editBlockSubmit();
  }
}


