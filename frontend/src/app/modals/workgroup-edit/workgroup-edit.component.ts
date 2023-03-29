import { Component, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { DeleteToast } from 'src/app/delete-toast'; 
import { RepositoryContainer } from 'src/app/model/RepositoryContainer';
import { ApiService } from 'src/app/Services/api.service';
import { ProjectService } from 'src/app/Services/project.service';
import { TransferOwnershipToast } from 'src/app/transferOwnership-toastr';
import { RepoSwichComponent } from '../repo-swich/repo-swich.component';
import { Subscription } from 'rxjs';
import { MatSelect } from '@angular/material/select';

@Component({
  selector: 'app-workgroup-edit',
  templateUrl: './workgroup-edit.component.html',
  styleUrls: ['./workgroup-edit.component.css', '../layout-modal/layout-modal.component.css']
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
  repos: RepositoryContainer[];

   /**
    * Model Reference for closing
    */
  modalReference: NgbModalRef;

  projectName: string;
  @ViewChild('ownerSelect') ownerSelect: MatSelect;
    /**
    * Selected member to transfer Ownership
    */
    selectedOwner: string;
  
  @ViewChild('workgroupEditModal') workgroupEditModal: WorkgroupEditComponent;
  @ViewChild('repoSwitchModal') repoSwitchModal: RepoSwichComponent;
  transferOwnershipObservable: Subscription;
  constructor(private modalService: NgbModal, 
    public projectService: ProjectService,
    private toastr: ToastrService,
    public apiService: ApiService) {
    this.projectService.deleteRepositoryEvent.subscribe(() => {
      this.deleteCustomRepo();
    });
    this.projectService.getRepositories().subscribe(repos => {
      this.repos = repos;
    });
  }
  ngOnInit() {
    this.transferOwnershipObservable = this.projectService.transferOwnershipEvent.subscribe(_ => {
      this.transferedOwnership(this.selectedOwner);
    });
 }
  ngOnDestroy() {
    if (!this.transferOwnershipObservable.closed) {
      this.transferOwnershipObservable.unsubscribe();
    }
  }
  onModalClosed() {
    this.selectedOwner = undefined;
    this.ownerSelect = null;
  }
 
  /**
     * Opens the workgroup edit modal
     */
  openWorkgroupEditModal(project: RepositoryContainer, userEmail, userId) {
    this.userEmail = userEmail;
    this.userId = userId;
    this.workgroupList = [];
    this.workgroupProject = project;
    this.modalReference = this.modalService.open(this.workgroupEditModal, {ariaLabelledBy: 'modal-basic-titles'});
    const header = document.getElementById('workgroupHeader') as HTMLSpanElement;
    header.textContent = 'Project: ' + project.value;
    this.projectName = project.value;

    this.projectService.getWorkgroup(this.workgroupProject._id).subscribe(res => {
        this.workgroupList = res.member;
        this.workgroupOwner = res.owner.email;
    });
  }

  transferedOwnership(newOwner){
    document.getElementById('changeOwner').setAttribute('style', 'display: none');
    const repo_id = localStorage.getItem('id');
    this.projectService
    .changeOwner(repo_id, newOwner)
    .subscribe(_ => {
        this.toastr.success('successfully changed', 'New owner');
    }); 
    this.modalReference.close();
  }

 transferOwnership(selectedMember: string){
  this.selectedOwner = selectedMember;
  this.toastr.warning('', 'Do you really want to transfer your ownership? You will lose your administrator rights.', {
    toastComponent: TransferOwnershipToast
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
    this.projectService.addToWorkgroup(this.workgroupProject._id, user).subscribe(res => {
      const originList = JSON.parse(JSON.stringify(this.workgroupList));
      originList.push(user);
      this.workgroupList = [];
      this.workgroupList = originList;
    }, (error) => {
      this.workgroupError = error.error.error;
      this.showErrorToast();
    });

  }

/**
 * Removes a user from the workgroup
 * @param user
 */
  removeFromWorkgroup(user) {
    this.projectService.removeFromWorkgroup(this.workgroupProject._id, user).subscribe(res => {
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
    this.projectService.updateWorkgroupUser(this.workgroupProject._id, user).subscribe(res => {
        this.workgroupList = res.member;
    });
  }

/**
 * Delete a custom repository
 */
  deleteCustomRepo() {
    if (this.userEmail == this.workgroupOwner) {
      this.projectService.deleteRepository(this.workgroupProject, this.userId).subscribe(() => {
        this.projectService.getRepositoriesEmitter();
        this.projectService.updateRepositoryEmitter();
      });
      this.modalReference.close();
    }
  }

  isCurrentRepoToDelete() {
    const currentRepo = localStorage.getItem('repository');
    if ( this.workgroupProject.value === currentRepo) {
      this.openRepoSwitchModal();
    } else {
      this.showDeleteRepositoryToast();
    }
  }

/**
 * Opens the delete repository toast
 */
  showDeleteRepositoryToast() {
    this.apiService.nameOfComponent('repository');
    this.toastr.warning('', 'Do you really want to delete this repository?', {
        toastComponent: DeleteToast
    });
  }

  showErrorToast () {
    this.toastr.error(this.workgroupError);
  }

  /**
  * Opens repo switch modal
  */
  openRepoSwitchModal() {
    this.repoSwitchModal.openModal();
  }

  enterSubmit(event, form: NgForm) {
    if (event.keyCode === 13) {
      this.workgroupInvite(form);
      form.reset();
    }
  }

  /**
  * Submits the new name for the scenario
  */
  renameProject(form: NgForm) {
    const name = form.value.newTitle;
    const project = this.workgroupProject;
    if (name.replace(/\s/g, '').length > 0) {
      project.value = name;
   }
    // Emits rename event
    this.projectService.renameProjectEmitter(project);
  }

}
