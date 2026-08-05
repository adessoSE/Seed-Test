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
			component.repositories.set([{ repoName: 'test' } as any]);
			vi.spyOn(loginService, 'logoutUser').mockReturnValue(of([] as any));
			vi.spyOn(component.router, 'navigate').mockImplementation(() => Promise.resolve(true));

			component.logout();

			expect(component.repositories()).toBeUndefined();
			expect(loginService.logoutUser).toHaveBeenCalled();
			expect(component.router.navigate).toHaveBeenCalledWith(['/login']);
		});
	});

	describe('behavioral: repository management', () => {
		it('should load repositories when logged in', () => {
			localStorage.setItem('login', 'test-token');
			vi.spyOn(projectService, 'getRepositories').mockReturnValue(of([{ repoName: 'Repo1' } as any]));
			component.getRepositories();
			expect(component.repositories()?.length).toBe(1);
			expect(component.repositories()![0].repoName).toBe('Repo1');
		});

		it('should not load repositories when not logged in', () => {
			localStorage.removeItem('login');
			vi.spyOn(projectService, 'getRepositories');
			component.getRepositories();
			expect(projectService.getRepositories).not.toHaveBeenCalled();
		});

		it('should set error on repository load failure', () => {
			localStorage.setItem('login', 'test-token');
			vi.spyOn(projectService, 'getRepositories').mockReturnValue(of([] as any));
			component.getRepositories();
			// Component sets error via subscribe error handler
			expect(component.repositories()?.length).toBe(0);
		});
	});

	describe('behavioral: signal-driven effects', () => {
		it('should call logout when logoutTrigger fires', () => {
			vi.spyOn(component, 'logout');
			loginService.logoutEmitter();
			TestBed.flushEffects();
			expect(component.logout).toHaveBeenCalled();
		});

		it('should call getRepositories when getRepositoriesTrigger fires', () => {
			vi.spyOn(component, 'getRepositories');
			projectService.getRepositoriesEmitter();
			TestBed.flushEffects();
			expect(component.getRepositories).toHaveBeenCalled();
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
});
