import { Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ReportContainer } from 'src/app/model/ReportContainer';
import { RepositoryContainer } from 'src/app/model/RepositoryContainer';
import { ApiService } from 'src/app/Services/api.service';

@Component({
  selector: 'app-rename-project',
  templateUrl: './rename-project.component.html',
  styleUrls: ['./rename-project.component.css']
})
export class RenameProjectComponent {

  modalReference: NgbModalRef;

  @ViewChild('renameProjectModal') renameProjectModal: RenameProjectComponent;

  constructor(private modalService: NgbModal, public apiService: ApiService) { }

  /**
 * Opens the rename scenario Modal
 * @param oldTitle old scenario title
 */
  openRenameProjectModal(repoName : string) {
    this.modalReference = this.modalService.open(this.renameProjectModal, {ariaLabelledBy: 'modal-basic-title'});
    const name = document.getElementById('newTitle') as HTMLInputElement;
    name.placeholder = repoName;
  }

/**
* Submits the new name for the scenario
*/
  submitRenameProject(form: NgForm) {
    const name = form.value.newTitle;
    //Emits rename event
    this.apiService.renameProjectEmit(name);
    this.modalReference.close();
  }

  enterSubmit(event, form: NgForm) {
    if (event.keyCode === 13) {
      this.submitRenameProject(form);
      form.reset();
    }
  }

  onClickSubmit(form: NgForm) {
    this.submitRenameProject(form);
    form.reset();
  }

}
