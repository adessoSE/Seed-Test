import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import {ApiService} from '../Services/api.service';
import {NavigationEnd, Router} from '@angular/router';
import { RepositoryContainer } from '../model/RepositoryContainer';
import { Observable } from 'rxjs';
import { ConfirmResetPasswordComponent } from '../confirm-reset-password/confirm-reset-password.component';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})

export class ResetPasswordComponent implements OnInit {

  user = {};
  error: string;
  repositoriesLoading: boolean;
  showInstruction = false;
  repositories: RepositoryContainer[];

  constructor(public apiService: ApiService, private router: Router) {    
  }
 
  ngOnInit() {
  }

  requestReset(form : NgForm) {
    console.log('form', form.value.email)
    this.apiService.requestReset(form.value.email).subscribe(res => {
      console.log('test')
    })
    this.router.navigate(['/resetpasswordconfirm']);
  };
}
