import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, NgForm, ReactiveFormsModule } from '@angular/forms';
import { provideRouter, Router } from '@angular/router';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';

import { ResetPasswordComponent } from './reset-password.component';

describe('ResetPasswordComponent', () => {
	let component: ResetPasswordComponent;
	let fixture: ComponentFixture<ResetPasswordComponent>;
	let router: Router;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [HttpClientTestingModule, ReactiveFormsModule, FormsModule, MatSnackBarModule, ResetPasswordComponent],
			providers: [provideRouter([])]
		})
			.compileComponents();
	});

	beforeEach(() => {
		router = TestBed.inject(Router);
		fixture = TestBed.createComponent(ResetPasswordComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should navigate to /register on redirectToRegister', () => {
		const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
		component.redirectToRegister();
		expect(navigateSpy).toHaveBeenCalledWith(['/register']);
	});

	// The backend answers the same way for registered and unknown e-mails, so the UI shows the server's text
	describe('requestReset', () => {
		const genericMessage = 'If an account exists for this email, a reset link has been sent';

		it('shows the backend message on success', () => {
			vi.spyOn(component.loginService, 'requestReset').mockReturnValue(of({ message: genericMessage }));

			component.requestReset({ value: { email: 'nobody@example.com' } } as NgForm);

			expect(component.success()).toBe(genericMessage);
			expect(component.error()).toBeUndefined();
		});

		// Regression: the component matched the old 404 text, which the backend no longer sends
		it('shows the generic failure message for any failed request', () => {
			vi.spyOn(component.loginService, 'requestReset').mockReturnValue(
				throwError(() => ({ status: 404, error: 'No user found with the given email adress!' }))
			);

			component.requestReset({ value: { email: 'nobody@example.com' } } as NgForm);

			expect(component.error()).toBe("Email couldn't be send.");
			expect(component.success()).toBeUndefined();
		});
	});
});
