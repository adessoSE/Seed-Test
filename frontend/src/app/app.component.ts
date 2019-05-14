import { Component } from '@angular/core';
import {ApiService} from './Services/api.service'

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  repositories = [];
  constructor(private apiService: ApiService){

  }

  ngOnInit(){
    this.getRepositories();
  }

  title = 'cucumber-frontend';

  getRepositories(){
    this.apiService.getRepositories().subscribe(resp =>{
      console.log("Response: " + JSON.stringify(resp));
    
      this.repositories = resp; 
    })
  }


  selectRepository(repository: string){
    this.apiService.getStories(repository).subscribe(resp =>{
      //console.log("Response: " + JSON.stringify(resp));
    })
  }
}
