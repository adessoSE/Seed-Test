import { Component, OnInit } from '@angular/core';
import { ApiService } from '../Services/api.service';
import { Story } from '../model/Story';
import { Scenario } from '../model/Scenario';
import { RepositoryContainer } from '../model/RepositoryContainer';
import { Router, ActivatedRoute } from '@angular/router';


@Component({
  selector: 'app-parent',
  templateUrl: './parent.component.html',
  styleUrls: ['./parent.component.css']
})
export class ParentComponent implements OnInit {

  stories: Story[];
  selectedStory: Story;
  selectedScenario: Scenario;
  formtosubmit: [""];

  constructor(public apiService: ApiService) {
    this.apiService.getBackendUrlEvent.subscribe(() => {
      this.loadStories();
    });
    if(this.apiService.urlReceived) {
      this.loadStories();
    }else {
      this.apiService.getBackendInfo()
    }
   }

  ngOnInit() {
    console.log('on nginit in parent')
    this.apiService.getRepositories().subscribe();
  }

  loadStories() {
    let value: string = localStorage.getItem('repository');
    let source: string = localStorage.getItem('source');
    let repository: RepositoryContainer = {value, source}
    this.apiService
      .getStories(repository)
      .subscribe((resp: Story[]) => {
        console.log('Stories');
        console.log(resp);
        this.stories = resp;
    });
  }

  setSelectedStory(story: Story){
    this.selectedStory = story;
  }

  setSelectedScenario(scenario: Scenario){
    this.selectedScenario = scenario;
  }

}
