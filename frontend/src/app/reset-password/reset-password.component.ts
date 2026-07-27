import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ThemingService } from '../Services/theming.service';
import { LoginService } from '../Services/login.service';

/**
 * Component to reset the password
 */
@Component({
	selector: 'app-reset-password',
	templateUrl: './reset-password.component.html',
	styleUrls: ['./reset-password.component.css'],
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FormsModule]
})
export class ResetPasswordComponent implements OnInit {
	loginService = inject(LoginService);
	private router = inject(Router);
	themeService = inject(ThemingService);

	/**
   * Error during reset password
   */
	error!: string;
	defaultErrorMessage = 'Reset password email faild';

	/**
   * Successfully sent email
   */
	success!: string;
	defaultSuccessMessage = 'Email has been sent!';

	isDark!: boolean;

	ngOnInit(): void {
		this.isDark = this.themeService.isDarkMode();
	}

	/**
   * Request a reset of the password
   * @param form
   */
	requestReset(form: NgForm) {
		this.error = undefined as any;
		this.success = undefined as any;
		this.loginService.requestReset(form.value.email).subscribe({
			next: (_value) => {
				this.error = undefined as any;
				this.success = this.defaultSuccessMessage;
			},
			error: (error) => {
				this.success = undefined as any;
				if (error !== 'No user found with the given email adress!') {
					this.error = "Email couldn't be send.";
					return;
				}
				this.error = error.error;
			}
		});
	}

	/**
   * Redirects the user to the register component
   */
	redirectToRegister() {
		this.router.navigate(['/register']);
	}

	/**
   * Redirects the user to the login component
   */
	redirectToLogin() {
		this.router.navigate(['/']);
	}

	isDarkModeOn() {
		this.isDark = this.themeService.isDarkMode();
		return this.isDark;
	}
}
