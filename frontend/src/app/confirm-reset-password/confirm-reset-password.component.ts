import { Component} from '@angular/core';
import { NgForm } from '@angular/forms';
import {ApiService} from '../Services/api.service';
import {Router} from '@angular/router';

@Component({
  selector: 'app-confirm-reset-password',
  templateUrl: './confirm-reset-password.component.html',
  styleUrls: ['./confirm-reset-password.component.css']
})
export class ConfirmResetPasswordComponent {
 
  uuid: string;
  password: string; 

 
  constructor(public apiService: ApiService, private router: Router) { 
  }

  confirmReset(form : NgForm) {
    this.apiService.confirmReset(form.value.uuid, form.value.password).toPromise()
  }

}
