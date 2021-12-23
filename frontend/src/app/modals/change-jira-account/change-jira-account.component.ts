import { Component, EventEmitter, Output, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
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

  /**
  * Model Reference for closing
  */
  modalReference: NgbModalRef;


  constructor(private modalService: NgbModal, public apiService: ApiService) {}
    /**
     * Opens the change Jira Account Modal
     * @param type type of the changed account
     */
  openChangeJiraAccountModal(type) {
    this.modalReference = this.modalService.open(this.changeJiraAccountModal, {ariaLabelledBy: 'modal-basic-title'});
    this.type = type;
  }

  /**
   * Create or change Jira Account
   */
  changeJiraAccountSubmit(form: NgForm) {
    if (this.type === 'Jira') {
      const jiraAccountName = form.value.jiraAccountName;
      const jira_password = form.value.jira_password;
      const jiraHost = form.value.jiraHost;
      const request = {
              'jiraAccountName': jiraAccountName,
              'jiraPassword': jira_password,
              'jiraHost': jiraHost,
      };
      this.apiService.createJiraAccount(request).subscribe(response => {
        this.jiraAccountResponse.emit(response);
        this.modalReference.close();
      });
    }
  }

  enterSubmit(event, form: NgForm) {
    if (event.keyCode === 13) {
      this.changeJiraAccountSubmit(form);
    }
  }

  onClickSubmit(form: NgForm) {
    this.changeJiraAccountSubmit(form);
  }

}
