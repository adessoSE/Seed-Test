import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { NEVER } from 'rxjs';
import { LayoutModalComponent } from '../layout-modal/layout-modal.component';
import { ChangeJiraAccountComponent } from './change-jira-account.component';

describe('ChangeJiraAccountComponent', () => {
	let component: ChangeJiraAccountComponent;
	let fixture: ComponentFixture<ChangeJiraAccountComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			// NoopAnimationsModule: mat-tab-group animates its body via @angular/animations, which needs an animations provider in tests
			imports: [HttpClientTestingModule, MatSnackBarModule, NoopAnimationsModule, ChangeJiraAccountComponent, LayoutModalComponent]
		})
			.compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(ChangeJiraAccountComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	// Close the modal while the fixture is still alive. Dismissing after TestBed teardown removes DOM nodes of an
	// already destroyed view, which surfaced as unhandled "removeChild of null" errors.
	afterEach(async () => {
		TestBed.inject(MatDialog).closeAll();
		fixture.detectChanges();
		await fixture.whenStable();
		// MatDialog removes the dialog container only after its close animation, which whenStable() does not wait for
		await vi.waitFor(() => expect(document.querySelector('mat-dialog-container')).toBeNull());
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	describe('changeJiraAccountSubmit', () => {
		// NEVER keeps the request open: a successful response calls window.location.reload(), which would reload the test runner
		it('sends the basic method with username and password when the Basic tab is active', () => {
			const createJiraAccount = vi.spyOn(component.managmentService, 'createJiraAccount').mockReturnValue(NEVER);
			component.openChangeJiraAccountModal('Jira');
			component.switchForm('basic');
			component.jiraBasic.setValue({ jiraAccountName: 'jira-user', jiraPassword: 'basic-secret' });
			component.jiraForm.patchValue({ jiraHost: 'jira.example.com' });

			component.changeJiraAccountSubmit();

			expect(createJiraAccount).toHaveBeenCalledWith({
				jiraAccountName: 'jira-user',
				jiraPassword: 'basic-secret',
				jiraHost: 'jira.example.com',
				jiraAuthMethod: 'basic'
			});
		});

		// Regression: a name typed on the Basic tab must not leak into a Bearer submit (the hidden basic field keeps its value).
		it('omits jiraAccountName from the bearer body even when the Basic field holds a value', () => {
			const createJiraAccount = vi.spyOn(component.managmentService, 'createJiraAccount').mockReturnValue(NEVER);
			component.openChangeJiraAccountModal('Jira');
			component.jiraBasic.setValue({ jiraAccountName: 'stale-basic-user', jiraPassword: 'stale-basic-pass' });
			component.switchForm('bearer');
			component.jiraBearer.setValue({ jiraToken: 'bearer-token-123' });
			component.jiraForm.patchValue({ jiraHost: 'jira.example.com' });

			component.changeJiraAccountSubmit();

			const body = createJiraAccount.mock.calls[0][0];
			expect(body.jiraAccountName).toBe('');
			expect(body.jiraPassword).toBe('bearer-token-123');
		});

		it('sends the bearer method with the token when the Bearer tab is active', () => {
			const createJiraAccount = vi.spyOn(component.managmentService, 'createJiraAccount').mockReturnValue(NEVER);
			component.openChangeJiraAccountModal('Jira');
			component.jiraBearer.setValue({ jiraToken: 'bearer-token-123' });
			component.jiraForm.patchValue({ jiraHost: 'jira.example.com' });

			component.changeJiraAccountSubmit();

			expect(createJiraAccount).toHaveBeenCalledWith(expect.objectContaining({
				jiraPassword: 'bearer-token-123',
				jiraHost: 'jira.example.com',
				jiraAuthMethod: 'bearer'
			}));
		});
	});

	describe('auth method tabs', () => {
		/**
		 * The modal content is rendered by MatDialog into document.body, not into the fixture, so the
		 * tests query the document and close the modal again afterwards.
		 */
		async function openModalAndGetTabs(): Promise<HTMLElement[]> {
			component.openChangeJiraAccountModal('Jira');
			fixture.detectChanges();
			await fixture.whenStable();
			return Array.from(document.querySelectorAll<HTMLElement>('[role="tab"]'));
		}

		it('shows the Bearer token panel by default', async () => {
			await openModalAndGetTabs();

			expect(document.querySelector('#jiraTokenInput')).not.toBeNull();
			expect(document.querySelector('#jiraAccountNameInput')).toBeNull();
		});

		it('shows the Basic panel after the Basic tab is selected', async () => {
			const tabs = await openModalAndGetTabs();

			tabs[1].click();
			fixture.detectChanges();
			await fixture.whenStable();

			expect(component.activeForm).toBe('basic');
			expect(document.querySelector('#jiraAccountNameInput')).not.toBeNull();
			expect(document.querySelector('#jiraTokenInput')).toBeNull();
		});

		// The tab group sits inside <form (ngSubmit)>: a tab label must not act as a submit trigger, otherwise
		// switching to Basic would send the request before any credentials were entered.
		it('does not submit the form when a tab is clicked', async () => {
			const createJiraAccount = vi.spyOn(component.managmentService, 'createJiraAccount').mockReturnValue(NEVER);
			const tabs = await openModalAndGetTabs();

			tabs[1].click();
			fixture.detectChanges();
			await fixture.whenStable();

			expect(createJiraAccount).not.toHaveBeenCalled();
		});
	});
});
