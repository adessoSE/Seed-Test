import {EventEmitter, Injectable} from '@angular/core';
import {catchError, tap} from 'rxjs/operators';
import {HttpClient, HttpErrorResponse, HttpHeaders} from '@angular/common/http';
import {Story} from '../model/Story';
import {Observable, of, throwError} from 'rxjs';
import {StepType} from '../model/StepType';
import {Scenario} from '../model/Scenario';
import {Background} from '../model/Background';
import {User} from '../model/User';
import {RepositoryContainer} from '../model/RepositoryContainer';
import { Block } from '../model/Block';
import {Group} from '../model/Group';
import { ToastrService } from 'ngx-toastr';
import { isNull } from '@angular/compiler/src/output/output_ast';


/**
 * Service to communicate between components and the backend
 */
@Injectable({
    providedIn: 'root'
})

export class ApiService {


    /**
     * @ignore
     */
    constructor(private http: HttpClient, private toastr: ToastrService) {
    }

    /**
     * url of the backend
     */
    public apiServer: string = localStorage.getItem('url_backend');

    /**
     * If the backend url was received
     */
    public urlReceived = false;

    /**
     * Event Emitter if the stories could not be retrieved
     */
    public storiesErrorEvent = new EventEmitter();

    /**
     * Event Emitter to distribute the stories to all components
     */
    public getStoriesEvent = new EventEmitter();

    /**
     * Event Emitter to signal that the backend url is available
     */
    public getBackendUrlEvent = new EventEmitter();

    /**
     * Event Emitter to distribute the repositories to all components
     */
    public getRepositoriesEvent = new EventEmitter();

    /**
     * Event emitter to save the story / scenario and then run the test
     */
    public runSaveOptionEvent = new EventEmitter();

    /**
     * Event emitter to add a block to the current scenario
     */
    public addBlockToScenarioEvent = new EventEmitter();

    /**
     * Event emitter to logout the user
     */
    public logoutEvent = new EventEmitter();

    /**
     * Event emitter to rename the scenario
     */
    public renameScenarioEvent = new EventEmitter();

     /**
     * Event emitter to rename the story
     */
    public renameStoryEvent = new EventEmitter();

    /**
     * Event emitter to rename the project
     */
    public renameProjectEvent = new EventEmitter();

    /**
     * Event emitter to rename the description
     */
    public renameDescriptionEvent = new EventEmitter();

    /**
     * Event emitter to delete the scenario
     */
    public deleteScenarioEvent = new EventEmitter();

     /**
     * Event emitter to delete the story
     */
    public deleteStoryEvent = new EventEmitter();

    /**
     * Event emitter to delete the repository
     */
    public deleteRepositoryEvent = new EventEmitter();

    /**
     * Event emitter to reload scenario status
     */
    public scenarioStatusChangeEvent = new EventEmitter();

    /**
     * Event emitter to create a custom story
     */
    public createCustomStoryEmitter: EventEmitter<any> = new EventEmitter();

    public createRepositoryEmitter: EventEmitter<any> = new EventEmitter();

    public createCustomGroupEmitter: EventEmitter<any> = new EventEmitter();

    public updateGroupEmitter: EventEmitter<any> = new EventEmitter();

    public deleteGroupEmitter: EventEmitter<any> = new EventEmitter();

    public updateRepositoryEvent: EventEmitter<any> = new EventEmitter();

    public updateBlocksEvent: EventEmitter<any> = new EventEmitter();

    public renameBackgroundEvent: EventEmitter<string> = new EventEmitter();
 
    createRepositoryEvent(repository) {
        this.createRepositoryEmitter.emit(repository);
    }

    /**
     * Gets api headers
     * @returns
     */
    public static getOptions() {
        return { withCredentials: true };
    }

    /**
     * Handles http error
     * @param error
     * @returns
     */
    static handleError(error: HttpErrorResponse) {
        console.log(JSON.stringify(error));
        //window.location.replace("/login")
        return throwError(() => error);
    }

