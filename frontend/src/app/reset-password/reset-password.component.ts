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

  

  navToConfirmReset() {
    this.router.navigate(['/resetpasswordconfirm']);
 }
 

  async resetUserPassword(form: NgForm){
    this.error = undefined;



   
    /* REWRITE
    let response = await this.apiService.resetUserPassword(form.value.email. erased).toPromise()
    if (response.status === 'error') {
        this.error = response.message;
    } else {
        this.router.navigate(["/"]);
    } */

  }

}
