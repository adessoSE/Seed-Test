import { EventEmitter, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../Services/api.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { Story } from '../model/Story';
import { RepositoryContainer } from '../model/RepositoryContainer';
import { catchError, tap } from 'rxjs/operators';
import { StepType } from '../model/StepType';

/**
 * Service for communication between story component and the backend
 */
@Injectable({
  providedIn: 'root'
})
export class StoryService {

  constructor(public apiService: ApiService, private http: HttpClient, public toastr: ToastrService) { }
  /**
  * Event Emitter to distribute the stories to all components
  */
  public getStoriesEvent = new EventEmitter();
  /*
  * Event emitter to rename the story
  */
  public renameStoryEvent = new EventEmitter();
  /*
  * Event emitter to delete the story
  */
  public deleteStoryEvent = new EventEmitter();
  /*
  * Event emitter to create a custom story
  */
  public createCustomStoryEmitter: EventEmitter<any> = new EventEmitter();
  /*
  * Event emitter to change the active story view
  */
  public changeStoryViewEmitter: EventEmitter<any> = new EventEmitter();
  /*
  * Event emitter to rename the description
  */
  public renameDescriptionEvent = new EventEmitter();
  /*
  * Emits the delete story event
  */
  public deleteStoryEmitter() {
    this.deleteStoryEvent.emit();
  }

  /**
  * Emits the change the active view
  * @param viewName
  */
  changeStoryViewEvent(viewName) {
    this.changeStoryViewEmitter.emit(viewName);
  }

  /**
  * Emits the rename story event
  * @param newStoryTitle
  * @param newStoryDescription
  */
  renameStoryEmit(newStoryTitle, newStoryDescription) {
    const val = { newStoryTitle, newStoryDescription };
    this.renameStoryEvent.emit(val);
  }
  /**
  * Emits the create custom story event
  * @param story
  */
  createCustomStoryEvent(story) {
    this.createCustomStoryEmitter.emit(story);
  }
  /**
    * Get's single Story by ID
    * @param _id storyID
    * @return single Story object
  */
  public getStory(_id): Observable<any> {
    return this.http
      .get<Story>(this.apiService.apiServer + '/story/' + _id, ApiService.getOptions())
      .pipe(tap(_ => {
        //
      }));
  }
  /**
    * Creates a story
    * @param title
    * @param description
    * @param repository
    * @param _id id of the repository
    * @returns
  */
  public createStory(title: string, description: string, repository: string, _id: string): Observable<any> {
    const body = { 'title': title, 'description': description, 'repo': repository, '_id': _id };
    return this.http
      .post<Story>(this.apiService.apiServer + '/story/', body, ApiService.getOptions())
      .pipe(tap(_ => {
        //
      }));
  }
  /**
    * updates a Story
    * @param story updatedStory
  */
  public updateStory(story: Story): Observable<any> {
    return this.http
      .put<Story>(this.apiService.apiServer + '/story/' + story._id, story, ApiService.getOptions())
      .pipe(tap(_ => {
        //
      }));
  }
  /**
    * deletes a Story
    * @param repository Specifies the repository where a Story should be deleted
    * @param _id StoryID
  */
  public deleteStory(repository, _id): Observable<any> {
    return this.http
      .delete<any>(this.apiService.apiServer + '/story/' + repository + '/' + _id, ApiService.getOptions())
      .pipe(tap());
  }
  /**
    * Retrieves the stories
    * @param repository
    * @returns
  */
  getStories(repository: RepositoryContainer): Observable<Story[]> {
    let params;
    if (repository.source === 'github') {
      const repo = repository.value.split('/');
      params = { repoName: repository.value, githubName: repo[0], repository: repo[1], source: repository.source, id: repository._id };
    } else if (repository.source === 'jira') {
      params = { projectKey: repository.value, source: repository.source, id: repository._id };
    } else if (repository.source === 'db') {
      params = { repoName: repository.value, source: repository.source, id: repository._id };
    }

    return this.http
      .get<Story[]>(this.apiService.apiServer + '/user/stories/', { params, withCredentials: true })
      .pipe(tap(resp => {
        this.getStoriesEvent.emit(resp);
      }), catchError(this.apiService.handleStoryError));
  }
  /**
   * Updating story list (only affects repo)
   * @param repo_id
   * @param storiesList
   * @returns
  */
  updateStoryList(repo_id, storiesList) {
    return this.http
      .put(this.apiService.apiServer + '/user/stories/' + repo_id, storiesList, ApiService.getOptions())
      .pipe(tap());
  }
  /**
   * Runs a test of a scenario or story
   * @param storyID
   * @param scenarioID
   * @param params
   * @returns
  */
  runTests(storyID: any, scenarioID: number, params) {
    const timeout = 900000;
    if (scenarioID) {
      return this.http
        .post(this.apiService.apiServer + '/run/Scenario/' + storyID + '/' + scenarioID, params, { withCredentials: true, headers: new HttpHeaders({ timeout: `${timeout}` }) });
    }
    return this.http
      .post(this.apiService.apiServer + '/run/Feature/' + storyID, params, { withCredentials: true, headers: new HttpHeaders({ timeout: `${timeout}` }) });
  }
  /**
    * Download a file with story feature
    * @param _id
    * @returns
  */
  downloadStoryFeatureFile(_id): Observable<Blob> {
    return this.http
      .get<Blob>(this.apiService.apiServer + '/story/download/story/' + _id, { withCredentials: true, responseType: 'blob' as 'json' });
  }

  /**
    * Checkbox with executes all scenarios consecutively in one single Browser session.
    * @param oneDriver
    * @param storyID
    * @returns
  */
  public changeOneDriver(oneDriver: boolean, storyID: any) {
    return this.http
      .post(this.apiService.apiServer + '/story/oneDriver/' + storyID, { oneDriver }, ApiService.getOptions());
  }
  /**
    * Checking the same name of the story
    * @param buttonId
    * @param input
    * @param array
    * @param story?
    * @returns
  */
  public storyUnique(buttonId: string, input: string, array: Story[], story?: Story) {
    array = array ? array : [];
    input = input ? input : '';
    const button = (document.getElementById(buttonId)) as HTMLButtonElement;
    if ((input && !array.find(i => i.title === input)) || (story ? array.find(g => g._id === story._id && g.title === input) : false)) {
      button.disabled = false;
    } else {
      button.disabled = true;
      this.toastr.error('This Story Title is already in use. Please choose another Title');
    }
  }
  /**
   * Retrieves the step types
   * @returns
   */
  getStepTypes(): Observable<StepType[]> {
    return this.http
      .get<StepType[]>(this.apiService.apiServer + '/stepTypes', ApiService.getOptions())
      .pipe(tap(_ => {
        //
      }));
  }
  /**
    * Redirecting to Jira/GitHub ticket directly
    * @param storyId
    * @param repository
    * @returns
  */
  public goToTicket(storyId: string, repository: RepositoryContainer) {
    if (repository.source === 'github') {
      const AUTHORIZE_URL = 'https://github.com/' + repository.value + '/issues/';
      console.log("AUTHORIZE_UR", AUTHORIZE_URL)
      const s = `${AUTHORIZE_URL}${storyId}`;
      return window.open(s);
    } else if (repository.source === 'jira') {
      const AUTHORIZE_URL = 'https://jira.adesso.de/browse/';
      const s = `${AUTHORIZE_URL}${storyId}`;
      return window.open(s);
    }
  }
}