    /**
     * Emits the run save option
     * @param option
     */
    public runSaveOption(option: string) {
        this.runSaveOptionEvent.emit(option);
    }

    /**
     * Emits the delete scenario event
     */
    public deleteScenarioEmitter() {
        this.deleteScenarioEvent.emit();
    }

     /**
     * Emits the delete story event
     */
    public deleteStoryEmitter() {
        this.deleteStoryEvent.emit();
    }

    /**
      * Emits the delete repository event
      */
    public deleteRepositoryEmitter() {
        this.deleteRepositoryEvent.emit();
    }

    /**
     * Emits if repositories changed
     */
    public updateRepositoryEmitter() {
        this.updateRepositoryEvent.emit();
    }

    /**
     * Emits if repositories should be reloaded
     */
     public getRepositoriesEmitter() {
        this.getRepositoriesEvent.emit();
    }

    /**
     * Emits the rename scenario event
     * @param newTitle
     */
    renameScenarioEmit(newTitle) {
        this.renameScenarioEvent.emit(newTitle);
    }

    /**
     * Emits the rename story event
     * @param newStoryTitle
     * @param newStoryDescription
     */
     renameStoryEmit(newStoryTitle, newStoryDescription) {
        const val = {newStoryTitle, newStoryDescription};
        this.renameStoryEvent.emit(val);
    }

    renameBackgroundEmit(newBackgroundName) {
        const val = newBackgroundName;
        this.renameBackgroundEvent.emit(val);
    }

    /**
     * Emits the rename project event
     * @param newTitel
     * @param proj
     */
    renameProjectEmitter(proj: RepositoryContainer) {
        this.renameProjectEvent.emit(proj);
    }

    /**
     * Emits the scenario status change event
     * @param storyId id of the story
     * @param scenarioId id of the scenario thats changed
     * @param lastTestPassed value status changed to
     */
    scenarioStatusChangeEmit(storyId, scenarioId, lastTestPassed) {
        const val = {storyId: storyId, scenarioId: scenarioId, lastTestPassed: lastTestPassed};
        this.scenarioStatusChangeEvent.emit(val);
    }

    /**
     * Retrieves the blocks
     * @param repoId id of the project of the blocks
     * @returns
     */
    getBlocks(repoId: string): Observable<Block[]> {
        const str = this.apiServer + '/mongo/getBlocks/' + repoId;
        return this.http.get<Block[]>(str,  ApiService.getOptions())
        .pipe(tap(_ => {
            //
        }),
        catchError(ApiService.handleError));
    }

    /**
     * Emits the add block to scenario event
     * @param block
     * @param correspondingComponent
     */
    addBlockToScenario(block: Block, correspondingComponent: string) {
        this.addBlockToScenarioEvent.emit([correspondingComponent, block]);
    }

    /**
     * Starts the github login
     */
    public githubLogin() {
        const scope = 'repo';
        const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
        const s = `${AUTHORIZE_URL}?scope=${scope}&client_id=${localStorage.getItem('clientId')}`;
        window.location.href = s;
    }

    /**
     * Returns the callback from github to the backend
     * @param code
     * @returns
     */
    githubCallback(code: string): Observable<any> {
        this.apiServer = localStorage.getItem('url_backend');
        const url = this.apiServer + '/user/callback?code=' + code;
        return this.http.get(url, {withCredentials: true})
            .pipe(tap(_ => {
                //
            }),
            catchError(ApiService.handleError));
    }

    /**
     * Retrieves a report
     * @param reportId
     * @returns
     */
    getReport(reportId: string) {
        this.apiServer = localStorage.getItem('url_backend');
        if (this.apiServer) {
            const str = this.apiServer + '/mongo/report/' + reportId;
            return this.http.get(str,  { responseType: 'json', withCredentials: true})
                .pipe(tap(resp => {
                    console.log('Got single Report: ' + resp);
                  }),
                catchError(ApiService.handleError));
        }
    }

