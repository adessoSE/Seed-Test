import { Component, EventEmitter, Output, ViewChild } from '@angular/core';
import { UntypedFormGroup, UntypedFormControl, Validators, FormControl, RadioControlValueAccessor} from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ManagementService } from 'src/app/Services/management.service';


@Component({
  selector: 'app-change-jira-account',
  templateUrl: './change-jira-account.component.html',
  styleUrls: ['./change-jira-account.component.css',  '../layout-modal/layout-modal.component.css']
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

  jiraForm = new UntypedFormGroup({
    jiraAccountName: new UntypedFormControl('', [Validators.required, Validators.pattern(/\S/)]),
    jiraPassword: new UntypedFormControl('', [Validators.required, Validators.pattern(/\S/), Validators.minLength(6)]),
    jiraHost: new UntypedFormControl('', [Validators.required, Validators.pattern(/\S/)]),
    jiraAuthMethod: new UntypedFormControl('',[])
  });

  get jiraAccountName() { return this.jiraForm.get('jiraAccountName'); }

  constructor(private modalService: NgbModal, public managmentService: ManagementService) {}
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
  changeJiraAccountSubmit() {
    if (this.type === 'Jira') {
      const jiraAccountName = this.jiraForm.value.jiraAccountName;
      const jira_password = this.jiraForm.value.jiraPassword;
      const jiraHost = this.jiraForm.value.jiraHost;
      const jiraAuthMethod = this.jiraForm.value.jiraAuthMethod;
      const request = {
              'jiraAccountName': jiraAccountName,
              'jiraPassword': jira_password,
              'jiraHost': jiraHost,
              'jiraAuthMethod': jiraAuthMethod
      };  
      this.managmentService.createJiraAccount(request).subscribe(response => {
        this.jiraAccountResponse.emit(response);
        window.location.reload();
      });
      this.modalReference.close();
    }
  }

}
