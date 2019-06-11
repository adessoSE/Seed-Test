import { Component } from '@angular/core';
import {ApiService} from './Services/api.service'
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  token: string;
  githubName: string;

  repositories: string[] = [];
  repository: string;
  constructor(private apiService: ApiService, private router: Router){

  }

  ngOnInit(){

    this.refreshLoginData();
  }

  refreshLoginData(){
    this.token = localStorage.getItem('token')
    this.githubName = localStorage.getItem('githubName')

    if(this.token && this.githubName){
      this.getRepositories();
  
    }
    
  }

  ngDoCheck(){
    let newToken = localStorage.getItem('token')
    let newGithubName = localStorage.getItem('githubName')
    
    if(newToken != this.token || newGithubName != this.githubName){
      this.refreshLoginData()
    }
  }

  title = 'cucumber-frontend';

  getRepositories(){
    this.token = localStorage.getItem('token')
    this.githubName = localStorage.getItem('githubName')

    this.apiService.getRepositories(this.token, this.githubName).subscribe((resp: any) =>{
      this.repositories = resp; 
    })
  }


  selectRepository(repository: string){
    
    var ref: HTMLLinkElement = document.getElementById("githubHref") as HTMLLinkElement;
    ref.href = "https://github.com/"+repository
    this.repository = repository;
    localStorage.setItem('repository', repository)
    this.repository = repository;
    this.apiService.getStories(repository).subscribe(resp =>{
      //console.log("Response: " + JSON.stringify(resp));
    })
  }

  logout(){
    localStorage.removeItem('repository');
    localStorage.removeItem('token');
    localStorage.removeItem('githubName');
    this.router.navigate(['/login']);
  }
}
