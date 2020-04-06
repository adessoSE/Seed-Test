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
    let repository = localStorage.getItem('repository');

    this.apiService
      .getStories(repository, this.apiService.getToken())
      .subscribe((resp: Story[]) => {
        this.stories = resp;
      });

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