    /**
     * Retrieves a report
     * @param reportName: name of the Report
     * @returns
     */
    getReportByName(reportName: string) {
        this.apiServer = localStorage.getItem('url_backend');
        if (this.apiServer) {
            const str = this.apiServer + '/run/report/' + reportName;
            return this.http.get(str,  { responseType: 'json', withCredentials: true})
              .pipe(tap(_ => {
                    // console.log('Got single Report by Name: ' + resp);
                }),
                catchError(ApiService.handleError));
        }
    }

    /**
     * Deletes a block
     * @param blockId
     * @returns
     */
    deleteBlock(blockId: string) {
        const str = this.apiServer + '/mongo/deleteBlock/' + blockId;
        return this.http.delete<any>(str, ApiService.getOptions())
        .pipe(tap(_ => {
            //
        }),
          catchError(ApiService.handleError));
    }

    /**
     * Retrieves the repositories
     * @returns
     */
    getRepositories(): Observable<RepositoryContainer[]> {
        this.apiServer = localStorage.getItem('url_backend');

        const str = this.apiServer + '/user/repositories';

        return this.http.get<RepositoryContainer[]>(str, ApiService.getOptions())
          .pipe(tap(resp => {
            sessionStorage.setItem('repositories', JSON.stringify(resp));
            this.updateRepositoryEmitter();
          }),
            catchError(ApiService.handleError));
    }

    /**
     * Delete one Repository
     * @param repo
     * @param user
     * @returns
     */
    deleteRepository(repo: RepositoryContainer, user) {
        this.apiServer = localStorage.getItem('url_backend');
        const str = this.apiServer + '/user/repositories/' + repo._id + '/' + user;
        return this.http.delete<any>(str, ApiService.getOptions())
        .pipe(tap(() => {
            //
        }),
          catchError(ApiService.handleError));
    }

    /**
     * Disconnects the user from github
     * @returns
     */
    disconnectGithub() {
        const str = this.apiServer + '/github/disconnectGithub';
        return this.http.delete<any>(str, ApiService.getOptions())
        .pipe(tap(_ => {
            //
        }),
          catchError(ApiService.handleError));
    }

    /**
     * Loggs in the user with a github token
     * @param login
     * @param id
     * @returns
     */
    loginGithubToken(login: string, id): Observable<any> {
        this.apiServer = localStorage.getItem('url_backend');
        const str = this.apiServer + '/user/githubLogin';
        const user = {login, id};

        return this.http.post<any>(str, user, ApiService.getOptions())
          .pipe(tap(_ => {
            //
          }),
            catchError(ApiService.handleError));
    }

    /**
     * Loggs in a user
     * @param email
     * @param password
     * @param stayLoggedIn
     * @returns
     */
    loginUser(user): Observable<any> {
        this.apiServer = localStorage.getItem('url_backend');
        const str = this.apiServer + '/user/login';

        return this.http.post<any>(str, user, ApiService.getOptions())
          .pipe(tap(_ => {
            //
          }),
            catchError(ApiService.handleError));
    }

    /**
     * Loggs in the user into jira
     * @param jiraName
     * @param jiraPassword
     * @param jiraServer
     * @returns
     */
    jiraLogin(jiraName: string, jiraPassword: string, jiraServer: string) {
        this.apiServer = localStorage.getItem('url_backend');
        const body = {  jiraAccountName: jiraName,
                            jiraPassword: jiraPassword,
                            jiraServer: jiraServer};
        return this.http.post(this.apiServer + '/jira/login', body, ApiService.getOptions())
            .pipe(tap(resp => {
                localStorage.setItem('JiraSession', resp.toString());
            }));
    }

