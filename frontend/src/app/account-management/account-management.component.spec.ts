import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { findComponent } from '../../test_helper';
import { AccountManagementComponent } from './account-management.component';
import { RepositoryContainer } from '@seed-test/shared/models/RepositoryContainer';
import { NavigationEnd, NavigationStart, provideRouter, Router } from '@angular/router';
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

	describe('onNavigationEnd', () => {
		it('should re-load the repository list when the account route is navigated to', () => {
			const searchSpy = vi.spyOn(component, 'searchRepos');

			component.onNavigationEnd(new NavigationEnd(1, '/accountManagement', '/accountManagement'));

			expect(searchSpy).toHaveBeenCalledTimes(1);
		});

		it('should not re-load the repository list on unrelated navigations', () => {
			const searchSpy = vi.spyOn(component, 'searchRepos');

			component.onNavigationEnd(new NavigationEnd(2, '/storyEditor', '/storyEditor'));

			expect(searchSpy).not.toHaveBeenCalled();
		});

		it('should ignore non-NavigationEnd router events', () => {
			const searchSpy = vi.spyOn(component, 'searchRepos');

			component.onNavigationEnd(new NavigationStart(1, '/accountManagement'));

			expect(searchSpy).not.toHaveBeenCalled();
		});

		it('stops reacting to router events once the component is destroyed', async () => {
			const searchSpy = vi.spyOn(component, 'searchRepos');

			// Control: while alive, a real account-route navigation reaches the component
			await router.navigateByUrl('/accountManagement');
			expect(searchSpy).toHaveBeenCalled();

			// takeUntilDestroyed() must drop the router subscription on destroy
			searchSpy.mockClear();
			fixture.destroy();
			await router.navigateByUrl('/terms');
			await router.navigateByUrl('/accountManagement');

			expect(searchSpy).not.toHaveBeenCalled();
		});
	});

	// Merge flow: the merge token is a server-signed intent for /mergeGithub. OAuth state comes from /github/state.
	describe('login (GitHub merge start)', () => {
		beforeEach(() => {
			component.id = 'user123';
		});

		it('stores the merge token and starts GitHub login through the state flow', () => {
			vi.spyOn(component.loginService, 'initiateMergeGithub').mockReturnValue(of({ mergeToken: 'merge-token-1' }));
			const githubLoginSpy = vi.spyOn(component.loginService, 'githubLogin').mockReturnValue(of('state-from-server'));

			component.login();

			expect(component.loginService.initiateMergeGithub).toHaveBeenCalledWith('user123');
			expect(localStorage.getItem('mergeToken')).toBe('merge-token-1');
			expect(githubLoginSpy).toHaveBeenCalledTimes(1);
			localStorage.removeItem('mergeToken');
		});

		// Regression: the merge token was sent as the OAuth state, so GitHub returned a value the backend rejected (403)
		it('discards the merge token and reports the failure when the GitHub state cannot be fetched', () => {
			vi.spyOn(component.loginService, 'initiateMergeGithub').mockReturnValue(of({ mergeToken: 'merge-token-2' }));
			vi.spyOn(component.loginService, 'githubLogin').mockReturnValue(throwError(() => new Error('down')));
			const notifySpy = vi.spyOn(component['notify'], 'error');
			vi.spyOn(console, 'error').mockImplementation(() => {});

			component.login();

			expect(localStorage.getItem('mergeToken')).toBeNull();
			expect(notifySpy).toHaveBeenCalledWith('Could not initiate GitHub login. Please try again.');
		});
	});

	// Regression: the account id was written to localStorage for the registration page and sent on register
	describe('navToRegistration', () => {
		it('navigates to registration without storing the account id in localStorage', () => {
			component.id = 'user123';
			localStorage.removeItem('userId');
			const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

			component.navToRegistration();

			expect(localStorage.getItem('userId')).toBeNull();
			expect(navigateSpy).toHaveBeenCalledWith(['/register']);
		});
	});

	// Regression: the rename path never refreshed the shared repository list, so renamed projects stayed stale
	describe('updateRepository', () => {
		it('refreshes the shared repository list after a successful rename', () => {
			component.id = 'user123';
			vi.spyOn(component.projectService, 'updateRepository').mockReturnValue(of({} as RepositoryContainer));
			const emitterSpy = vi.spyOn(component.projectService, 'updateRepositoryEmitter').mockImplementation(() => {});

			component.updateRepository({ _id: '1', repoName: 'renamed', source: 'db', canEdit: true });

			expect(emitterSpy).toHaveBeenCalledTimes(1);
		});

		it('reports a failed rename through the shared failure helper', () => {
			component.id = 'user123';
			vi.spyOn(component.projectService, 'updateRepository').mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
			const notifySpy = vi.spyOn(component['notify'], 'error');
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			component.updateRepository({ _id: '1', repoName: 'renamed', source: 'db', canEdit: true });

			expect(notifySpy).toHaveBeenCalledWith('Could not save the repository.');
			expect(consoleSpy).toHaveBeenCalledWith('Could not save the repository.', expect.anything());
		});
	});

	// Regression: a second rename in the same modal session was dropped because the same mutated object was re-set on a signal
	describe('rename trigger', () => {
		it('saves every rename, including a second rename of the same mutated object', () => {
			component.id = 'user123';
			const updateSpy = vi.spyOn(projectService, 'updateRepository').mockReturnValue(of({} as RepositoryContainer));
			vi.spyOn(projectService, 'updateRepositoryEmitter').mockImplementation(() => {});
			const project: RepositoryContainer = { _id: '1', repoName: 'first', source: 'db', canEdit: true };

			projectService.renameProjectEmitter(project);
			TestBed.flushEffects();
			project.repoName = 'second';
			projectService.renameProjectEmitter(project);
			TestBed.flushEffects();

			expect(updateSpy).toHaveBeenCalledTimes(2);
			expect(updateSpy).toHaveBeenNthCalledWith(1, '1', 'first', 'user123');
			expect(updateSpy).toHaveBeenNthCalledWith(2, '1', 'second', 'user123');
		});
	});
});
