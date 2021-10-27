import { Component, OnInit, ViewChild } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from 'src/app/Services/api.service';

@Component({
  selector: 'app-create-custom-project',
  templateUrl: './create-custom-project.component.html',
  styleUrls: ['./create-custom-project.component.css']
})
export class CreateCustomProjectComponent {

  @ViewChild('createCustomProjectModal') createCustomProjectModal: CreateCustomProjectComponent;

  constructor(private modalService: NgbModal, public apiService: ApiService, private toastr: ToastrService) { }

  // create custom project modal

    /**
     * Open the create custom project modal
     */
  openCreateCustomProjectModal() {
    this.modalService.open(this.createCustomProjectModal, {ariaLabelledBy: 'modal-basic-title', size: 'sm'});
  }

  /**
   * Submits the repository to the backend
   */
  submitRepo() {
    const name = (document.getElementById('repo_name') as HTMLInputElement).value;
    if (!this.isEmptyOrSpaces(name)) {
        this.apiService.createRepository(name).subscribe(resp => {
            this.toastr.info('', 'Project created');
            this.apiService.updateRepositoryEmitter();
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

}
