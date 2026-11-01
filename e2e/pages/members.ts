import { expect, type Locator, type Page, type Response } from '@playwright/test';

/**
 * Members and Ownership tabs of the project settings modal (workgroup-edit component).
 * Selectors are checked against frontend/src/app/modals/workgroup-edit/workgroup-edit.component.html.
 */
export class MembersPage {
	/** @param page Playwright page with the project settings modal open. */
	constructor(readonly page: Page) {}

	/** Switches the settings modal to the Members tab. */
	async openMembersTab(): Promise<void> {
		await this.page.getByRole('link', { name: 'Members', exact: true }).click();
		await expect(this.page.locator('#emailField:visible')).toBeVisible();
	}

	/** Switches the settings modal to the Ownership tab. Only the owner sees this tab. */
	async openOwnershipTab(): Promise<void> {
		await this.page.getByRole('link', { name: 'Ownership', exact: true }).click();
		await expect(this.page.locator('#Workgroup_Owner:visible')).toBeVisible();
	}

	/**
	 * Invites a user by email and waits for the POST response, whatever its status.
	 * WHY: pressSequentially because the form validates on keyup; fill() would leave the button disabled.
	 * @param email Email of the invited user.
	 * @param canEdit Whether the invite grants write access; unchecked by default.
	 * @returns The response of POST /workgroup/:id/members.
	 */
	async invite(email: string, canEdit = false): Promise<Response> {
		await this.page.locator('#emailField:visible').pressSequentially(email);
		if (canEdit)
			await this.page.locator('#canEditTeamMembersCheckbox:visible').check();
		const response = this.page.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith('/members'));
		await this.page.getByRole('button', { name: 'Invite to Team' }).click();
		return response;
	}

	/**
	 * Returns the table row of a member, matched by email substring.
	 * @param email Member email.
	 */
	row(email: string): Locator {
		return this.page.locator('#workgroupTable tr[mat-row]', { hasText: email });
	}

	/**
	 * Sets the write-access checkbox of a member. Each change saves immediately, so the PUT is awaited.
	 * The checkbox ("Can edit project") toggles canEdit (write access).
	 * Callers must pass the opposite of the current state; otherwise no request is sent and the wait times out.
	 * @param email Member email.
	 * @param canEdit Target write-access value.
	 * @returns The response of PUT /workgroup/:id/members.
	 */
	async setCanEdit(email: string, canEdit: boolean): Promise<Response> {
		const checkbox = this.row(email).locator('input[name="canEditUser"]');
		const response = this.page.waitForResponse(r => r.request().method() === 'PUT' && r.url().endsWith('/members'));
		if (canEdit)
			await checkbox.check();
		else
			await checkbox.uncheck();
		return response;
	}

	/**
	 * Removes a member with its row button. The backend does not ask for confirmation.
	 * @param email Member email.
	 * @returns The response of DELETE /workgroup/:id/members.
	 */
	async removeMember(email: string): Promise<Response> {
		const response = this.page.waitForResponse(r => r.request().method() === 'DELETE' && r.url().endsWith('/members'));
		await this.row(email).getByRole('button', { name: 'Remove' }).click();
		return response;
	}

	/**
	 * Material dialog that asks for the ownership transfer. Located by its container element and title, not by role:
	 * the settings modal and the CDK overlay hide dialog content from the accessibility tree, so getByRole('dialog') finds nothing.
	 * @returns Locator of the open transfer dialog (zero or one match).
	 */
	private ownerDialog(): Locator {
		return this.page.locator('mat-dialog-container').filter({ hasText: 'Transfer Ownership' });
	}

	/**
	 * Selects a new owner in the Ownership tab and opens the confirmation dialog. Does not confirm.
	 * WHY: the arrow wrapper is clicked because the label overlay intercepts clicks on the mat-select centre.
	 * @param email Email of the member that should become owner.
	 */
	async pickNewOwner(email: string): Promise<void> {
		await this.page.locator('#Workgroup_Owner mat-select .mat-mdc-select-arrow-wrapper').click();
		await this.page.getByRole('option', { name: email, exact: true }).click();
		await expect(this.page.locator('#Workgroup_Owner mat-select')).toContainText(email);
		// WHY: #changeOwner stays disabled until selectedOwner is set, so enabled proves the option click reached the component
		await expect(this.page.locator('#changeOwner')).toBeEnabled();
		await this.page.locator('#changeOwner').click();
		await expect(this.ownerDialog()).toBeVisible();
	}

	/**
	 * Confirms the ownership dialog. Irreversible for the current owner: ownership moves to the picked member.
	 * @returns The response of PUT /repository/owner/:repo_id.
	 */
	async confirmOwnerChange(): Promise<Response> {
		const response = this.page.waitForResponse(r => r.request().method() === 'PUT' && r.url().includes('/repository/owner/'));
		await this.ownerDialog().locator('button', { hasText: 'Confirm' }).click();
		return response;
	}

	/** Dismisses the ownership dialog without changing anything. */
	async cancelOwnerChange(): Promise<void> {
		await this.ownerDialog().locator('button', { hasText: 'Cancel' }).click();
		await expect(this.ownerDialog()).toHaveCount(0);
	}
}