    /**
     * Creates a new repository / project
     * @param name
     * @returns
     */
    createRepository(name: string, _id: string): Observable<any> {
        this.apiServer = localStorage.getItem('url_backend');
        console.log(this.apiServer);
        const body = {'name' : name,'_id': _id};
        return this.http
            .post<RepositoryContainer>(this.apiServer + '/mongo/createRepository/', body, ApiService.getOptions())
            .pipe(tap(_ => {
                //
            }));
    }

    /**
     * Updates repo
     *
     * @param repoID
     * @param newRepoName
     * @param user
     * @returns
     */
    public updateRepository(repoID, newRepoName: string, user: any): Observable<any> {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .put<RepositoryContainer>(this.apiServer + '/user/repository/' + repoID + '/' + user, {repoName: newRepoName}, ApiService.getOptions())
            .pipe(tap(_ => {
                // console.log('Update repo ' + repoID + '!', resp)
            }));

    }

    /**
     * Get's single Story by ID
     * @param _id storyID
     * @param source repoSource
     * @return single Story object
     */
    public getStory(_id, source): Observable<any> {
        this.apiServer = localStorage.getItem('url_backend');

        return this.http
            .get<Story>(this.apiServer + '/story/' + _id + '/' + source, ApiService.getOptions())
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
        this.apiServer = localStorage.getItem('url_backend');
        const body = {'title': title, 'description': description, 'repo': repository, '_id': _id};
        return this.http
            .post<Story>(this.apiServer + '/story/', body, ApiService.getOptions())
            .pipe(tap(_ => {
                //
            }));
    }

    /**
     * updates a Story
     * @param story updatedStory
     */
    public updateStory(story: Story): Observable<any> {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .put<Story>(this.apiServer + '/story/' + story._id, story, ApiService.getOptions())
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
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .delete<any>(this.apiServer + '/story/' + repository + '/' + _id,  ApiService.getOptions())
            .pipe(tap());
    }

    public updateScenarioList(story_id, source, scenario_list: Scenario[]): Observable<any> {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .patch(this.apiServer + '/story/' + story_id + '/' + source, scenario_list, ApiService.getOptions())
            .pipe(tap(_ => {
                //
            }));
    }

    /**
     * Requests a password request
     * @param email
     * @returns
     */
  public requestReset(email: string): Observable <any> {
        this.apiServer = localStorage.getItem('url_backend');
        const body = {'email' : email};
        return this.http
            .post<any>(this.apiServer + '/user/resetpassword/', body)
            .pipe(tap(_ => {
                //
            }));
    }

    /**
     * Changes the old password with the new password
     * @param uuid
     * @param password
     * @returns
     */
    confirmReset(uuid: string, password: string): Observable <any> {
        this.apiServer = localStorage.getItem('url_backend');
        const body = {'uuid' : uuid, 'password' : password};
        return this.http
            .patch<any>(this.apiServer + '/user/reset', body)
            .pipe(tap(_ => {
                //
            }));
    }


    /**
     * Adds a user to a workgroup
     * @param _id
     * @param user
     * @returns
     */
    addToWorkgroup(_id: string, user) {
        return this.http
        .post<any>(this.apiServer + '/workgroups/wgmembers/' + _id, user, ApiService.getOptions())
        .pipe(tap(_ => {
            //
        }));
    }

    /**
     * Updates a user in a workgroup
     * @param _id
     * @param user
     * @returns
     */
    updateWorkgroupUser(_id: string, user) {
        return this.http
        .put<any>(this.apiServer + '/workgroups/wgmembers/' + _id, user, ApiService.getOptions())
        .pipe(tap(_ => {
            //
        }));
    }

    /**
     * Retrieves a workgroup
     * @param _id
     * @returns
     */
    getWorkgroup(_id: string) {
        return this.http
        .get<any>(this.apiServer + '/workgroups/wgmembers/' + _id, ApiService.getOptions())
        .pipe(tap(_ => {
            //
        }));
    }

