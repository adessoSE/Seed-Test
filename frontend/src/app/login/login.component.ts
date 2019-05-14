import { Component, OnInit } from '@angular/core';
import {ApiService} from '../Services/api.service'

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  repositories;

  constructor(private apiService: ApiService) { }


  ngOnInit() {
  }

  login(token: string){
    this.apiService.getRepositories(token).subscribe(resp =>{
      this.repositories = resp;
    })
  }

}
