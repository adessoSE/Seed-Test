import { Component, ChangeDetectionStrategy, inject, viewChild } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { NotificationService } from 'src/app/Services/notification.service';
import { LoginService } from 'src/app/Services/login.service';
import { ManagementService } from 'src/app/Services/management.service';
import { LayoutModalComponent } from '../layout-modal/layout-modal.component';


@Component({
    selector: 'app-delete-account',
    templateUrl: './delete-account.component.html',
    styleUrls: ['./delete-account.component.css', '../layout-modal/layout-modal.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [LayoutModalComponent, FormsModule]
})
export class DeleteAccountComponent {
	private modalService = inject(NgbModal);
	loginService = inject(LoginService);
	managmentService = inject(ManagementService);
	private notify = inject(NotificationService);


	readonly deleteAccountModal = viewChild.required<DeleteAccountComponent>('deleteAccountModal');

	/**
     * Email of the user
     * Modal: delete account modal
     */
	email!: string;

	modalReference!: NgbModalRef;

	/**
     * Opens delete account modal
     * @param email email of the user
     */
	openDeleteAccountModal(email: string) {
		this.email = email;
		this.modalReference = this.modalService.open(this.deleteAccountModal(), {ariaLabelledBy: 'modal-basic-title', size: 'sm'});
	}

	/**
 * Deletes The Seed-Test account
 */
	deleteAccount(form: NgForm) {
		const insertedEmail = form.value.insertedEmail;
		if (insertedEmail !== undefined && insertedEmail === this.email) {
			this.managmentService.deleteUser().subscribe(_resp => {
				this.notify.info('', 'User Deleted');
				this.loginService.logoutEvent.emit();
			});
			this.modalReference.close();
		} else {
			this.unallowableNameToast();
			this.modalService.open(this.deleteAccountModal(), {ariaLabelledBy: 'modal-basic-title', size: 'sm'});
		}
	}

	/**
 * Opens warning toast
 */

	unallowableNameToast() {
		this.notify.warning('', 'Enter a valid e-mail', {
		});
	}
}
