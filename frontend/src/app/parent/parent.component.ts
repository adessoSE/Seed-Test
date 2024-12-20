import { Component, OnDestroy, OnInit } from '@angular/core';
import { ApiService } from '../Services/api.service';
import { Story } from '../model/Story';
import { Scenario } from '../model/Scenario';
import { RepositoryContainer } from '../model/RepositoryContainer';
import { Group } from '../model/Group';
import { ActivatedRoute } from '@angular/router';
import { ThemingService } from '../Services/theming.service';
import { Subscription } from 'rxjs';
import { StoryService } from '../Services/story.service';
import { GroupService } from '../Services/group.service';
import { ProjectService } from '../Services/project.service';


/**
 * Component containing the Story-Bar and Story Editor
 */
@Component({
  selector: 'app-parent',
  templateUrl: './parent.component.html',
  styleUrls: ['./parent.component.css']
})
export class ParentComponent implements OnInit, OnDestroy {

  /**
   * Stories in the selected project
   */
  stories: Story[];

  /**
   * Currently selected story
   */
  selectedStory: Story;

  /**
   * Currently selected Scenario
   */
  selectedScenario: Scenario;

  /**
   * If the story Editor is shown or the report history
   */
  isStoryEditorActive = true;

  /**
   * If currently group test is running
   */
  testRunningForGroup = false;

  groups: Group[]

  report;

  isDark: boolean;

  activeView: string = "storyView";

  /**
     * Subscribtions for all EventEmitter
     */
  getBackendUrlObservable: Subscription;
  themeObservable: Subscription;
  getRepositoriesObservable: Subscription;
  activeViewObservable: Subscription;

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
  }

  /**
   * Requests the repositories on init
   */
  ngOnInit() {
    this.getBackendUrlObservable = this.apiService.getBackendUrlEvent.subscribe(() => {
      this.loadStories();
    });
    if (!sessionStorage.getItem('repositories')) {
      this.getRepositoriesObservable = this.projectService.getRepositories().subscribe(() => {
      });
    }
    this.isDark = this.themeService.isDarkMode();
    this.themeObservable = this.themeService.themeChanged.subscribe((_) => {
      this.isDark = this.themeService.isDarkMode();
    });
    this.activeViewObservable = this.storyService.changeStoryViewEmitter.subscribe((viewName) => {
      this.activeView = viewName;
      console.log("this.activeView", this.activeView, viewName)
    });

    // needs to be after getBackendUrlEvent subscribtion to work properly
    if (this.apiService.urlReceived) {
      this.loadStories();
    } else {
      this.apiService.getBackendInfo();
    }

  }

  ngOnDestroy() {
    if (!this.themeObservable.closed) {
      this.themeObservable.unsubscribe();
    }
    if (!this.getBackendUrlObservable.closed) {
      this.getBackendUrlObservable.unsubscribe();
    }
    if (this.getRepositoriesObservable) {
      if (!this.getRepositoriesObservable.closed) {
        this.getRepositoriesObservable.unsubscribe();
      }
    }
    if (!this.activeViewObservable.closed) {
      this.activeViewObservable.unsubscribe();
    }
  }

  /**
   * Leads the stories of the current selected repository
   */
  loadStories() {
    const value: string = localStorage.getItem('repository');
    const source: string = localStorage.getItem('source');
    const _id: string = localStorage.getItem('id');
    const repository: RepositoryContainer = { value, source, _id };
    this.storyService
      .getStories(repository)
      .subscribe((resp: Story[]) => {
        this.stories = resp;
        this.routing();
      });
    this.groupService
      .getGroups(_id)
      .subscribe((resp: Group[]) => {
        this.groups = resp;
      });
  }

  routing() {
    this.route.paramMap.subscribe(params => {
      if (params.has('story_id')) {
        const story_id = params.get('story_id');
        this.selectedStory = this.stories.find(o => o._id === story_id);
        if (params.has('scenario_id')) {
          const scenario_id = params.get('scenario_id');
          this.setSelectedScenario(this.selectedStory.scenarios.find(o => o.scenario_id.toString() === scenario_id))
        } else {
          this.setSelectedScenario(this.selectedStory.scenarios[0]);
        }
      }
    });
  }

  /**
   * Sets the currently selected story
   * @param story
   */
  setSelectedStory(story: Story) {
    this.selectedStory = story;
  }

  /**
   * Sets the currently selected scenario
   * @param scenario
   */
  setSelectedScenario(scenario: Scenario) {
    this.selectedScenario = scenario;
  }

  /**
   * Sets the currently selected scenario
   * @param scenario
   */
  deselectScenario() {
    this.selectedScenario = undefined;
  }

  /**
   * Change the editor to report history or story editor
   * @param event event
   */
  setEditor() {
    this.isStoryEditorActive = !this.isStoryEditorActive;
  }

  viewReport($event) {
    this.report = $event;
  }

  testRunningGroup($event) {
    this.isStoryEditorActive = true;
    this.testRunningForGroup = $event;
    if (this.testRunningForGroup === true) {
      this.report = false;
    }
  }

}
