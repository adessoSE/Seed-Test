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

  async login(form: NgForm) {
    this.error = undefined;
    //this.apiService.getRepositories(form.value.token, form.value.githubName).subscribe((resp) => {
    //  this.repositories = resp;
    //  localStorage.setItem('token', form.value.token);
    //  localStorage.setItem('githubName', form.value.githubName);
    //}, (err) => {
      let user = await this.apiService.loginUser(form.value.email, form.value.password).toPromise()
      this.apiService.getRepositories().subscribe((resp) => {
        this.repositories = resp;
      }, (err) => {
        this.error = err.error;
      });

  }

  async loginTestAccount() {
    this.error = undefined;
    //this.apiService.getRepositories(this.testAccountToken, this.testAccountName).subscribe((resp) => {
    //  this.repositories = resp;
    //  localStorage.setItem('token', this.testAccountToken);
    //  localStorage.setItem('githubName', this.testAccountName);
    let user = await this.apiService.loginUser(null, null).toPromise()
      this.apiService.getRepositories().subscribe((resp) => {
        this.repositories = resp;
      }, (err) => {
        this.error = err.error;
      });
  }

  selectRepository(userRepository: string) {
    localStorage.setItem('repository', userRepository);
    this.router.navigate(['/']);
  }
}