    /**
     * Removes a user from a workgroup
     * @param _id
     * @param email
     * @returns
     */
    removeFromWorkgroup(_id: string, email: string) {
        const user = {email};
        return this.http
        .post<any>(this.apiServer + '/workgroups/deletemember/' + _id, user, ApiService.getOptions())
        .pipe(tap(_ => {
            //
        }));
    }

    /**
     * Saves a new block
     * @param block
     * @returns
     */
    saveBlock(block: Block) {
        return this.http
        .post<any>(this.apiServer + '/mongo/saveBlock', block, ApiService.getOptions())
        .pipe(tap(_ => {
            //
        }));
    }

    /**
     * Logs out the user
     * @returns
     */
    logoutUser() {
        const url = this.apiServer + '/user/logout';
        localStorage.removeItem('login');
        return  this.http.get<string[]>(url, ApiService.getOptions())
          .pipe(tap(_ => {
              //
          }),
            catchError(ApiService.handleError));
    }

    /**
     * Handles the error from retrieve stories
     * @param error
     * @param caught
     * @returns
     */
    handleStoryError = (_error: HttpErrorResponse, _caught: Observable<any>) => {
        this.storiesErrorEvent.emit();
        return of([]);
    }

    /**
     * Emits the create custom story event
     * @param story
     */
    createCustomStoryEvent(story) {
        this.createCustomStoryEmitter.emit(story);
    }

    /**
     * Emits the create group event
     * @param group
     */
    createGroupEvent(group) {
        this.createCustomGroupEmitter.emit(group);
    }

    /**
     * Emitts the create group event
     * @param group
     */
    updateGroupEvent(group) {
        this.updateGroupEmitter.emit(group);
    }

    /**
     * Emits the delete scenario event
     */
    public deleteGroupEvent(values) {
        this.deleteGroupEmitter.emit(values);
    }

    /**
     * Retrieves the backend info for all api request necessary
     * @returns
     */
    getBackendInfo(): Promise<any> {
        const url = localStorage.getItem('url_backend');
        const clientId = localStorage.getItem('clientId');
        const version = localStorage.getItem('version');
        const gecko_enabled = localStorage.getItem('gecko_enabled')
        const chromium_enabled = localStorage.getItem('chromium_enabled')
        const edge_enabled = localStorage.getItem('edge_enabled')

        if (url && url !== 'undefined' && clientId && clientId !== 'undefined' && version && version !== 'undefined' &&
                gecko_enabled && gecko_enabled !== 'undefined' && chromium_enabled && chromium_enabled !== 'undefined' && 
                edge_enabled && edge_enabled !== 'undefined') {
            this.urlReceived = true;
            this.getBackendUrlEvent.emit();
            return Promise.resolve(url);
        } else {

        return this.http.get<any>(window.location.origin + '/backendInfo', ApiService.getOptions()).toPromise().then((backendInfo) => {
             localStorage.setItem('url_backend', backendInfo.url);
             localStorage.setItem('clientId', backendInfo.clientId);
             localStorage.setItem('version', backendInfo.version);
             localStorage.setItem('gecko_enabled', backendInfo.gecko_enabled);
             localStorage.setItem('chromium_enabled', backendInfo.chromium_enabled);
             localStorage.setItem('edge_enabled', backendInfo.edge_enabled)
             this.getBackendUrlEvent.emit();
         });
        }
    }

    /**
     * Retrieves the stories
     * @param repository
     * @returns
     */
    getStories(repository: RepositoryContainer): Observable<Story[]> {
        this.apiServer = localStorage.getItem('url_backend');
        let params;
        if (repository.source === 'github') {
            const repo = repository.value.split('/');
            params = { repoName: repository.value, githubName: repo[0], repository: repo[1], source: repository.source, id: repository._id};
        } else if (repository.source === 'jira') {
            params = {projectKey: repository.value, source: repository.source, id: repository._id};
        } else if (repository.source === 'db') {
            params = {repoName: repository.value, source: repository.source, id: repository._id};
        }

        return this.http
            .get<Story[]>(this.apiServer + '/user/stories/', {params, withCredentials: true})
            .pipe(tap(resp => {
                this.getStoriesEvent.emit(resp);
            }), catchError(this.handleStoryError));
    }

