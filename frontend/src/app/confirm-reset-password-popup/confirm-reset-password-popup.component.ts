import { Component, ChangeDetectionStrategy, inject, input } from '@angular/core';
import { Router } from '@angular/router';

@Component({
	selector: 'app-confirm-reset-password-popup',
	templateUrl: './confirm-reset-password-popup.component.html',
	styleUrls: ['./confirm-reset-password-popup.component.css'],
	changeDetection: ChangeDetectionStrategy.Eager,
	standalone: false
})
export class ConfirmResetPasswordPopupComponent {
	private router = inject(Router);

	readonly type = input(''); // Default background color is red
	readonly message = input<string>('Reset your password?');

	navigateToLogin() {
		this.router.navigateByUrl('/login');
	}
}
