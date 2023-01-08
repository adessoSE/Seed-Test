import { Component, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from '../../../app/Services/api.service';
import {RepositoryContainer} from '../../../app/model/RepositoryContainer';

@Component({
  selector: 'app-create-custom-project',
  templateUrl: './create-custom-project.component.html',
  styleUrls: ['./create-custom-project.component.css',  '../layout-modal/layout-modal.component.css']
})
export class CreateCustomProjectComponent {

  @ViewChild('createCustomProjectModal') createCustomProjectModal: CreateCustomProjectComponent;

  /**
  * Model Reference for closing
  */
  constructor(private modalService: NgbModal, public apiService: ApiService, private toastr: ToastrService) { }
 
  modalReference: NgbModalRef;
  /**
  * Existing Projects
  */
 repositories: RepositoryContainer[];

  repoId: string;

  repository: RepositoryContainer;

  // create custom project modal

    /**
     * Open the create custom project modal
     */
  openCreateCustomProjectModal(repositories: RepositoryContainer[]) {
    this.repositories=repositories;
    this.modalReference = this.modalService.open(this.createCustomProjectModal, {ariaLabelledBy: 'modal-basic-title'});
  }

  /**
   * Submits the repository to the backend
   */
   createNewProject(form: NgForm) {
    const title = form.value.title;
    const id=form.value._id
    if (!this.isEmptyOrSpaces(title)) {
        this.apiService.createRepository(title, id).subscribe(resp => {
         this.toastr.info('', 'Project created');
         this.apiService.getRepositoriesEmitter();
         this.apiService.updateRepositoryEmitter();
       });
    }
    this.modalReference.close();
  }
  projectUnique(form: NgForm){
    this.checkProject('submitCreateNewProject', form.value.title, this.repositories, this.repository)

}

checkProject(buttonId: string, input: string, array: RepositoryContainer[], repository?: RepositoryContainer){
  array = array ? array : [];
  input = input ? input : '';
  const button = (document.getElementById(buttonId)) as HTMLButtonElement;
  if ((input && !array.find(i => i.value === input)) || (repository ? array.find(g => g._id == repository._id && g.value == input) : false)){
      button.disabled = false;
  } 
  
  else {
      if(input.length==0)
      {
          button.disabled = true;
          this.toastr.error('The field can not be empty');
      }
     else
     {
       button.disabled = true;
       this.toastr.error('This Project Title is already in use. Please choose another Title'); 
     }
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
