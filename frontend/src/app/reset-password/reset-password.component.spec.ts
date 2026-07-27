import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { provideRouter, Router } from '@angular/router';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { ResetPasswordComponent } from './reset-password.component';

describe('ResetPasswordComponent', () => {
	let component: ResetPasswordComponent;
	let fixture: ComponentFixture<ResetPasswordComponent>;
	let router: Router;

	beforeEach(async () => {
		TestBed.configureTestingModule({
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
});
