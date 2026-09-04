import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { FormsModule, ReactiveFormsModule} from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthGuard } from '../guards/auth.guard';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import {findComponent} from '../../test_helper';
import { LoginService } from '../Services/login.service';
import { ProjectService } from '../Services/project.service';
import { Observable, of, throwError } from 'rxjs';
import { User } from '@seed-test/shared/models/User';
import { RepositoryContainer } from '@seed-test/shared/models/RepositoryContainer';

class MockedApiService {
	authenticated = false;

	isAuthenticated() {
		return this.authenticated;
	}
}

describe('LoginComponent', () => {
	let component: LoginComponent;
	let fixture: ComponentFixture<LoginComponent>;
	let router: Router;
	let loginService: unknown;
	let projectService: unknown;

	beforeEach(async () => {
		loginService = {
			loginUser: vi.fn(),
			githubLogin: vi.fn(),
			githubCallback: vi.fn(),
			mergeAccountGithub: vi.fn()
		};
		projectService = {
			getRepositories: vi.fn()
		};

		await TestBed.configureTestingModule({
			providers: [
				AuthGuard,
				MockedApiService,
				provideRouter([]),
				{ provide: LoginService, useValue: loginService },
				{ provide: ProjectService, useValue: projectService }
			],
			imports: [HttpClientTestingModule, ReactiveFormsModule, FormsModule, MatSnackBarModule, LoginComponent],
			schemas: [NO_ERRORS_SCHEMA]
		})
			.compileComponents();
	});

	beforeEach(() => {
		loginService = TestBed.inject(LoginService);
		projectService = TestBed.inject(ProjectService);
		router = TestBed.inject(Router);
		fixture = TestBed.createComponent(LoginComponent);
		fixture.detectChanges();
		component = fixture.componentInstance;
		router.currentNavigation();
	});

	describe('LoginComponent', ()=> {
		it('should create', () => {
			expect(component).toBeTruthy();
		});

		it('should call githubLogin() on click', (()=> {
			vi.spyOn(component, 'githubLogin');
			// Target the button directly — clicking the container div does not propagate down to the button
			const gitHubLink = findComponent(fixture, '.githubLogin');
			gitHubLink.nativeElement.click();

			fixture.detectChanges();
			expect(component.githubLogin).toHaveBeenCalled();
		}));

		it('should trigger getRepositories() when logged in without repository', (() => {
			// The .repoLink element was removed from the template; test the ngOnInit path instead
			vi.spyOn(component, 'getRepositories').mockImplementation(() => {});
			localStorage.setItem('login', 'true');
			localStorage.removeItem('repository');
			component.ngOnInit();

			expect(component.getRepositories).toHaveBeenCalled();
			localStorage.removeItem('login');
		}));

		it(' onDark() should return true when user-theme set to dark in localStorage', (() => {
			vi.spyOn(component, 'onDark');
			localStorage.setItem('user-theme', 'dark');

			component.onDark();
			expect(component.onDark).toBeTruthy();

		}));

	});

	describe('login button', (()=> {

		it('should be disabled without form filled', (() => {
			const loginButton = findComponent(fixture, '.normalButton');
			fixture.detectChanges();

			expect(loginButton.properties.disabled).toBeTruthy();
		}));

		it('should be enabled with form filled', (()=> {
			const emailInput = findComponent(fixture, '#email');
			const passwordInput = findComponent(fixture, '#password');
			const loginButton = findComponent(fixture, '.normalButton');

			fixture.detectChanges();


			emailInput.nativeElement.value = 'alice789876@mybox.de';
			passwordInput.nativeElement.value = '7723vjhakd6732';
			const event = new Event('input');
			emailInput.nativeElement.dispatchEvent(event);
			passwordInput.nativeElement.dispatchEvent(event);

			fixture.detectChanges();


			expect(emailInput.nativeElement.value).toBe('alice789876@mybox.de');
			expect(passwordInput.nativeElement.value).toBe('7723vjhakd6732');
			expect(loginButton.properties.disabled).toBeFalsy();

		}));

	}));

	describe('behavioral: isLoading signal during login', () => {
		it('should set isLoadingRepositories to true at start of login()', () => {
			(loginService as any).loginUser.mockReturnValue(of({ _id: '123' } as User));
			(projectService as any).getRepositories.mockReturnValue(of([]));

			expect(component.isLoadingRepositories()).toBeFalsy();

			// login() sets isLoading=true before calling loginUser
			// Use a never-completing observable to prevent the subscribe handler from firing
			(loginService as any).loginUser.mockReturnValue(new Observable(() => {}));
			(projectService as any).getRepositories.mockReturnValue(of([]));

			component.login({ value: { email: 'a@b.de', password: 'pwd', stayLoggedIn: false } } as any);

			// isLoadingRepositories should now be true (set at start of login())
			expect(component.isLoadingRepositories()).toBeTruthy();
		});

		it('should reset isLoadingRepositories after error from getRepositories', () => {
			(projectService as any).getRepositories.mockReturnValue(throwError(() => new Error('API error')));

			component.isLoadingRepositories.set(true);
			component.getRepositories();

			// After error callback, isLoading should be false
			expect(component.isLoadingRepositories()).toBeFalsy();
		});
	});

	describe('behavioral: error signal display', () => {
		it('should show error message in DOM when error signal is set', () => {
			component.error.set('Wrong Username Or Password');
			TestBed.flushEffects();
			fixture.detectChanges();

			const errorEl = fixture.nativeElement.querySelector('.alert-danger');
			expect(errorEl).toBeTruthy();
			expect(errorEl.textContent).toContain('Wrong Username Or Password');
		});

		it('should hide error message when error signal is cleared', () => {
			component.error.set('Some error');
			TestBed.flushEffects();
			fixture.detectChanges();
			expect(fixture.nativeElement.querySelector('.alert-danger')).toBeTruthy();

			component.error.set(undefined);
			TestBed.flushEffects();
			fixture.detectChanges();
			expect(fixture.nativeElement.querySelector('.alert-danger')).toBeFalsy();
		});

		it('should clear error when login() is called', () => {
			component.error.set('Previous error');
			// Use never-completing observable so the subscribe handler doesn't interfere
			(loginService as any).loginUser.mockReturnValue(new Observable(() => {}));

			component.login({ value: { email: 'a@b.de', password: 'pwd', stayLoggedIn: false } } as any);

			// login() sets error to undefined at the start
			expect(component.error()).toBeUndefined();
		});
	});

	describe('behavioral: successful login navigates', () => {
		it('should NOT auto-navigate to / when repository is already selected (prevents thrash loop)', () => {
			// Regression: auto-navigate to '/' when login= and repository were set caused
			// unauthenticated users to enter the shell, trigger 401 fetches, storiesErrorEffect
			// removed login and navigated back to /login, creating an infinite / <-> /login loop.
			// Fix: ngOnInit no longer auto-navigates to '/'.
			localStorage.setItem('login', 'true');
			localStorage.setItem('repository', 'my-repo');
			localStorage.setItem('source', 'db');
			localStorage.setItem('id', 'abc123');
			vi.spyOn(router, 'navigate');

			component.ngOnInit();

			expect(router.navigate).not.toHaveBeenCalled();
			localStorage.clear();
		});

		it('should call getRepositories when login is set but no repository selected', () => {
			(projectService as any).getRepositories.mockReturnValue(of([]));
			localStorage.setItem('login', 'true');
			localStorage.removeItem('repository');
			vi.spyOn(component, 'getRepositories').mockImplementation(() => {});

			component.ngOnInit();

			expect(component.getRepositories).toHaveBeenCalled();
			localStorage.clear();
		});

		it('should navigate to accountManagement when getRepositories returns empty', () => {
			(projectService as any).getRepositories.mockReturnValue(of([]));
			// Set localStorage so getRepositories has data
			localStorage.setItem('id', 'testId');
			localStorage.setItem('repository', '');
			localStorage.setItem('source', 'db');
			vi.spyOn(router, 'navigate');

			component.getRepositories();

			expect(router.navigate).toHaveBeenCalledWith(['/accountManagement']);
			localStorage.clear();
		});

		it('should set error message when getRepositories fails', () => {
			(projectService as any).getRepositories.mockReturnValue(throwError(() => new Error('API error')));
			localStorage.setItem('id', 'testId');
			localStorage.setItem('repository', 'test');
			localStorage.setItem('source', 'db');

			component.getRepositories();

			expect(component.error()).toBe(component.defaultErrorMessage);
			expect(component.isLoadingRepositories()).toBeFalsy();
			localStorage.clear();
		});

		it('should reset isLoadingRepositories to false on successful getRepositories', () => {
			const mockRepos: RepositoryContainer[] = [
				{ repoName: 'my-repo', source: 'db', _id: 'abc123' }
			];
			(projectService as any).getRepositories.mockReturnValue(of(mockRepos));
			localStorage.setItem('id', 'abc123');
			localStorage.setItem('repository', 'my-repo');
			localStorage.setItem('source', 'db');
			vi.spyOn(router, 'navigate');

			component.getRepositories();

			expect(component.isLoadingRepositories()).toBeFalsy();
			expect(component.repositories).toBe(mockRepos);
			expect(router.navigate).toHaveBeenCalledWith(['']);
			localStorage.clear();
		});
	});

	describe('behavioral: failed login must not mark user as logged in', () => {
		// Regression: a failed login (loginUser emits null) previously still set
		// localStorage 'login'='true', which made the app enter the logged-in shell
		// and loop 401 requests until the backend rate limiter blocked everything.
		it('should NOT set login=true and should NOT call getRepositories when loginUser emits null', () => {
			localStorage.removeItem('login');
			(loginService as any).loginUser.mockReturnValue(of(null));
			(projectService as any).getRepositories.mockReturnValue(of([]));
			vi.spyOn(component, 'getRepositories');

			component.login({ value: { email: 'a@b.de', password: 'pwd', stayLoggedIn: false } } as any);

			expect(localStorage.getItem('login')).toBeNull();
			expect(component.getRepositories).not.toHaveBeenCalled();
			localStorage.clear();
		});
	});

	describe('behavioral: githubLogin edge cases', () => {
		it('should set error and return early when clientId in localStorage is "undefined"', () => {
			localStorage.setItem('clientId', 'undefined');

			component.githubLogin();

			expect(component.error()).toBe('GitHub Integration has not been set up yet.');
			localStorage.removeItem('clientId');
		});

		it('should clear existing error before github login', () => {
			component.error.set('Previous error');
			localStorage.setItem('clientId', 'valid-id');

			component.githubLogin();

			expect(component.error()).toBeUndefined();
			localStorage.removeItem('clientId');
		});
	});
});
