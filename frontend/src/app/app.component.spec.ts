import { TestBed, ComponentFixture} from '@angular/core/testing';
import { AppComponent } from './app.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { importProvidersFrom, NO_ERRORS_SCHEMA, Component } from '@angular/core';
import { LoggerModule, NgxLoggerLevel } from 'ngx-logger';
import { DatePipe } from '@angular/common';

@Component({ template: '', standalone: true })
class DummyLoginComponent {}
import { ThemingService } from './Services/theming.service';
import { LoginService } from './Services/login.service';
import { ProjectService } from './Services/project.service';
import { of } from 'rxjs';


describe('AppComponent', () => {
	let component: AppComponent;
	let fixture: ComponentFixture<AppComponent>;
	let themeService: ThemingService;
	let loginService: LoginService;
	let projectService: ProjectService;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [HttpClientTestingModule, MatSnackBarModule, AppComponent],
			providers: [provideRouter([{ path: 'login', component: DummyLoginComponent }]), DatePipe,
				importProvidersFrom(LoggerModule.forRoot({
					serverLoggingUrl: '/api/logs',
					level: NgxLoggerLevel.DEBUG,
					serverLogLevel: NgxLoggerLevel.ERROR
				}))],
			schemas: [NO_ERRORS_SCHEMA]
		}).compileComponents();
	});

	beforeEach(()=> {
		fixture = TestBed.createComponent(AppComponent);
		component = fixture.componentInstance;
		themeService = TestBed.inject(ThemingService);
		loginService = TestBed.inject(LoginService);
		projectService = TestBed.inject(ProjectService);
		fixture.detectChanges();
	});

	it('should create the app', () => {
		expect(component).toBeTruthy();
	});

	describe('behavioral: theme toggle', () => {
		it('should compute isDark from theming service', () => {
			themeService.isDark.set(true);
			TestBed.flushEffects();
			expect(component.isDark()).toBe(true);
		});

		it('should update isDark when theme changes', () => {
			themeService.isDark.set(false);
			TestBed.flushEffects();
			expect(component.isDark()).toBe(false);
		});

		it('should call setNewTheme on toggle', () => {
			vi.spyOn(themeService, 'setNewTheme');
			component.setModeOnToggle(true);
			expect(themeService.setNewTheme).toHaveBeenCalledWith(true);
		});
	});

	describe('behavioral: login state', () => {
		it('should return false for isLoggedIn when no login token', () => {
			localStorage.removeItem('login');
			expect(loginService.isLoggedIn()).toBe(false);
		});

		it('should return true for isLoggedIn when login token exists', () => {
			localStorage.setItem('login', 'test-token');
			expect(loginService.isLoggedIn()).toBe(true);
		});

		it('should clear repositories and navigate on logout', () => {
			localStorage.setItem('login', 'test-token');
			projectService.repositoriesSignal.set([{ repoName: 'test' } as any]);
			vi.spyOn(loginService, 'logoutUser').mockReturnValue(of([] as any));
			vi.spyOn(component.router, 'navigate').mockImplementation(() => Promise.resolve(true));

			component.logout();

			expect(component.repositories()).toEqual([]);
			expect(loginService.logoutUser).toHaveBeenCalled();
			expect(component.router.navigate).toHaveBeenCalledWith(['/login']);
		});

		it('drops the cached repository request on logout so the next user does not see the previous list', () => {
			localStorage.setItem('login', 'test-token');
			vi.spyOn(loginService, 'logoutUser').mockReturnValue(of([] as any));
			vi.spyOn(component.router, 'navigate').mockImplementation(() => Promise.resolve(true));
			vi.spyOn(projectService, 'clearRepositories');

			component.logout();

			expect(projectService.clearRepositories).toHaveBeenCalled();
		});
	});

	describe('behavioral: repository management', () => {
		it('should load repositories when logged in', () => {
			localStorage.setItem('login', 'test-token');
			vi.spyOn(projectService, 'getRepositories').mockReturnValue(of([{ repoName: 'Repo1' } as any]));
			// repositories is now a computed — seed the service signal it derives from
			projectService.repositoriesSignal.set([{ repoName: 'Repo1' } as any]);
			component.getRepositories();
			expect(projectService.getRepositories).toHaveBeenCalled();
			expect(component.repositories()?.length).toBe(1);
			expect(component.repositories()![0].repoName).toBe('Repo1');
		});

		it('should not load repositories when not logged in', () => {
			localStorage.removeItem('login');
			vi.spyOn(projectService, 'getRepositories');
			component.getRepositories();
			expect(projectService.getRepositories).not.toHaveBeenCalled();
		});

		// Regression: the app-level handler POSTed the repository a second time after the modal had already created it
		it('refreshes the list without posting the repository again when a creation is emitted', () => {
			const createSpy = vi.spyOn(projectService, 'createRepository');
			const updateSpy = vi.spyOn(projectService, 'updateRepositoryEmitter').mockImplementation(() => {});
			projectService.createRepositoryEvent({ repositoryContainer: { _id: 'a', repoName: 'Proj', source: 'db' }, name: 'Proj' });
			TestBed.flushEffects();

			expect(createSpy).not.toHaveBeenCalled();
			expect(updateSpy).toHaveBeenCalledTimes(1);
		});
	});

	describe('behavioral: signal-driven effects', () => {
		it('should call logout when logoutTrigger fires', () => {
			vi.spyOn(component, 'logout');
			loginService.logoutEmitter();
			TestBed.flushEffects();
			expect(component.logout).toHaveBeenCalled();
		});
	});

	describe('behavioral: footer sections', () => {
		beforeEach(() => {
			// Mock getElementById for scrollIntoView calls in openImpressum/openTerms
			// and setAttribute calls in the template (href on #githubHref)
			const elementMock = Object.assign(document.createElement('div'), { scrollIntoView: vi.fn() });
			vi.spyOn(document, 'getElementById').mockReturnValue(elementMock);
		});

		it('should toggle impressum visibility', () => {
			expect(component.showImpressum).toBe(false);
			component.openImpressum();
			expect(component.showImpressum).toBe(true);
			component.openImpressum();
			expect(component.showImpressum).toBe(false);
		});

		it('should toggle terms visibility', () => {
			expect(component.showTerms).toBe(false);
			component.openTerms();
			expect(component.showTerms).toBe(true);
			component.openTerms();
			expect(component.showTerms).toBe(false);
		});

		it('should close impressum when opening terms', () => {
			component.showImpressum = true;
			component.openTerms();
			expect(component.showImpressum).toBe(false);
			expect(component.showTerms).toBe(true);
		});

		it('should close terms when opening impressum', () => {
			component.showTerms = true;
			component.openImpressum();
			expect(component.showTerms).toBe(false);
			expect(component.showImpressum).toBe(true);
		});
	});

	describe('behavioral: DOM rendering', () => {
		it('should render the version in DOM', () => {
			TestBed.flushEffects();
			fixture.detectChanges();
			const versionEl = fixture.nativeElement.querySelector('#version');
			expect(versionEl).toBeTruthy();
			expect(versionEl.textContent).toContain('Version');
		});
	});

	describe('behavioral: help menu keyboard access', () => {
		const helpTrigger = (): HTMLButtonElement => fixture.nativeElement.querySelector('.help-button');
		const helpWrapper = (): HTMLElement => fixture.nativeElement.querySelector('.help-hover-wrapper');

		const expanded = (): string | null => helpTrigger().getAttribute('aria-expanded');
		// Hover closes after a 200 ms delay; fake timers make that delay deterministic
		beforeEach(() => vi.useFakeTimers());
		afterEach(() => vi.useRealTimers());

		it('renders the Help trigger as a disclosure button (aria-expanded + aria-controls, no menu role)', () => {
			const trigger = helpTrigger();
			expect(trigger.tagName).toBe('BUTTON');
			expect(trigger.type).toBe('button');
			expect(trigger.hasAttribute('aria-haspopup')).toBe(false);
			expect(expanded()).toBe('false');
			expect(trigger.getAttribute('aria-controls')).toBe('helpMenuPanel');
		});

		it('opens on hover and reports aria-expanded=true while the panel is shown', () => {
			helpWrapper().dispatchEvent(new MouseEvent('mouseenter'));
			fixture.detectChanges();
			expect(expanded()).toBe('true');
		});

		it('keeps the Help menu open for 200 ms after the pointer leaves', () => {
			helpWrapper().dispatchEvent(new MouseEvent('mouseenter'));
			helpWrapper().dispatchEvent(new MouseEvent('mouseleave'));
			fixture.detectChanges();
			vi.advanceTimersByTime(199);
			fixture.detectChanges();
			expect(expanded()).toBe('true');
			vi.advanceTimersByTime(1);
			fixture.detectChanges();
			expect(expanded()).toBe('false');
		});

		it('cancels the pending close when the pointer re-enters within 200 ms', () => {
			helpWrapper().dispatchEvent(new MouseEvent('mouseenter'));
			helpWrapper().dispatchEvent(new MouseEvent('mouseleave'));
			vi.advanceTimersByTime(100);
			helpWrapper().dispatchEvent(new MouseEvent('mouseenter'));
			vi.advanceTimersByTime(500);
			fixture.detectChanges();
			expect(expanded()).toBe('true');
		});

		/**
		 * Simulates Tab focus on the trigger. jsdom's :focus-visible heuristic is not reliable, so the
		 * match is stubbed; the real selector is what browsers evaluate for keyboard focus.
		 */
		const keyboardFocusTrigger = () => {
			vi.spyOn(helpTrigger(), 'matches').mockReturnValue(true);
			helpTrigger().dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
		};

		it('opens on keyboard focus and closes when focus leaves the menu', () => {
			keyboardFocusTrigger();
			fixture.detectChanges();
			expect(expanded()).toBe('true');
			helpWrapper().dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
			fixture.detectChanges();
			expect(expanded()).toBe('false');
		});

		it('does not stay open after a mouse click focuses the trigger once the pointer leaves', () => {
			// A mouse click focuses the button without :focus-visible; the focusin must not count as keyboard focus
			helpTrigger().dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
			helpWrapper().dispatchEvent(new MouseEvent('mouseenter'));
			helpWrapper().dispatchEvent(new MouseEvent('mouseleave'));
			vi.advanceTimersByTime(200);
			fixture.detectChanges();
			expect(expanded()).toBe('false');
		});

		it('closes a hover-opened menu on Escape and keeps it closed until the pointer leaves', () => {
			helpWrapper().dispatchEvent(new MouseEvent('mouseenter'));
			fixture.detectChanges();
			helpTrigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
			fixture.detectChanges();
			expect(expanded()).toBe('false');
			// Pointer still over the menu: :hover must not re-open it
			vi.advanceTimersByTime(1000);
			fixture.detectChanges();
			expect(expanded()).toBe('false');
			// Leaving clears the dismissal, so the next hover opens the menu again
			helpWrapper().dispatchEvent(new MouseEvent('mouseleave'));
			vi.advanceTimersByTime(200);
			helpWrapper().dispatchEvent(new MouseEvent('mouseenter'));
			fixture.detectChanges();
			expect(expanded()).toBe('true');
		});

		it('collapses the Help menu on Escape and moves focus back to the trigger', () => {
			// Asserted via a spy: the test DOM does not reliably update document.activeElement
			const focusSpy = vi.spyOn(helpTrigger(), 'focus');
			keyboardFocusTrigger();
			helpTrigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
			fixture.detectChanges();
			expect(expanded()).toBe('false');
			expect(focusSpy).toHaveBeenCalled();
		});

		it('re-opens the Help menu after Escape when the trigger is activated again', () => {
			keyboardFocusTrigger();
			helpTrigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
			helpTrigger().click();
			fixture.detectChanges();
			expect(expanded()).toBe('true');
		});
	});
});
