import { Component} from '@angular/core';
import { NgForm } from '@angular/forms';
import {Router} from '@angular/router';
import { ThemingService } from '../Services/theming.service';
import { LoginService } from '../Services/login.service';

/**
 * Component to reset the password
 */
@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})

export class ResetPasswordComponent{

  /**
   * Error during reset password
   */
  error: string;
  defaultErrorMessage = 'Reset password email faild';

  /**
   * Successfully sent email
   */
  success: string;
  defaultSuccessMessage = "Email with password reset link has been send!"

  isDark :boolean = this.themeService.isDarkMode();

  /**
   * @ignore
   */
  constructor(public loginService: LoginService, private router: Router, public themeService:ThemingService) {    
  }

  /**
   * Request a reset of the password
   * @param form 
   */
  requestReset(form : NgForm) {
    this.loginService.requestReset(form.value.email).subscribe({
      next: value => {
        this.error = undefined;
        this.success = this.defaultSuccessMessage;
      },
      error: error => {
        this.success = undefined;
        this.error = this.defaultErrorMessage + ": " + error.error;      
      },
    })
  }

  /**
   * Redirects the user to the register component
   */
  redirectToRegister(){
    this.router.navigate(['/register']);
  }

  isDarkModeOn () {
    this.isDark = this.themeService.isDarkMode();
    return this.isDark
  }

}
