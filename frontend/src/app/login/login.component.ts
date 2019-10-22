import { Component, OnInit, Output } from '@angular/core';
import {ApiService} from '../Services/api.service';
import { Router } from '@angular/router';
import { NgForm} from '@angular/forms';
import { EventEmitter } from 'protractor';
import { JsonPipe } from '@angular/common';

const testAccountName = 'adessoCucumber';
const testAccountToken = '56cc02bcf1e3083f574d14138faa1ff0a6c7b9a1';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  repositories;
  error;

  constructor(private apiService: ApiService,
              private router: Router) { }


  ngOnInit() {
  }

  login(form: NgForm) {
    this.error = undefined;
    this.apiService.getRepositories(form.value.token, form.value.githubName).subscribe((resp) => {
      this.repositories = resp;
      localStorage.setItem('token', form.value.token);
      localStorage.setItem('githubName', form.value.githubName);
    }, (err) => {
      this.error = err.error;
    });
  }

  loginTestAccount() {
    this.error = undefined;
    this.apiService.getRepositories(testAccountToken, testAccountName).subscribe((resp) => {
      this.repositories = resp;
      localStorage.setItem('token', testAccountToken);
      localStorage.setItem('githubName', testAccountName);
    }, (err) => {
      this.error = err.error;
    });
  }

  selectRepository(userRepository: string) {
    localStorage.setItem('repository', userRepository);
    this.router.navigate(['/']);
  }

}