    // only affects repo
    updateStoryList(repo_id, storiesList) {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .put(this.apiServer + '/user/stories/' + repo_id , storiesList, ApiService.getOptions())
            .pipe(tap());
    }

    /**
     * Creates a jira account
     * @param request
     * @returns
     */
    createJiraAccount(request) {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .post<any>(this.apiServer + '/jira/user/create/', request, ApiService.getOptions())
            .pipe(tap());
    }

    /**
     * Retrieves the step types
     * @returns
     */
    getStepTypes(): Observable<StepType[]> {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .get<StepType[]>(this.apiServer + '/mongo/stepTypes', ApiService.getOptions())
            .pipe(tap(_ => {
                //
            }));
    }

    /**
     * Registers a user for a seed-test account
     * @param email
     * @param password
     * @param userId
     * @returns
     */
    registerUser(email: string, password: string, userId: any): Observable<any> {
        const user = {email, password, userId};
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .post<any>(this.apiServer + '/user/register', user)
            .pipe(tap(_ => {
                //
            }), catchError(err => {
                return new Observable(subscriber => {
                    subscriber.next(err);
                    subscriber.complete();
                });
            }));
    }

    /**
     * Updates a user
     * @param userID
     * @param user
     * @returns
     */
    updateUser(userID: string, user: User): Observable<User> {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .post<User>(this.apiServer + '/mongo/user/update/' + userID, user)
            .pipe(tap(_ => {
                //
            }), catchError(this.handleStoryError));
    }

    /**
     * Deletes a seed-test user
     * @returns
     */
    deleteUser() {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .delete<any>(this.apiServer + '/mongo/user/delete', ApiService.getOptions())
            .pipe(tap(_ => {
                //
            }), catchError(this.handleStoryError));
    }

    /**
     * Merges Seed-Test account and github account
     * @param userId
     * @param login
     * @param id
     * @returns
     */
    mergeAccountGithub(userId: string, login: string, id: any) {
        const str = this.apiServer + '/user/mergeGithub';
        const body = {userId, login, id};

        return this.http.post<any>(str, body, ApiService.getOptions())
        .pipe(tap(_ => {
            //
        }),
          catchError(ApiService.handleError));
    }

    /**
     * Retrieves data of the user
     * @returns
     */
    getUserData(): Observable<User> {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .get<User>(this.apiServer + '/mongo/user/', ApiService.getOptions())
            .pipe(tap(_ => {
                //
            }), catchError(this.handleStoryError));
    }

    /**
     * Adds a Scenario
     * @param storyID
     * @param storySource
     * @param scenarioTitle
     * @returns
     */
    addScenario(storyID: any, storySource: string, scenarioTitle: string): Observable<Scenario> {
        this.apiServer = localStorage.getItem('url_backend');
        const body = {'name' : scenarioTitle};
        return this.http
            .post<any>(this.apiServer + '/story/' + storyID + '/' + storySource, body, ApiService.getOptions())
            .pipe(tap(resp => {
                console.log('Add new scenario in story ' + storyID + '!', resp);
            }));
    }

    public addFirstScenario(storyID, storySource: string): Observable<Scenario> {
        this.apiServer = localStorage.getItem('url_backend');

        return this.http
            .get<any>(this.apiServer + '/mongo/scenario/add/' + storyID + '/' + storySource, ApiService.getOptions())
            .pipe(tap(resp => {
                console.log('Add new scenario in story ' + storyID + '!', resp);
            }));
    }

