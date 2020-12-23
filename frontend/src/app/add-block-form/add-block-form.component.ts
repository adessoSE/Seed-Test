import { Component, OnInit, ViewChild } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Block } from '../model/Block';
import { StepType } from '../model/StepType';
import { ApiService } from '../Services/api.service';
import {MatListModule, MatSelectionList, MatSelectionListChange} from '@angular/material/list'; 

@Component({
  selector: 'app-add-block-form',
  templateUrl: './add-block-form.component.html',
  styleUrls: ['./add-block-form.component.css']
})

export class AddBlockFormComponent {

  
  @ViewChild('content') content: any;

  blocks: Block[];
  stepList: any;
  selectedBlockList: Block[]; 
  selectedBlock: Block;
  displayedColumns: string[] = ['stepType', 'pre'];
  correspondingComponent: string;
  constructor(private modalService: NgbModal, public apiService: ApiService) {

  }

  open(correspondingComponent) {
    this.getAllBlocks()
    this.correspondingComponent = correspondingComponent;
    this.modalService.open(this.content, {ariaLabelledBy: 'modal-basic-title'});

  }

  getAllBlocks(){
    this.apiService.getBlocks().subscribe((resp) => {
      this.blocks = resp
    });
  }

  change(event){
    this.selectedBlock = this.selectedBlockList[0]
    this.selectedBlockList = []

    this.stepList = []
    Object.keys(this.selectedBlock.stepDefinitions).forEach((key, index) => {
      this.selectedBlock.stepDefinitions[key].forEach((step: StepType) => {
        this.stepList.push(step)
      })
    })
  }


  submit() {
    this.apiService.addBlockToScenario(this.selectedBlock, this.correspondingComponent)
  }

}
