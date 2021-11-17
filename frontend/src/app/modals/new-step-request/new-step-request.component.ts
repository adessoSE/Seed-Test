import { Component, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ApiService } from 'src/app/Services/api.service';

@Component({
  selector: 'app-new-step-request',
  templateUrl: './new-step-request.component.html',
  styleUrls: ['./new-step-request.component.css']
})
export class NewStepRequestComponent {

  constructor(private modalService: NgbModal, public apiService: ApiService) { }

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
   * @param form
   */
  submitNewStepRequest(form: NgForm) {
      let title = (document.getElementById('label_form') as HTMLInputElement).value;
      if (title.length === 0) {
          title = (document.getElementById('label_form') as HTMLInputElement).placeholder;
      }
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
      this.apiService.submitGithub(obj).subscribe((resp) => {
          console.log(resp);
      });

  }

}
