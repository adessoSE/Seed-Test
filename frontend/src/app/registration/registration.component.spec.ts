import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, NgForm, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NotificationService } from '../Services/notification.service';
import type { User } from '@seed-test/shared/models/User';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ROUTES } from '../routes/routes';
import { RegistrationComponent } from './registration.component';

describe('RegistrationComponent', () => {
	let component: RegistrationComponent;
	let fixture: ComponentFixture<RegistrationComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [HttpClientTestingModule, FormsModule, ReactiveFormsModule, MatSnackBarModule, RegistrationComponent],
			providers: [provideRouter(ROUTES), {
				provide: ActivatedRoute,
				useValue: {
					snapshot: { params: { story_id: 45, scenario_id: 4 } }
				}
			}],
			schemas: [NO_ERRORS_SCHEMA]
		})
			.compileComponents();
	});
      
	beforeEach(() => {
		fixture = TestBed.createComponent(RegistrationComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	// Regression: a userId from localStorage used to travel with the request and was silently dropped by the backend.
	// The session identifies a GitHub stub, so the component passes only the credentials.
	describe('registerUser', () => {
		it('registers with e-mail and password only, even when a stale userId is still in localStorage', async () => {
			localStorage.setItem('userId', '60a0000000000000000000ff');
			const registerSpy = vi.spyOn(component.loginService, 'registerUser').mockReturnValue(of({} as User));
			vi.spyOn(component.loginService, 'loginUser').mockReturnValue(of(null));

			await component.registerUser({ value: { email: 'new@example.com', password: 'password123' } } as NgForm);

			expect(registerSpy).toHaveBeenCalledWith('new@example.com', 'password123');
			localStorage.removeItem('userId');
		});
	});

	// Regression: loginUser used to swallow a failed login as null, so the post-registration login
	// navigated to /accountManagement even though the user was not logged in.
	describe('post-registration login', () => {
		it('shows an error and does not navigate when the login after registration fails', async () => {
			vi.spyOn(component.loginService, 'registerUser').mockReturnValue(of({} as User));
			vi.spyOn(component.loginService, 'loginUser').mockReturnValue(throwError(() => new Error('401')));
			const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
			const notifySpy = vi.spyOn(TestBed.inject(NotificationService), 'error');

			await component.registerUser({ value: { email: 'new@example.com', password: 'password123' } } as NgForm);

			expect(navigateSpy).not.toHaveBeenCalled();
			expect(notifySpy).toHaveBeenCalledWith('Could not log in after registration. Please log in manually.');
		});

		it('treats an empty login response as a failure and does not navigate', async () => {
			vi.spyOn(component.loginService, 'registerUser').mockReturnValue(of({} as User));
			vi.spyOn(component.loginService, 'loginUser').mockReturnValue(of(null));
			const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
			const notifySpy = vi.spyOn(TestBed.inject(NotificationService), 'error');

			await component.registerUser({ value: { email: 'new@example.com', password: 'password123' } } as NgForm);

			expect(navigateSpy).not.toHaveBeenCalled();
			expect(notifySpy).toHaveBeenCalledWith('Could not log in after registration. Please log in manually.');
		});
	});
});