import { Component, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { LoginService } from 'src/app/Services/login.service';
import { ManagementService } from 'src/app/Services/management.service';

@Component({
  selector: 'app-delete-account',
  templateUrl: './delete-account.component.html',
  styleUrls: ['./delete-account.component.css',  '../layout-modal/layout-modal.component.css']
})
export class DeleteAccountComponent {

  @ViewChild ('deleteAccountModal') deleteAccountModal: DeleteAccountComponent;

  /**
     * Email of the user
     * Modal: delete account modal
     */
  email: string;

  modalReference: NgbModalRef;

  constructor(private modalService: NgbModal, public loginService: LoginService, public managmentService: ManagementService, private toastr: ToastrService) { }

  /**
     * Opens delete account modal
     * @param email email of the user
     */
  openDeleteAccountModal(email) {
    this.email = email;
    this.modalReference = this.modalService.open(this.deleteAccountModal, {ariaLabelledBy: 'modal-basic-title', size: 'sm'});
  }

  /**
 * Deletes The Seed-Test account
 */
  deleteAccount(form: NgForm) {
    const insertedEmail = form.value.insertedEmail;
    if (insertedEmail !== undefined && insertedEmail === this.email) {
        this.managmentService.deleteUser().subscribe(resp => {
            this.toastr.info('', 'User Deleted');
            this.loginService.logoutEvent.emit();
        });
      this.modalReference.close();
    } else {
      this.unallowableNameToast();
      this.modalService.open(this.deleteAccountModal, {ariaLabelledBy: 'modal-basic-title', size: 'sm'});
    }
  }

  /**
 * Opens warning toast
 */

  unallowableNameToast() {
    this.toastr.warning('', 'Enter a valid e-mail', {
    });
  }
}
