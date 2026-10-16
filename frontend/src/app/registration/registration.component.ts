import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import {Router} from '@angular/router';
import { NgForm, FormsModule } from '@angular/forms';
import { NotificationService } from '../Services/notification.service';
import { ThemingService } from '../Services/theming.service';
import { LoginService } from '../Services/login.service';
import { PasswordConfirmedValidatorDirective } from '../directives/password-confirmed.directive';
import { MatIconModule } from '@angular/material/icon';

/**
 * Component to register a new user
 */
@Component({
	selector: 'app-registration',
	templateUrl: './registration.component.html',
	styleUrls: ['./registration.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [FormsModule, PasswordConfirmedValidatorDirective, MatIconModule]
})

export class RegistrationComponent implements OnInit {
	loginService = inject(LoginService);
	private router = inject(Router);
	private notify = inject(NotificationService);
	private themeService = inject(ThemingService);


	/**
     * Error during user creation
     */
	error?: string;

	isDark!:boolean;

	/**
     * @ignore
     */
	ngOnInit() {
		this.isDark = this.themeService.isDarkMode();
	}

	/**
     * Registers a user to Seed-Test and logs user in
     * @param form user form
     */
	async registerUser(form: NgForm){
		try {
			this.error = undefined;
			const _response = await this.loginService.registerUser(form.value.email, form.value.password).toPromise();
			localStorage.setItem('login', 'true');
			this.notify.success('successfully registered', 'Registration');
			const user = {email: form.value.email, password: form.value.password};
			this.loginService.loginUser(user).subscribe({
				// loginUser emits null for an empty login response; that is not a session, so do not navigate
				next: (loggedInUser) => {
					if (loggedInUser) this.router.navigate(['/accountManagement']);
					else this.notify.error('Could not log in after registration. Please log in manually.');
				},
				error: () => this.notify.error('Could not log in after registration. Please log in manually.')
			});
		} catch(err: unknown) {
			const errDetail = (err as { error?: { details?: Array<{ path?: string; message?: string }> } })?.error?.details?.[0];
			const message = errDetail?.path === 'email'
				? 'Invalid email format.'
				: 'User with this email already exists. Please enter another email.';
			this.notify.error(message, 'Registration failed');
		} 
	}

	isDarkModeOn () {
		this.isDark = this.themeService.isDarkMode();
		return this.isDark;
	}
    
}
