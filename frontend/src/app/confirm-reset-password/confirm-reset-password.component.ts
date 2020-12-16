import { Component, OnInit } from '@angular/core';
import { EmailValidator, NgForm } from '@angular/forms';
import {ApiService} from '../Services/api.service';
import {NavigationEnd, Router} from '@angular/router';
import { from } from 'rxjs';

@Component({
  selector: 'app-confirm-reset-password',
  templateUrl: './confirm-reset-password.component.html',
  styleUrls: ['./confirm-reset-password.component.css']
})
export class ConfirmResetPasswordComponent implements OnInit {
 
  uuid: string;
  password: string; 

 
  constructor(public apiService: ApiService, private router: Router) { 
  }

  ngOnInit() {
  }

  confirmReset(form : NgForm) {
  this.apiService.confirmReset(form.value.uuid, form.value.password).toPromise
  };

}
