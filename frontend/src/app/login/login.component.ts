import { Component, OnInit, Output } from '@angular/core';
import {ApiService} from '../Services/api.service'
import { Router } from "@angular/router";
import { NgForm} from "@angular/forms"
import { EventEmitter } from 'protractor';
@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  repositories;


  constructor(private apiService: ApiService,
              private router: Router) { }


  ngOnInit() {
    
  }

  login(form: NgForm){
    localStorage.setItem('token', form.value.token);
    localStorage.setItem('githubName', form.value.githubName);
    this.apiService.getRepositories(form.value.token, form.value.githubName).subscribe(resp =>{

      this.repositories = resp;
    })
  }

  selectRepository(userRepository: string){
    localStorage.setItem('repository', userRepository)
    this.router.navigate(['/'])
  }

}
