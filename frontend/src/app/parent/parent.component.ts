import { Component, OnInit } from '@angular/core';
import { ApiService } from '../Services/api.service';
import { Story } from '../model/Story';
import { Scenario } from '../model/Scenario';

@Component({
  selector: 'app-parent',
  templateUrl: './parent.component.html',
  styleUrls: ['./parent.component.css']
})
export class ParentComponent implements OnInit {

  stories: Story[];
  selectedStory: Story;
  selectedScenario: Scenario;

  constructor(private apiService: ApiService) {
    
   }

  ngOnInit() {
    this.loadStories();
  }

  loadStories() {
    let repository = localStorage.getItem('repository');
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
