import { Component, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ApiService } from 'src/app/Services/api.service';

@Component({
  selector: 'app-change-jira-account',
  templateUrl: './change-jira-account.component.html',
  styleUrls: ['./change-jira-account.component.css']
})
export class ChangeJiraAccountComponent {

  /**
     * Emits a response after the jira account got created
     */
  @Output()
   jiraAccountResponse: EventEmitter<any> = new EventEmitter();

  @ViewChild('changeJiraAccountModal') changeJiraAccountModal: ChangeJiraAccountComponent;

  /**
     * Type of the changed account
     * Modal: change Jira account modal
     */
  type: string;


  constructor(private modalService: NgbModal, public apiService: ApiService) {}
    /**
     * Opens the change Jira Account Modal
     * @param type type of the changed account
     */
  openChangeJiraAccountModal(type) {
    this.modalService.open(this.changeJiraAccountModal, {ariaLabelledBy: 'modal-basic-title'});
    this.type = type;
  }

  /**
   * Create or change Jira Account
   */
  changeJiraAccountSubmit() {
    if (this.type === 'Jira') {
      const jiraAccountName = (document.getElementById('jiraAccountName') as HTMLInputElement).value;
      const jira_password = (document.getElementById('jira_password') as HTMLInputElement).value;
      const jiraHost = (document.getElementById('jiraHost') as HTMLInputElement).value;
      const request = {
              'jiraAccountName': jiraAccountName,
              'jiraPassword': jira_password,
              'jiraHost': jiraHost,
      };
      this.apiService.createJiraAccount(request).subscribe(response => {
        this.jiraAccountResponse.emit(response);
      });
    }
  }

}
