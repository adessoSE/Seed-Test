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
  displayedColumns: string[] = ['stepType', 'pre'];
  stepList = [];

  constructor(private modalService: NgbModal, public apiService: ApiService) {
  }

  open(block: Block) {
      this.block = block;
      this.createStepList()
      this.modalService.open(this.content, {ariaLabelledBy: 'modal-basic-title'});
      //const id = 'type_form_' + block.name;
      //(document.getElementById(id) as HTMLOptionElement).selected = true;
  }

  createStepList(){
    this.stepList = []
    Object.keys(this.block.stepDefinitions).forEach((key, index) => {
      this.block.stepDefinitions[key].forEach((step: StepType) => {
        this.stepList.push(step)
      })
  })
  }


  submit() {
      for (let prop in this.block.stepDefinitions) {
        for(let s in this.block.stepDefinitions[prop]){
            if(this.block.stepDefinitions[prop][s].checked){
              this.block.stepDefinitions[prop][s].checked = false
            }
        }
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
