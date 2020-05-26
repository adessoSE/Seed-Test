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
    const repository = localStorage.getItem('repository');
    const source = localStorage.getItem('source');
    if (source === 'github') {
      this.apiService
          .getStories(repository)
          .subscribe((resp: Story[]) => {
            this.stories = resp;
          });
    } else {
      this.apiService
          .getIssuesFromJira(localStorage.getItem('jiraKey'))
          .subscribe((resp: Story[]) => {
            this.stories = resp;
            console.log('Jira Response');
            console.log(resp);
          });
    }
  }

  setSelectedStory(story: Story){
    this.selectedStory = story;
  }

  setSelectedScenario(scenario: Scenario){
    this.selectedScenario = scenario;
  }

}
