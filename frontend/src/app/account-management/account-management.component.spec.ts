import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { findComponent } from '../../test_helper';
import { AccountManagementComponent } from './account-management.component';
import { RepositoryContainer } from '@seed-test/shared/models/RepositoryContainer';
import { provideRouter, Router } from '@angular/router';
import { ROUTES } from '../routes/routes';
import { NO_ERRORS_SCHEMA } from '@angular/core';

const repositories: RepositoryContainer[] = [{_id: '1', repoName: 'myFirstRepo', source: 'db', canEdit: true},
	{_id: '2', repoName: 'next repo', source: 'db', canEdit: true},
	{_id: '3', repoName: 'another repo', source: 'db', canEdit: true}];


describe('AccountManagementComponent', () => {
	let component: AccountManagementComponent;
	let fixture: ComponentFixture<AccountManagementComponent>;
	let router: Router;

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
		fixture = TestBed.createComponent(AccountManagementComponent);
		component = fixture.componentInstance;
		vi.spyOn(component.loginService, 'isLoggedIn').mockReturnValue(true);
		component.loginService.isLoggedIn();
		component.repositories.set(repositories);
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

});
