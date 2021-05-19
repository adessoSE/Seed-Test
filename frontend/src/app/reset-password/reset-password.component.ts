import { Component } from '@angular/core';
import { NgForm } from '@angular/forms';
import {ApiService} from '../Services/api.service';
import {Router} from '@angular/router';
import { RepositoryContainer } from '../model/RepositoryContainer';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})

export class ResetPasswordComponent{

  user = {};
  error: string;
  repositoriesLoading: boolean;
  showInstruction = false;
  repositories: RepositoryContainer[];

  constructor(public apiService: ApiService, private router: Router) {    
  }

  requestReset(form : NgForm) {
    this.apiService.requestReset(form.value.email).subscribe(res => {
      //console.log('test')
    })
    this.router.navigate(['/login']);
  }

  navToRegistration(){
    console.log('navigate to registration')
  }
}
