import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { findComponent } from '../../test_helper';
import { AccountManagementComponent } from './account-management.component';
import { RepositoryContainer } from '@seed-test/shared/models/RepositoryContainer';
import { provideRouter, Router } from '@angular/router';
import { ROUTES } from '../routes/routes';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ProjectService } from '../Services/project.service';
import type { User } from '@seed-test/shared/models/User';

const repositories: RepositoryContainer[] = [{_id: '1', repoName: 'myFirstRepo', source: 'db', canEdit: true},
	{_id: '2', repoName: 'next repo', source: 'db', canEdit: true},
	{_id: '3', repoName: 'another repo', source: 'db', canEdit: true}];


describe('AccountManagementComponent', () => {
	let component: AccountManagementComponent;
	let fixture: ComponentFixture<AccountManagementComponent>;
	let router: Router;
	let projectService: ProjectService;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [HttpClientTestingModule, MatSnackBarModule, AccountManagementComponent],
			providers: [provideRouter(ROUTES)],
			schemas: [NO_ERRORS_SCHEMA]
		})
			.compileComponents();
	});

	beforeEach(() => {
		router = TestBed.inject(Router);
		projectService = TestBed.inject(ProjectService);
		fixture = TestBed.createComponent(AccountManagementComponent);
		component = fixture.componentInstance;
		vi.spyOn(component.loginService, 'isLoggedIn').mockReturnValue(true);
		component.loginService.isLoggedIn();
		// repositories is now a computed — seed the service signal it derives from
		projectService.repositoriesSignal.set(repositories);
		component.searchInput = '';
		// No GitHub account connected — the template then renders the login link, not the disconnect link
		component.github.set(undefined);
		fixture.detectChanges();
		router.currentNavigation();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should call login() on click', (()=> {
		vi.spyOn(component, 'login');
		const gitHubLink = findComponent(fixture, '.githubLoginContainer');
		gitHubLink.nativeElement.click();

		expect(component.login).toHaveBeenCalled();
	}));

	describe('changePassword', () => {
		beforeEach(() => {
			component.id = 'user123';
			component.email.set('test@example.com');
		});

		it('should call updateUser and clear form on success', async () => {
			vi.spyOn(component.apiService, 'updateUser').mockReturnValue(of({ _id: 'user123', email: 'test@example.com' } as User));
			component.currentPassword.set('oldPassword');
			component.newPassword.set('newPass123');
			component.confirmNewPassword.set('newPass123');

			await component.changePassword();

			expect(component.apiService.updateUser).toHaveBeenCalledWith('user123', {
				currentPassword: 'oldPassword',
				newPassword: 'newPass123'
			});
			expect(component.currentPassword()).toBe('');
			expect(component.newPassword()).toBe('');
			expect(component.confirmNewPassword()).toBe('');
			expect(component.passwordError()).toBeNull();
			expect(component.loadingPassword()).toBe(false);
		});

		it('should show error when current password is wrong (401)', async () => {
			const errorResponse = new HttpErrorResponse({
				status: 401,
				error: { message: 'Invalid credentials' }
			});
			vi.spyOn(component.apiService, 'updateUser').mockReturnValue(throwError(() => errorResponse));
			component.currentPassword.set('wrongPass');
			component.newPassword.set('newPass123');
			component.confirmNewPassword.set('newPass123');

			await component.changePassword();

			expect(component.passwordError()).toBe('Current password is incorrect.');
			expect(component.loadingPassword()).toBe(false);
		});

		it('should reject when new passwords do not match', async () => {
			vi.spyOn(component.apiService, 'updateUser').mockReturnValue(of({} as User));
			component.currentPassword.set('oldPassword');
			component.newPassword.set('newPass123');
			component.confirmNewPassword.set('different');

			await component.changePassword();

			expect(component.apiService.updateUser).not.toHaveBeenCalled();
			expect(component.passwordError()).toBe('New passwords do not match.');
		});

		it('should reject when new password is shorter than 8 characters', async () => {
			vi.spyOn(component.apiService, 'updateUser').mockReturnValue(of({} as User));
			component.currentPassword.set('oldPass1');
			component.newPassword.set('short');
			component.confirmNewPassword.set('short');

			await component.changePassword();

			expect(component.apiService.updateUser).not.toHaveBeenCalled();
			expect(component.passwordError()).toBe('New password must be at least 8 characters.');
		});

		it('should keep validation feedback visible after the clear-error effect runs (regression: error must not be auto-erased)', async () => {
			vi.spyOn(component.apiService, 'updateUser').mockReturnValue(of({} as User));
			component.currentPassword.set('oldPass1');
			component.newPassword.set('short');
			component.confirmNewPassword.set('short');

			// Flush the typing-driven clear-error effect BEFORE clicking, exactly
			// like the real UI (each keystroke settles before the button click).
			fixture.detectChanges();
			await fixture.whenStable();

			await component.changePassword();

			// Flush again so the clear-error effect gets a chance to (wrongly)
			// erase the just-set message.
			fixture.detectChanges();
			await fixture.whenStable();
			fixture.detectChanges();

			expect(component.passwordError()).toBe('New password must be at least 8 characters.');
			const errorEl = fixture.nativeElement.querySelector('p.password-error');
			expect(errorEl).toBeTruthy();
			expect(errorEl.textContent).toContain('New password must be at least 8 characters.');
		});

		it('should reject when current password is shorter than 8 characters', async () => {
			vi.spyOn(component.apiService, 'updateUser').mockReturnValue(of({} as User));
			component.currentPassword.set('short');
			component.newPassword.set('newPass123');
			component.confirmNewPassword.set('newPass123');

			await component.changePassword();

			expect(component.apiService.updateUser).not.toHaveBeenCalled();
			expect(component.passwordError()).toBe('Current password must be at least 8 characters.');
		});
	});
});
