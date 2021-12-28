import { Component, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ApiService } from 'src/app/Services/api.service';

@Component({
  selector: 'app-rename-scenario',
  templateUrl: './rename-scenario.component.html',
  styleUrls: ['./rename-scenario.component.css']
})
export class RenameScenarioComponent {

  modalReference: NgbModalRef;

  @ViewChild('renameScenarioModal') renameScenarioModal: RenameScenarioComponent;

  constructor(private modalService: NgbModal, public apiService: ApiService) { }

/**
 * Opens the rename scenario Modal
 * @param oldTitle old scenario title
 */
   openRenameScenarioModal(oldTitle: string) {
    this.modalReference = this.modalService.open(this.renameScenarioModal, {ariaLabelledBy: 'modal-basic-title'});
    const name = document.getElementById('newTitle') as HTMLInputElement;
    name.placeholder = oldTitle;
  }

/**
* Submits the new name for the scenario
*/
  submitRenameScenario(form: NgForm) {
    const name = form.value.newTitle;
    this.apiService.renameScenarioEmit(name);
    this.modalReference.close();
  }

  enterSubmit(event, form: NgForm) {
    if (event.keyCode === 13) {
      this.submitRenameScenario(form);
      form.reset();
    }
  }

  onClickSubmit(form: NgForm) {
    this.submitRenameScenario(form);
    form.reset();
  }

}
