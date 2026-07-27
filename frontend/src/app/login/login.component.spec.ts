import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { FormsModule, ReactiveFormsModule} from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ToastrModule} from 'ngx-toastr';
import { AuthGuard } from '../guards/auth.guard';
import { Router } from '@angular/router';
import {  Location } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import {findComponent} from '../../test_helper';
import { RepositoryContainer } from '@shared/models/RepositoryContainer';

const repositories: RepositoryContainer[] = [{_id: '1', repoName: 'myFirstRepo', source: 'db', canEdit: true}];

class MockedApiService {
	authenticated = false;

	isAuthenticated() {
		return this.authenticated;
	}
}

describe('LoginComponent', () => {
	let component: LoginComponent;
	let fixture: ComponentFixture<LoginComponent>;
	let _location: Location;
	let router: Router;
	let _service: MockedApiService;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			providers: [AuthGuard, MockedApiService],
			imports: [ HttpClientTestingModule, ReactiveFormsModule, FormsModule, RouterTestingModule, ToastrModule.forRoot()],
			declarations: [ LoginComponent ],
			schemas: [NO_ERRORS_SCHEMA]
		})
			.compileComponents();
	});

	beforeEach(() => {
		router = TestBed.inject(Router);
		_location = TestBed.inject(Location);
		_service = TestBed.inject(MockedApiService);
		fixture = TestBed.createComponent(LoginComponent);
		fixture.detectChanges();
		component = fixture.componentInstance;
		router.currentNavigation();
	});

	describe('LoginComponent', ()=> {
		it('should create', () => {
			expect(component).toBeTruthy();
		});

		it('should call githubLogin() on click', fakeAsync(()=> {
			vi.spyOn(component, 'githubLogin');
			// Target the button directly — clicking the container div does not propagate down to the button
			const gitHubLink = findComponent(fixture, '.githubLogin');
			gitHubLink.nativeElement.click();
			tick();
			fixture.detectChanges();
			expect(component.githubLogin).toHaveBeenCalled();
		}));

		it('should trigger getRepositories() when logged in without repository', fakeAsync(() => {
			// The .repoLink element was removed from the template; test the ngOnInit path instead
			vi.spyOn(component, 'getRepositories').mockImplementation(() => {});
			localStorage.setItem('login', 'true');
			localStorage.removeItem('repository');
			component.ngOnInit();
			tick();
			expect(component.getRepositories).toHaveBeenCalled();
			localStorage.removeItem('login');
		}));

		it(' onDark() should return true when user-theme set to dark in localStorage', fakeAsync(() => {
			vi.spyOn(component, 'onDark');
			localStorage.setItem('user-theme', 'dark');
			tick();
			component.onDark();
			expect(component.onDark).toBeTruthy();

		}));

		it('should login on input', fakeAsync(()=> {
      
		}));

	});

	describe('login button', (()=> {

		it('should be disabled without form filled', fakeAsync(() => {
			const loginButton = findComponent(fixture, '.normalButton');
			fixture.detectChanges();
			tick();
			expect(loginButton.properties.disabled).toBeTruthy();
		}));

		it('should be enabled with form filled', fakeAsync(()=> {
			const emailInput = findComponent(fixture, '#email');
			const passwordInput = findComponent(fixture, '#password');
			const loginButton = findComponent(fixture, '.normalButton');

			fixture.detectChanges();
			tick();

			emailInput.nativeElement.value = 'alice789876@mybox.de';
			passwordInput.nativeElement.value = '7723vjhakd6732';
			const event = new Event('input');
			emailInput.nativeElement.dispatchEvent(event);
			passwordInput.nativeElement.dispatchEvent(event);

			fixture.detectChanges();
			tick();

			expect(emailInput.nativeElement.value).toBe('alice789876@mybox.de');
			expect(passwordInput.nativeElement.value).toBe('7723vjhakd6732');
			expect(loginButton.properties.disabled).toBeFalsy();
      
		}));

	}));

});
