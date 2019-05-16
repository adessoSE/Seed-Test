import { Component, OnInit } from '@angular/core';
import {ApiService} from '../Services/api.service'
import { Router } from "@angular/router";
import { NgForm} from "@angular/forms"
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
    console.log("type of form: " + typeof(form));
    localStorage.setItem('token', form.value.token);
    localStorage.setItem('githubName', form.value.githubName);
    this.apiService.getRepositories(form.value.token).subscribe(resp =>{

      this.repositories = resp;
    })
  }

  selectRepository(repository: string){
    localStorage.setItem('repository', repository)
    this.router.navigate([''])
  }

}
