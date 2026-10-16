import { Component, ChangeDetectionStrategy, inject, output, viewChild } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ManagementService } from 'src/app/Services/management.service';
import { NotificationService } from 'src/app/Services/notification.service';
import type { User } from '@seed-test/shared/models/User';
import { LayoutModalComponent } from '../layout-modal/layout-modal.component';

@Component({
	selector: 'app-disconnect-jira-account',
	templateUrl: './disconnect-jira-account.component.html',
	styleUrls: ['./disconnect-jira-account.component.css', '../layout-modal/layout-modal.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [LayoutModalComponent]
})
export class DisconnectJiraAccountComponent {
	private modalService = inject(NgbModal);
	managmentService = inject(ManagementService);
	notify = inject(NotificationService);


	/**
     * Emits a response after the jira account has been disconnected
     */
	readonly jiraAccountResponse = output<User>();

	readonly disconnectJiraModal = viewChild.required<DisconnectJiraAccountComponent>('disconnectJiraModal');

	modalReference!: NgbModalRef;

	/**
   * Opens the disconnect Jira Account Modal
   *
  */
	openDisconnectJiraAccountModal() {
		this.modalReference = this.modalService.open(this.disconnectJiraModal(), {ariaLabelledBy: 'modal-basic-title'});
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
