import { Component, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from 'src/app/Services/api.service';

@Component({
  selector: 'app-new-step-request',
  templateUrl: './new-step-request.component.html',
  styleUrls: ['./new-step-request.component.css']
})
export class NewStepRequestComponent {

  constructor(private modalService: NgbModal, public apiService: ApiService, private toastr: ToastrService) { }

  @ViewChild('newStepRequestModal') newStepRequestModal: NewStepRequestComponent;

  /**
    * Opens a new step request modal
    * @param stepType
  */
  openNewStepRequestModal(stepType) {
    this.modalService.open(this.newStepRequestModal, {ariaLabelledBy: 'modal-basic-title'});
    const id = 'type_form_' + stepType;
    (document.getElementById(id) as HTMLOptionElement).selected = true;
  }

  /**
   * Submits a request to create a new step
   * @param event
   * @param form
   */
  submitNewStepRequest(event, form: NgForm) {
    const title = form.value.label_form;
    const type = 'Type: '.concat((document.getElementById('type_form') as HTMLSelectElement).value, '\n');
    const description = 'Description: '.concat(form.value.description_form, '\n');
    const email = 'Email: '.concat(form.value.email, '\n');
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
    if (title.trim() !== '') {
      this.apiService.submitGithub(obj).subscribe((resp) => {
        console.log(resp);
      });
    } else {
      this.unallowableNameToast();
    }
  }

  enterSubmit(event, form: NgForm) {
    if (event.keyCode === 13) {
      this.submitNewStepRequest(event, form);
    }
  }

  onClickSubmit(event, form: NgForm) {
    this.submitNewStepRequest(event, form);
  }

  unallowableNameToast() {
    this.toastr.warning('', 'This name is not allowed', {
    });
  }

}
