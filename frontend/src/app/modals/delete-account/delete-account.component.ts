import { Component, ChangeDetectionStrategy, inject, TemplateRef, viewChild } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { NotificationService } from 'src/app/Services/notification.service';
import { LoginService } from 'src/app/Services/login.service';
import { ManagementService } from 'src/app/Services/management.service';
import { LayoutModalComponent, MODAL_CONFIG } from '../layout-modal/layout-modal.component';


@Component({
	selector: 'app-delete-account',
	templateUrl: './delete-account.component.html',
	styleUrls: ['./delete-account.component.css', '../layout-modal/layout-modal.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [LayoutModalComponent, FormsModule]
})
export class DeleteAccountComponent {
	private modalService = inject(MatDialog);
	loginService = inject(LoginService);
	managmentService = inject(ManagementService);
	private notify = inject(NotificationService);


	readonly deleteAccountModal = viewChild.required<TemplateRef<unknown>>('deleteAccountModal');

	/**
     * Email of the user
     * Modal: delete account modal
     */
	email!: string;

	modalReference!: MatDialogRef<unknown>;

	/**
     * Opens delete account modal
     * @param email email of the user
     */
	openDeleteAccountModal(email: string) {
		this.email = email;
		this.modalReference = this.modalService.open(this.deleteAccountModal(), { ...MODAL_CONFIG, ariaLabelledBy: 'modal-basic-title' });
	}

	/**
 * Deletes The Seed-Test account
 */
	deleteAccount(form: NgForm) {
		const insertedEmail = form.value.insertedEmail;
		if (insertedEmail !== undefined && insertedEmail === this.email) {
			this.managmentService.deleteUser().subscribe({
				next: _resp => {
					this.notify.info('', 'User Deleted');
					this.loginService.logoutEmitter();
				},
				error: () => this.notify.error('Could not delete account')
			});
			this.modalReference.close();
		} else {
			this.unallowableNameToast();
			this.modalService.open(this.deleteAccountModal(), { ...MODAL_CONFIG, ariaLabelledBy: 'modal-basic-title' });
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
