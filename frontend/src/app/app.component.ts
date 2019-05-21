import { Component } from '@angular/core';
import {ApiService} from './Services/api.service'

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  token;
  githubName;
  loggedIn: boolean = false;
  repositories = [];
  constructor(private apiService: ApiService){

  }

  ngOnInit(){
    this.refreshLoginData();
  }

  refreshLoginData(){
    this.token = localStorage.getItem('token')
    this.githubName = localStorage.getItem('githubName')

    if(this.token && this.githubName){
      this.getRepositories();
      this.loggedIn = true;
    }
    
  }

  ngDoCheck(){
    let newToken = localStorage.getItem('token')
    let newGithubName = localStorage.getItem('githubName')
    if(newToken != this.token || newGithubName != this.githubName){
      this.refreshLoginData()
    }else{
      this.loggedIn = false;
    }
  }

  title = 'cucumber-frontend';

  getRepositories(){
    this.token = localStorage.getItem('token')
    this.githubName = localStorage.getItem('githubName')

    this.apiService.getRepositories(this.token, this.githubName).subscribe((resp: any) =>{
      console.log("Response: " + JSON.stringify(resp));
    
      this.repositories = resp; 
    })
  }


  selectRepository(repository: string){
    localStorage.removeItem('repository');
    localStorage.setItem('repository', repository)
    this.apiService.getStories(repository).subscribe(resp =>{
      //console.log("Response: " + JSON.stringify(resp));
    })
  }
}
