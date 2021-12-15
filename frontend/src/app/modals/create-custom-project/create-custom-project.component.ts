import { Component, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from 'src/app/Services/api.service';

@Component({
  selector: 'app-create-custom-project',
  templateUrl: './create-custom-project.component.html',
  styleUrls: ['./create-custom-project.component.css']
})
export class CreateCustomProjectComponent {

  @ViewChild('createCustomProjectModal') createCustomProjectModal: CreateCustomProjectComponent;

  /**
  * Model Reference for closing
  */
  modalReference: NgbModalRef;

  constructor(private modalService: NgbModal, public apiService: ApiService, private toastr: ToastrService) { }

  // create custom project modal

    /**
     * Open the create custom project modal
     */
  openCreateCustomProjectModal() {
    this.modalReference = this.modalService.open(this.createCustomProjectModal, {ariaLabelledBy: 'modal-basic-title', size: 'sm'});
  }

  /**
   * Submits the repository to the backend
   */
  submitRepo(form: NgForm) {
    const name = form.value.repo_name;
    if (!this.isEmptyOrSpaces(name)) {
        this.apiService.createRepository(name).subscribe(resp => {
            this.toastr.info('', 'Project created');
            this.apiService.getRepositoriesEmitter();
            this.apiService.updateRepositoryEmitter();
            this.modalReference.close();
        });
    }
  }

  /**
   * Checks if the string is empty or only contains spaces
   * @param str
   * @returns
   */
  isEmptyOrSpaces(str: string) {
      return str === null || str.match(/^ *$/) !== null;
  }

  enterSubmit(event, form : NgForm) {
    if (event.keyCode === 13) {
      this.submitRepo(form);
    }
  }

  onClickSubmit(form : NgForm) {
    this.submitRepo(form);
  }

}
