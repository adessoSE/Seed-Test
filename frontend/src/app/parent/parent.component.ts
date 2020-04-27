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
  formtosubmit: [""];

  constructor(public apiService: ApiService,
              private router: Router) {
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
  }

  loadStories() {
    const repository = localStorage.getItem('repository');
    const repositorytype = localStorage.getItem('repositoryType');
    if (repositorytype === 'github') {
      this.apiService
          .getStories(repository, this.apiService.getToken())
          .subscribe((resp: Story[]) => {
            this.stories = resp;
            console.log(resp);
          });
    } else {
      this.apiService
          .getIssuesFromJira(localStorage.getItem('jiraHost'), localStorage.getItem('jiraKey'))
          .subscribe((resp: Story[]) => {
            this.stories = resp;
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

  setform(form){
    this.formtosubmit = form;
  }

}
