import { Component, EventEmitter, Output, ViewChild, ChangeDetectionStrategy, inject } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ManagementService } from 'src/app/Services/management.service';

@Component({
	selector: 'app-disconnect-jira-account',
	templateUrl: './disconnect-jira-account.component.html',
	styleUrls: ['./disconnect-jira-account.component.css', '../layout-modal/layout-modal.component.css'],
	changeDetection: ChangeDetectionStrategy.Eager,
	standalone: false
})
export class DisconnectJiraAccountComponent {
	private modalService = inject(NgbModal);
	managmentService = inject(ManagementService);


	/**
     * Emits a response after the jira account has been disconnected
     */
	@Output()
	jiraAccountResponse: EventEmitter<any> = new EventEmitter();

	@ViewChild ('disconnectJiraModal') disconnectJiraModal!: DisconnectJiraAccountComponent;

	modalReference!: NgbModalRef;

	/**
   * Opens the disconnect Jira Account Modal
   *
  */
	openDisconnectJiraAccountModal() {
		this.modalReference = this.modalService.open(this.disconnectJiraModal, {ariaLabelledBy: 'modal-basic-title'});
	}

	/**
   * Disconnect Jira Account
   */
	disconnectJiraAccount() {
		this.managmentService.disconnectJiraAccount().subscribe(response => {
			this.jiraAccountResponse.emit(response);
			window.location.reload();
		});
		this.modalReference.close();
	}
}
