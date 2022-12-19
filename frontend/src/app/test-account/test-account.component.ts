import { Component, OnInit } from '@angular/core';
import { ParentComponent } from '../parent/parent.component';
import { Story } from '../model/Story';
import { RepositoryContainer } from '../model/RepositoryContainer';
import {ActivatedRoute} from "@angular/router";
import { ThemingService } from '../Services/theming.service';
import { StoryService } from '../Services/story.service';
import { ApiService } from '../Services/api.service';
import { GroupService } from '../Services/group.service';
import { ProjectService } from '../Services/project.service';


/**
 * Component of the TestAccountComponent
 */
@Component({
  selector: 'app-test-account',
  templateUrl: '../parent/parent.component.html',
  styleUrls: ['../parent/parent.component.css']
})
export class TestAccountComponent extends ParentComponent implements OnInit {

  /**
   * Constructor
   * @param apiService 
   * @param route 
   * @param themeService 
   * @param storyService 
   * @param groupService 
   * @param projectService 
   */
  constructor(public apiService: ApiService,
      public route: ActivatedRoute,
      public themeService: ThemingService,
      public storyService: StoryService,
      public groupService: GroupService,
      public projectService: ProjectService,
    ) {
    super(apiService, route, themeService, storyService, groupService, projectService);
    this.loadStories()
  }

  /**
   * @ignore
   */
  ngOnInit() {}

  /**
   * Loads the stories from the test account
   */
  loadStories() {
    let repository: RepositoryContainer = {value: '', source: 'testaccount'}
    this.storyService
        .getStories(repository)
        .subscribe((resp: Story[]) => {
          this.stories = resp;
          console.log(resp);
    });
  }
}
