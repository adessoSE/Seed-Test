import { Component, EventEmitter, Output, ViewChild } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ManagementService } from 'src/app/Services/management.service';

@Component({
  selector: 'app-disconnect-jira-account',
  templateUrl: './disconnect-jira-account.component.html',
  styleUrls: ['./disconnect-jira-account.component.css',  '../layout-modal/layout-modal.component.css']
})
export class DisconnectJiraAccountComponent {

   /**
     * Emits a response after the jira account got created
     */
   @Output()
   jiraAccountResponse: EventEmitter<any> = new EventEmitter();

  @ViewChild ('disconnectJiraModal') disconnectJiraModal: DisconnectJiraAccountComponent;

  modalReference: NgbModalRef;

  constructor(private modalService: NgbModal, public managmentService: ManagementService) { }

  /**
   * Opens the disconnect Jira Account Modal
   *
  */
  openDisconnectJiraAccountModal() {
    this.modalReference = this.modalReference = this.modalService.open(this.disconnectJiraModal, {ariaLabelledBy: 'modal-basic-title'});
  }

  /**
   * Create or change Jira Account
   */
  disconnectJiraAccount() {
    this.managmentService.disconnectJiraAccount().subscribe(response => {
      this.jiraAccountResponse.emit(response);
      window.location.reload();
    });
    this.modalReference.close();
  }
}