    /**
     * get's single Scenario
     * @param storyID
     * @param storySource
     * @param scenarioID
     */
    getScenario(storyID: any, storySource, scenarioID): Observable<Scenario> {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .get<any>(this.apiServer + '/story/' + storyID + '/' + storySource + '/' + scenarioID, ApiService.getOptions())
            .pipe(tap(resp => {
                console.log('Get scenario in story ' + storyID + '!', resp);
            }));
    }

    /**
     * Updates the background
     * @param storyID
     * @param storySource
     * @param background
     * @returns
     */

    public updateBackground(storyID: any, storySource: string, background: Background): Observable<Background> {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .post<Background>(this.apiServer + '/mongo/background/update/' + storyID + '/' + storySource, background, ApiService.getOptions())
            .pipe(tap(_ => {
                console.log('Update background for story ' + storyID );
            }));
    }

    /**
     * Submitts an issue to github to create a new step
     * @param obj
     * @returns
     */
    submitGithub(obj) {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .post<any>(this.apiServer + '/github/submitIssue/', obj, ApiService.getOptions());
    }

    /**
     * Updates the scenario
     * @param storyID
     * @param storySource
     * @param scenario updatedScenario
     * @returns
     */
    updateScenario(storyID: any, storySource: string, scenario: Scenario): Observable<Scenario> {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .put<any>(this.apiServer + '/story/' + storyID + '/' + storySource + '/' + scenario.scenario_id, scenario, ApiService.getOptions())
            .pipe(tap(_ => {
                //
            }));
    }

    /**
     * Deletes a report
     * @param reportId
     * @returns
     */
    deleteReport(reportId): Observable<any> {
        console.log('delete reportId', reportId);
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .delete<any>(this.apiServer + '/run/report/' + reportId, ApiService.getOptions())
            .pipe(tap(_ => {
                //
            }));
    }

    /**
     * Marks a report as saved in the report history
     * @param reportId
     * @returns
     */
    saveReport(reportId): Observable<any> {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .get<any>(this.apiServer + '/run/saveReport/' + reportId, ApiService.getOptions())
            .pipe(tap(_ => {
                //
            }));
    }

    /**
     * Marks a saved report as not saved
     * @param reportId
     * @returns
     */
    unsaveReport(reportId): Observable<any> {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .get<any>(this.apiServer + '/run/unsaveReport/' + reportId, ApiService.getOptions())
            .pipe(tap(_ => {
                //
            }));
    }

    /**
     * Deletes the background
     * @param storyID
     * @param storySource
     * @returns
     */
    deleteBackground(storyID: any, storySource: string): Observable<any> {
        this.apiServer = localStorage.getItem('url_backend');

        return this.http
            .delete<any>(this.apiServer + '/mongo/background/delete/' + storyID + '/' + storySource, ApiService.getOptions() )
            .pipe(tap(() => {
                //
            }));
    }

    /**
     * Deletes a scenario
     * @param storyID
     * @param storySource
     * @param scenario
     * @returns
     */
    deleteScenario(storyID: any, storySource: string, scenario: Scenario): Observable<Story> {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .delete<any>(this.apiServer + '/story/' + storyID + '/' + storySource + '/' + scenario.scenario_id , ApiService.getOptions())
            .pipe(tap(() => {
                //
            }));
    }

    /**
     * Runs a test of a scenario or story
     * @param storyID
     * @param storySource
     * @param scenarioID
     * @param params
     * @returns
     */
    runTests(storyID: any, storySource: string, scenarioID: number, params) {
        this.apiServer = localStorage.getItem('url_backend');
        const timeout = 900000;
        if (scenarioID) {
            return this.http
                .post(this.apiServer + '/run/Scenario/' + storyID + '/' + storySource + '/' + scenarioID, params, { withCredentials: true, headers: new HttpHeaders({ timeout: `${timeout}` })});
        }
        return this.http
            .post(this.apiServer + '/run/Feature/' + storyID + '/' + storySource, params, { withCredentials: true, headers: new HttpHeaders({ timeout: `${timeout}` })});
    }

