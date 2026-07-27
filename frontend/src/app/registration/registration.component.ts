import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import {Router} from '@angular/router';
import { NgForm, FormsModule } from '@angular/forms';
import { NotificationService } from '../Services/notification.service';
import { ThemingService } from '../Services/theming.service';
import { LoginService } from '../Services/login.service';
import { PasswordConfirmedValidatorDirective } from '../directives/password-confirmed.directive';

/**
 * Component to register a new user
 */
@Component({
    selector: 'app-registration',
    templateUrl: './registration.component.html',
    styleUrls: ['./registration.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [FormsModule, PasswordConfirmedValidatorDirective]
})

export class RegistrationComponent implements OnInit {
	loginService = inject(LoginService);
	private router = inject(Router);
	private notify = inject(NotificationService);
	private themeService = inject(ThemingService);


	/**
     * Error during user creation
     */
	error!: string;

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
			const userId = localStorage.getItem('userId');
			localStorage.removeItem('userId');
			this.error = undefined as any;
			const _response = await this.loginService.registerUser(form.value.email, form.value.password, userId).toPromise();
			localStorage.setItem('login', 'true');
			this.notify.success('successfully registered', 'Registration');
			const user = {email: form.value.email, password: form.value.password};
			this.loginService.loginUser(user).subscribe(() => this.router.navigate(['/accountManagement']));
		}  catch(_err) {
           
			this.notify.error('User with this email alredy exist. Please enter another email', 'Email alredy exist');
           
		} 
	}

	isDarkModeOn () {
		this.isDark = this.themeService.isDarkMode();
		return this.isDark;
	}
    
}
