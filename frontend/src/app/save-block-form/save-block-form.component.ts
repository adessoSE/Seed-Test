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
  data = [{id:2,mid:"",pre:"I am on the website1:",stepType:"given",type:"Website",values:[""],deactivated:false, checked:true},
  {id:2,mid:"",pre:"I am on the website2:",stepType:"given",type:"Website",values:[""],deactivated:false, checked:true},
  {id:2,mid:"",pre:"I am on the website3:",stepType:"given",type:"Website",values:[""],deactivated:false, checked:true}]
  
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
      let title = (document.getElementById('label_form') as HTMLInputElement).value;
      if (title.length === 0) {
          title = (document.getElementById('label_form') as HTMLInputElement).placeholder;
      }
      const type = 'Type: '.concat((document.getElementById('type_form') as HTMLSelectElement).value , '\n');
      const description = 'Description: '.concat((document.getElementById('description_form') as HTMLTextAreaElement).value, '\n');
      const email = 'E-Mail: '.concat((document.getElementById('email_form') as HTMLInputElement).value , '\n');
      const body = type.concat(description, email);
      const obj = {
          'title': title,
          'body': body,
          'assignees': [
              'adessoCucumber'
          ],
          'milestone': null,
          'labels': [
              'generated',
              'ToDo'
          ]
      };

      this.apiService.submitGithub(obj).subscribe((resp) => {
          console.log(resp);
      });

  }

}
