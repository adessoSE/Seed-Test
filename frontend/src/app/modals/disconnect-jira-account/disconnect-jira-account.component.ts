import { Component, ChangeDetectionStrategy, inject, output, TemplateRef, viewChild } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ManagementService } from 'src/app/Services/management.service';
import { NotificationService } from 'src/app/Services/notification.service';
import type { User } from '@seed-test/shared/models/User';
import { LayoutModalComponent, MODAL_CONFIG } from '../layout-modal/layout-modal.component';

@Component({
	selector: 'app-disconnect-jira-account',
	templateUrl: './disconnect-jira-account.component.html',
	styleUrls: ['./disconnect-jira-account.component.css', '../layout-modal/layout-modal.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [LayoutModalComponent]
})
export class DisconnectJiraAccountComponent {
	private modalService = inject(MatDialog);
	managmentService = inject(ManagementService);
	notify = inject(NotificationService);


	/**
     * Emits a response after the jira account has been disconnected
     */
	readonly jiraAccountResponse = output<User>();

	readonly disconnectJiraModal = viewChild.required<TemplateRef<unknown>>('disconnectJiraModal');

	modalReference!: MatDialogRef<unknown>;

	/**
   * Opens the disconnect Jira Account Modal
   *
  */
	openDisconnectJiraAccountModal() {
		this.modalReference = this.modalService.open(this.disconnectJiraModal(), { ...MODAL_CONFIG, ariaLabelledBy: 'modal-basic-title' });
	}

	/**
   * Disconnect Jira Account
   */
	disconnectJiraAccount() {
		this.managmentService.disconnectJiraAccount().subscribe({
			next: response => {
				this.jiraAccountResponse.emit(response);
				window.location.reload();
			},
			error: () => this.notify.error('Could not disconnect Jira account')
		});
		this.modalReference.close();
	}
}
