import { Component, ViewChild } from '@angular/core';
import { FormControl, FormGroup, NgForm, Validators } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from 'src/app/Services/api.service';

@Component({
  selector: 'app-new-step-request',
  templateUrl: './new-step-request.component.html',
  styleUrls: ['./new-step-request.component.css']
})
export class NewStepRequestComponent {

  modalReference: NgbModalRef;

  constructor(private modalService: NgbModal, public apiService: ApiService, private toastr: ToastrService) { }

  @ViewChild('newStepRequestModal') newStepRequestModal: NewStepRequestComponent;

  newStepReqForm = new FormGroup ({
    title: new FormControl('', [Validators.required, Validators.pattern(/[\S]/)]),
    type: new FormControl(''),
    description: new FormControl(''),
    email: new FormControl(''),
  },
  {updateOn: "blur"});

  get title() { return this.newStepReqForm.get('title'); }

  /**
    * Opens a new step request modal
    * @param stepType
  */
  openNewStepRequestModal(stepType) {
    this.modalReference = this.modalService.open(this.newStepRequestModal, {ariaLabelledBy: 'modal-basic-title'});
    const id = 'type_form_' + stepType;
    (document.getElementById(id) as HTMLOptionElement).selected = true;
    //Updates the type 
    this.newStepReqForm.patchValue({
      type: (document.getElementById(id) as HTMLOptionElement).value
    }); 
  }

  /**
   * Submits a request to create a new step
   * 
   */
  submitNewStepRequest() {
    const title = this.newStepReqForm.value.title; 
    const type = 'Type: '.concat(this.newStepReqForm.value.type.value);
    const description = 'Description: '.concat(this.newStepReqForm.value.description, '\n');
    const email = 'Email: '.concat(this.newStepReqForm.value.email, '\n');
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
    console.log(obj.title, obj.body);
    this.apiService.submitGithub(obj).subscribe((resp) => {
      console.log(resp);
    });
    this.modalReference.close();
  }

}
