import { Component, OnInit, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ThemingService } from '../Services/theming.service';
import { LoginService } from '../Services/login.service';
import { ConfirmResetPasswordPopupComponent } from '../confirm-reset-password-popup/confirm-reset-password-popup.component';

/**
 * Component to enable to reset the password
 */
@Component({
	selector: 'app-confirm-reset-password',
	templateUrl: './confirm-reset-password.component.html',
	styleUrls: ['./confirm-reset-password.component.css'],
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [ConfirmResetPasswordPopupComponent, FormsModule]
})
export class ConfirmResetPasswordComponent implements OnInit {
	loginService = inject(LoginService);
	private router = inject(Router);
	private route = inject(ActivatedRoute);
	private themeService = inject(ThemingService);

	/**
   * Id of the reset password request
   */
	uuid!: string;

	/**
   * New Password of the user
   */
	password!: string;

	/**
   * Error during reset password
   */
	readonly error = signal(false);
	defaultErrorMessage = "Couldn't set password!";
	/**
   * Successfully sent email
   */
	readonly success = signal(false);
	defaultSuccessMessage = 'Your Password Has Been Updated!';

	/**
   * The message to display
   */
	readonly message = signal('');

	isDark!: boolean;
	/**
   * Constructor
   * @param loginService
   * @param router
   * @param route
   */
	constructor() {
		this.route.queryParams.subscribe((params) => {
			if (params.uuid) 
				this.uuid = params.uuid;
      
		});
	}

	ngOnInit(): void {
		this.isDark = this.themeService.isDarkMode();
	}

	/**
   * Confirm the reset and send new password
   * @param form form with the new password value
   */
	confirmReset(form: NgForm) {
		this.error.set(false);
		this.success.set(false);
		this.loginService.confirmReset(this.uuid, form.value.password).subscribe({
			next: (_value) => {
				this.message.set(this.defaultSuccessMessage);
				this.success.set(true);
			},
			error: (error) => {
				this.message.set(this.defaultErrorMessage);
				if (error.status === 401)
					this.message.set('This Link Has Expired!');

				this.error.set(true);
			}
		});
	}

	/**
   * Redirects the user to the login component
   */
	redirectToLogin() {
		this.router.navigate(['/']);
	}

	redirectToReset() {
		this.router.navigate(['/resetpassword']);
	}

	isDarkModeOn() {
		this.isDark = this.themeService.isDarkMode();
		return this.isDark;
	}
}
