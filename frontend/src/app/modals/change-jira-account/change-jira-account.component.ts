import { Component, ChangeDetectionStrategy, inject, output, TemplateRef, viewChild } from '@angular/core';
import { UntypedFormGroup, UntypedFormControl, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { ManagementService } from 'src/app/Services/management.service';
import type { User } from '@seed-test/shared/models/User';
import { LayoutModalComponent, MODAL_CONFIG } from '../layout-modal/layout-modal.component';


@Component({
	selector: 'app-change-jira-account',
	templateUrl: './change-jira-account.component.html',
	styleUrls: ['./change-jira-account.component.css', '../layout-modal/layout-modal.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	// Tab clicks are handled by MatTabsModule; the component only mirrors the selected tab via (selectedIndexChange) -> switchForm
	imports: [LayoutModalComponent, FormsModule, ReactiveFormsModule, MatTabsModule]
})
export class ChangeJiraAccountComponent {
	private modalService = inject(MatDialog);
	managmentService = inject(ManagementService);


	/**
     * Emits a response after the jira account got created
     */
	readonly jiraAccountResponse = output<User>();

	readonly changeJiraAccountModal = viewChild.required<TemplateRef<unknown>>('changeJiraAccountModal');

	/**
     * Type of the changed account
     * Modal: change Jira account modal
     */
	type!: string;

	/**
  * Model Reference for closing
  */
	modalReference!: MatDialogRef<unknown>;
	activeForm!: string;

	jiraForm = new UntypedFormGroup({
		jiraHost: new UntypedFormControl('', [Validators.required, Validators.pattern(/\S/)]),
		jiraAuthMethod: new UntypedFormControl('',[])
	});

	jiraBasic = new UntypedFormGroup({
		jiraAccountName: new UntypedFormControl('', [Validators.required, Validators.pattern(/\S/)]),
		jiraPassword: new UntypedFormControl('', [Validators.required, Validators.pattern(/\S/), Validators.minLength(6)])
	});

	jiraBearer = new UntypedFormGroup({
		jiraToken: new UntypedFormControl('', [Validators.required, Validators.pattern(/\S/), Validators.minLength(6)])
	});

	get jiraAccountName() { return this.jiraBasic.get('jiraAccountName'); }
	/**
     * Opens the change Jira Account Modal
     * @param type type of the changed account
     */
	openChangeJiraAccountModal(type: string) {
		this.modalReference = this.modalService.open(this.changeJiraAccountModal(), { ...MODAL_CONFIG, ariaLabelledBy: 'modal-basic-title' });
		this.type = type;
		this.switchForm('bearer');
	}

	/**
	 * Selects the auth tab and mirrors it into jiraForm.jiraAuthMethod. The value is what the backend
	 * expects ('bearer' | 'basic'); without this, submit sent an empty method and the bearer token
	 * even on the Basic tab, so Basic auth could never succeed.
	 * @param form 'bearer' or 'basic'
	 */
	switchForm(form: string){
		this.activeForm = form;
		this.jiraForm.controls.jiraAuthMethod.setValue(form);
	}
	/**
   * Create or change Jira Account
   */
	changeJiraAccountSubmit() {
		if (this.type === 'Jira') {
			const jiraAuthMethod = this.jiraForm.value.jiraAuthMethod;
			// Bearer sends no account name: the hidden Basic field may still hold a stale value from an earlier Basic input
			const jiraAccountName = jiraAuthMethod == 'basic' ? this.jiraBasic.value.jiraAccountName : '';
			const jiraPassword = jiraAuthMethod == 'basic' ? this.jiraBasic.value.jiraPassword : this.jiraBearer.value.jiraToken ;
			const jiraHost = this.jiraForm.value.jiraHost;
			const request = {
				'jiraAccountName': jiraAccountName,
				'jiraPassword': jiraPassword,
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
