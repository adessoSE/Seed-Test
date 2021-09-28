import { Component, Input } from '@angular/core';
import { NgForm } from '@angular/forms';
import {ApiService} from '../Services/api.service';
import {Router} from '@angular/router';
import { RepositoryContainer } from '../model/RepositoryContainer';
import { ThemingService } from '../Services/theming.service';

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

  isDark :boolean = this.themeService.isDarkMode();

  /**
   * @ignore
   */
  constructor(public apiService: ApiService, private router: Router, public themeService:ThemingService) {    
  }

  /**
   * Request a reset of the password
   * @param form 
   */
  requestReset(form : NgForm) {
    this.apiService.requestReset(form.value.email).subscribe(res => {
      //console.log('test')
    })
    this.router.navigate(['/login']);
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
