import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import {ApiService} from '../Services/api.service';
import { Story } from '../model/Story';
import { Scenario } from '../model/Scenario';

@Component({
  selector: 'app-stories-bar',
  templateUrl: './stories-bar.component.html',
  styleUrls: ['./stories-bar.component.css']
})
export class StoriesBarComponent implements OnInit {

  stories: Story[];
  selectedStory: Story;
  selectedScenario: Scenario;

  @Output()
  storyChosen: EventEmitter<any> = new EventEmitter();
  @Output()
  scenarioChosen: EventEmitter<any> = new EventEmitter();

  constructor(public apiService: ApiService) {
    this.apiService.getStoriesEvent.subscribe(stories => {
      this.stories = stories;
    } );
  }

  ngOnInit() {
  }


  getSortedStories() {
    if (this.stories) {
      return this.stories.sort(function(a, b) { return a.issue_number - b.issue_number; });
    }
  }

  selectScenario(storyID, scenario: Scenario) {
    this.selectedScenario = scenario;
    this.scenarioChosen.emit(scenario);
  }


  selectStoryScenario(story: Story) {
    console.log(story.lastTestPassed)

    this.selectedStory = story;
    this.storyChosen.emit(story);
    const storyIndex = this.stories.indexOf(this.selectedStory);
    if (this.stories[storyIndex].scenarios[0]) {
      this.selectScenario(this.selectedStory.story_id, this.stories[storyIndex].scenarios[0]);
    }
  }
}
