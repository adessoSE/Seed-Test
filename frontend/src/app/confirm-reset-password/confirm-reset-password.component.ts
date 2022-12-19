import { Component} from '@angular/core';
import { NgForm } from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import { LoginService } from '../Services/login.service';

/**
 * Component to enable to reset the password
 */
@Component({
  selector: 'app-confirm-reset-password',
  templateUrl: './confirm-reset-password.component.html',
  styleUrls: ['./confirm-reset-password.component.css']
})

export class ConfirmResetPasswordComponent {
 
  /**
   * Id of the reset password request
   */
  uuid: string;

  /**
   * New Password of the user
   */
  password: string; 

 
  /**
   * Constructor
   * @param loginService
   * @param router 
   * @param route 
   */
  constructor(public loginService: LoginService, private router: Router, private route: ActivatedRoute) {
    this.route.queryParams.subscribe((params) => {
      if (params.uuid){
           this.uuid = params.uuid;
       }
   })
  }

  /**
   * Confirm the reset and send new password
   * @param form form with the new password value
   */
  confirmReset(form : NgForm) {
    this.loginService.confirmReset(this.uuid, form.value.password).toPromise()
    this.router.navigate(['/login']);
  }

}
