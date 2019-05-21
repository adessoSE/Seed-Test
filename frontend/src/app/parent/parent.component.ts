import { Component, OnInit } from '@angular/core';
import { ApiService } from '../Services/api.service';
import { Story } from '../model/Story';
import { Scenario } from '../model/Scenario';
import { Router } from '@angular/router';


@Component({
  selector: 'app-parent',
  templateUrl: './parent.component.html',
  styleUrls: ['./parent.component.css']
})
export class ParentComponent implements OnInit {

  stories: Story[];
  selectedStory: Story;
  selectedScenario: Scenario;

  constructor(private apiService: ApiService,
              private router: Router) {
    console.log("parent component constructor");

   }

  ngOnInit() {
    console.log("parent component started");

    // let users only use site if they are logged in
    /*let token = localStorage.getItem('token');
    if(!token){
      this.router.navigate(['/login']);
    }*/
    this.loadStories();
  }

  loadStories() {

    let repository = localStorage.getItem('repository');
    console.log("selected Repository: " + repository);
    this.apiService
      .getStories(repository)
      .subscribe((resp: any) => {
        this.stories = resp;
        console.log('controller: stories loaded', this.stories);
      });

  }

  setSelectedStory(story){
    console.log("setSelectedStory");
    this.selectedStory = story;
  }

  setSelectedScenario(scenario){
    console.log("setSelectedScenario");
    this.selectedScenario = scenario;
  }

}
