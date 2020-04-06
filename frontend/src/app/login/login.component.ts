import { Component, OnInit } from '@angular/core';
import {ApiService} from '../Services/api.service';
import { Router } from '@angular/router';
import { NgForm} from '@angular/forms';


@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  repositories: string[];
  error: string;
  private testAccountName = 'adessoCucumber';
  private testAccountToken: string;

  constructor(public apiService: ApiService,
              public router: Router) {
    }

  ngOnInit() {
  }

  login(form: NgForm) {
    this.error = undefined;
    //this.apiService.getRepositories(form.value.token, form.value.githubName).subscribe((resp) => {
    //  this.repositories = resp;
    //  localStorage.setItem('token', form.value.token);
    //  localStorage.setItem('githubName', form.value.githubName);
    //}, (err) => {
      this.apiService.loginUser(form.value.githubName, form.value.token).subscribe((resp) => {
        console.log('login')
        this.router.navigate(['/']);
      }, (err) => {
      this.error = err.error;
    });
  }

  loginTestAccount() {
    this.error = undefined;
    this.apiService.getRepositories(this.testAccountToken, this.testAccountName).subscribe((resp) => {
      this.repositories = resp;
      localStorage.setItem('token', this.testAccountToken);
      localStorage.setItem('githubName', this.testAccountName);
    }, (err) => {
      this.error = err.error;
    });
  }

  selectRepository(userRepository: string) {
    localStorage.setItem('repository', userRepository);
    this.router.navigate(['/']);
  }
}
