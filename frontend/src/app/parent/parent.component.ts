import { Component, OnInit } from '@angular/core';
import { ApiService } from '../Services/api.service';

@Component({
  selector: 'app-parent',
  templateUrl: './parent.component.html',
  styleUrls: ['./parent.component.css']
})
export class ParentComponent implements OnInit {

  stories;
  selectedStory;
  selectedScenario;

  constructor(private apiService: ApiService) {
    
   }

  ngOnInit() {
    this.loadStories();
  }

  loadStories() {
    this.apiService
      .getStories()
      .subscribe(resp => {
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