    runGroup(repoID, groupID, params) {
        this.apiServer = localStorage.getItem('url_backend');
        const timeout = 6000000;
        return this.http
        .post(this.apiServer + '/run/Group/' + repoID + '/' + groupID, params, { withCredentials: true, headers: new HttpHeaders({ timeout: `${timeout}` })});
    }



    /**
     * Retrieves the report history of a story
     * @param storyId
     * @returns
     */
    getReportHistory(storyId: string) {
        return this.http
            .get<any>(this.apiServer + '/run/reportHistory/' + storyId, ApiService.getOptions())
            .pipe(tap(() => {
                //
            }));
    }

    createGroup(title: string, repoId: string, member_stories, isSequential): Observable<any> {
        return this.http
            .post(this.apiServer + '/group/' + repoId, {'name': title, 'member_stories': member_stories, 'sequence': isSequential}, ApiService.getOptions());
    }

    updateGroup(repoId: string, groupId: string, updatedGroup: Group): Observable<any> {
        return this.http
            .put(this.apiServer + '/group/' + repoId + '/' + groupId, updatedGroup, ApiService.getOptions());
    }

    deleteGroup(repoId: string, groupId: string) {
        return this.http
            .delete(this.apiServer + '/group/' + repoId + '/' + groupId, ApiService.getOptions());
    }

    getGroups(repoId: string): Observable<Group[]> {
        return this.http
            .get<Group[]>( this.apiServer + '/group/' + repoId, ApiService.getOptions());
    }

    downloadStoryFeatureFile(source, _id): Observable<Blob> {
        return this.http
            .get<Blob>(this.apiServer + '/story/download/story/' + source + '/' + _id, {withCredentials: true, responseType: 'blob' as 'json'});
    }

    downloadProjectFeatureFiles(source, repo_id): Observable<Blob> {
        return this.http
            .get<Blob>(this.apiServer + '/story/download/project/' + source + '/' + repo_id, {withCredentials: true, responseType: 'blob' as 'json'});
    }

    updateGroupsArray(repoId: string, groupsArray) {
        return this.http
            .put(this.apiServer + '/group/' + repoId, groupsArray, ApiService.getOptions());
    }

    /**
     * If the user is logged in
     * @returns
     */
    isLoggedIn(): boolean {
        return !!localStorage.getItem('login');
    }

    /**
     * If the repo is github repo
     * @param repo
     * @returns
     */
    isGithubRepo(repo: RepositoryContainer): boolean {
        return ( repo.source === 'github');
    }

    /**
     * If the repo is a jira repo
     * @param repo
     * @returns
     */
    isJiraRepo(repo: RepositoryContainer): boolean {
        return ( repo.source === 'jira');
    }

    /**
     * If the repo is a custom project
     * @param repo
     * @returns
     */
    isCustomRepo(repo: RepositoryContainer): boolean {
        return ( repo.source === 'db');
    }

    public changeOneDriver(oneDriver: boolean, storyID: any) {
        this.apiServer = localStorage.getItem('url_backend');

        return this.http
            .post(this.apiServer + '/mongo/oneDriver/' + storyID, {oneDriver});
    }

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
    public groupUnique(buttonId: string, input: string, array: Group[], group?: Group){
        array = array ? array : [];
        input = input ? input : '';
        const button = (document.getElementById(buttonId)) as HTMLButtonElement;
        if ((input && !array.find(i => i.name === input)) || (group ? array.find(g => g._id == group._id && g.name == input) : false)){
            button.disabled = false;
        } 
        
        else {
            if(input.length==0)
            {
                button.disabled = true;
                this.toastr.error('The field can not be empty');
            }
           else
           {
             button.disabled = true;
             this.toastr.error('This Group Title is already in use. Please choose another Title'); 
           }
        }
    }
} 
