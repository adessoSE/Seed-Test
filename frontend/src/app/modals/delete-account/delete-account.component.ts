import { Component, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from 'src/app/Services/api.service';

@Component({
  selector: 'app-delete-account',
  templateUrl: './delete-account.component.html',
  styleUrls: ['./delete-account.component.css']
})
export class DeleteAccountComponent {

  @ViewChild ('deleteAccountModal') deleteAccountModal: DeleteAccountComponent;

  /**
     * Email of the user
     * Modal: delete account modal
     */
  email: string;

  constructor(private modalService: NgbModal, public apiService: ApiService, private toastr: ToastrService) { }

  /**
     * Opens delete account modal
     * @param email email of the user
     */
  openDeleteAccountModal(email) {
    this.email = email;
    this.modalService.open(this.deleteAccountModal, {ariaLabelledBy: 'modal-basic-title', size: 'sm'});
  }

  /**
 * Deletes The Seed-Test account
 */
  deleteAccount(form: NgForm) {
    const insertedEmail = form.value.insertedEmail;
    if (insertedEmail !== undefined && insertedEmail === this.email) {
        this.apiService.deleteUser().subscribe(resp => {
            this.toastr.info('', 'User Deleted');
            this.apiService.logoutEvent.emit();
        });
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

  enterSubmit(event, form: NgForm) {
    if (event.keyCode === 13) {
      this.deleteAccount(form);
    }
  }

  onClickSubmit(form: NgForm) {
    this.deleteAccount(form);
  }
}
