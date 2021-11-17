import { Component, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { DeleteRepositoryToast } from 'src/app/deleteRepository-toast';
import { RepositoryContainer } from 'src/app/model/RepositoryContainer';
import { ApiService } from 'src/app/Services/api.service';

@Component({
  selector: 'app-workgroup-edit',
  templateUrl: './workgroup-edit.component.html',
  styleUrls: ['./workgroup-edit.component.css']
})
export class WorkgroupEditComponent {

  /**
     * Columns of the workgroup table
     */
  displayedColumnsWorkgroup: string[] = ['email', 'can_edit_workgroup'];

   /**
    * List of all members in the workgroup
    */
  workgroupList = [];

   /**
    * Owner of the workgroup
    */
  workgroupOwner = '';

   /**
    * Error if the request was not successful
    */
  workgroupError = '';

   /**
    * Repository container of the workgroup
    */
  workgroupProject: RepositoryContainer;

   /**
    * Email and id of the active user
    */
  userEmail = '';
  userId = '';

   /**
    * Model Reference for closing
    */
  modalReference: NgbModalRef;

  @ViewChild('workgroupEditModal') workgroupEditModal: WorkgroupEditComponent;

  constructor(private modalService: NgbModal, public apiService: ApiService, private toastr: ToastrService) {
    this.apiService.deleteRepositoryEvent.subscribe(() => {
      this.deleteCustomRepo();
    });
  }

  /**
     * Opens the workgroup edit modal
     */
  openWorkgroupEditModal(project: RepositoryContainer, userEmail, userId) {
    this.userEmail = userEmail;
    this.userId = userId;
    this.workgroupList = [];
    this.workgroupProject = project;
    this.modalReference = this.modalService.open(this.workgroupEditModal, {ariaLabelledBy: 'modal-basic-title'});
    const header = document.getElementById('workgroupHeader') as HTMLSpanElement;
    header.textContent = 'Project: ' + project.value;

    this.apiService.getWorkgroup(this.workgroupProject._id).subscribe(res => {
        this.workgroupList = res.member;
        this.workgroupOwner = res.owner.email;
    });
  }

/**
 * Invites a user to the workgroup
 * @param form
 */
  workgroupInvite(form: NgForm) {
    const email = form.value.email;
    let canEdit = form.value.canEdit;
    if (!canEdit) { canEdit = false; }
    const user = {email, canEdit};
    this.workgroupError = '';
    this.apiService.addToWorkgroup(this.workgroupProject._id, user).subscribe(res => {
      const originList = JSON.parse(JSON.stringify(this.workgroupList));
      originList.push(user);
      this.workgroupList = [];
      this.workgroupList = originList;
    }, (error) => {
      this.workgroupError = error.error.error;
      this.showErrorToast ()
    });

  }

/**
 * Removes a user from the workgroup
 * @param user
 */
  removeFromWorkgroup(user) {
    this.apiService.removeFromWorkgroup(this.workgroupProject._id, user).subscribe(res => {
        this.workgroupList = res.member;
    });
  }

/**
 * Checks if the user can edit the workgroup
 * @param event
 * @param user
 */
  checkEditUser(event, user) {
    user.canEdit = !user.canEdit;
    this.apiService.updateWorkgroupUser(this.workgroupProject._id, user).subscribe(res => {
        this.workgroupList = res.member;
    });
  }

/**
 * Delete a custom repository
 */
  deleteCustomRepo(){
    if(this.userEmail == this.workgroupOwner) {
        this.apiService.deleteRepository(this.workgroupProject, this.userId).subscribe(res =>{
            this.apiService.updateRepositoryEmitter();
            this.modalReference.close();
        })
    }
  }

/**
 * Opens the delete repository toast
 */
  showDeleteRepositoryToast() {
    this.toastr.warning('', 'Do you really want to delete this repository?', {
        toastComponent: DeleteRepositoryToast
    });
  }

  showErrorToast () {
    this.toastr.error(this.workgroupError);
  }

}
