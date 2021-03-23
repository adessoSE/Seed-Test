import { Component, OnInit, ViewChild } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Block } from '../model/Block';
import { StepType } from '../model/StepType';
import { ApiService } from '../Services/api.service';

@Component({
  selector: 'app-save-block-form',
  templateUrl: './save-block-form.component.html',
  styleUrls: ['./save-block-form.component.css']
})
export class SaveBlockFormComponent {

  @ViewChild('content') content: any;

  block: Block;
  displayedColumnsSaveBlock: string[] = ['stepType', 'pre'];
  stepListSaveBlock = [];
  exampleBlock = false;
  exampleChecked = false;
  stepListComplete = [];
  parentComponent;
  constructor(private modalService: NgbModal, public apiService: ApiService) {
  }

  open(block: Block, comp) {
      this.exampleBlock = false;
      this.exampleChecked = false;
      this.block = block;
      this.parentComponent = comp;
      if(block.stepDefinitions.example && block.stepDefinitions.example.length > 0){
        this.exampleBlock = true;
      }
      this.createStepList()
      this.modalService.open(this.content, {ariaLabelledBy: 'modal-basic-title'});
  }

  createStepList(){
    this.stepListSaveBlock = []
    Object.keys(this.block.stepDefinitions).forEach((key, index) => {
      this.block.stepDefinitions[key].forEach((step: StepType) => {
        this.stepListSaveBlock.push(step)
      })
    })
  }

  exampleCheck(event){
    this.exampleChecked = !this.exampleChecked;
    if(this.exampleChecked){
      this.stepListComplete = JSON.parse(JSON.stringify(this.stepListSaveBlock))
      this.stepListSaveBlock = this.stepListSaveBlock.filter(step => {
        return step.stepType == "example";
      })
    }else {
      this.stepListSaveBlock = JSON.parse(JSON.stringify(this.stepListComplete))
    }
  }

  submit() {
      if(this.exampleBlock){
        this.parentComponent.checkAllExampleSteps(null, false)
      }else {
        this.parentComponent.checkAllSteps(null, false)
      }
      let title = (document.getElementById('blockNameInput') as HTMLInputElement).value
      if (title.length === 0) {
          title = (document.getElementById('blockNameInput') as HTMLInputElement).placeholder;
      }
      this.block.name = title
      this.block.repository = localStorage.getItem('repository')
      this.block.source = localStorage.getItem('source')
      this.apiService.saveBlock(this.block).subscribe((resp) => {
          console.log(resp);
      });
  }

}
