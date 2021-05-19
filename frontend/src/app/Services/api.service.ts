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

@Injectable({
    providedIn: 'root'
})

export class ApiService {


    constructor(private http: HttpClient) {
    }

    public apiServer: string = localStorage.getItem('url_backend');
    public token: string;
    public urlReceived = false;
    public storiesErrorEvent = new EventEmitter();
    public getStoriesEvent = new EventEmitter();
    public getTokenEvent = new EventEmitter();
    public getBackendUrlEvent = new EventEmitter();
    public getRepositoriesEvent = new EventEmitter();
    public getProjectsEvent = new EventEmitter();
    public runSaveOptionEvent = new EventEmitter();
    public addBlockToScenarioEvent = new EventEmitter();
    public logoutEvent = new EventEmitter();
    public renameScenarioEvent = new EventEmitter();
    public deleteScenarioEvent = new EventEmitter();
    public createCustomStoryEmitter: EventEmitter<any> = new EventEmitter();

    public user;
    //public local:boolean = false;


    public static getOptions() {
        return { withCredentials: true};
    }

    public runSaveOption(option: String){
        this.runSaveOptionEvent.emit(option)
    }

    public deleteScenarioEmitter(){
        this.deleteScenarioEvent.emit()
    }

    static handleError(error: HttpErrorResponse) {
        console.log(JSON.stringify(error));
        return throwError(error);
    }

    renameScenarioEmit(newTitle){
        this.renameScenarioEvent.emit(newTitle);
    }

    getBlocks(repoId: string) {
        const str = this.apiServer + '/mongo/getBlocks/' + repoId;
        return this.http.get<Block[]>(str,  ApiService.getOptions())
        .pipe(tap(resp => {}),
        catchError(ApiService.handleError));
      }

    addBlockToScenario(block: Block, correspondingComponent: string){
        this.addBlockToScenarioEvent.emit([correspondingComponent, block])
    }

    public githubLogin() {
        const scope = 'repo';
        const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
        const s = `${AUTHORIZE_URL}?scope=${scope}&client_id=${localStorage.getItem('clientId')}`;
        window.location.href = s;
    }

    githubCallback(code: string): Observable<any>{
        this.apiServer = localStorage.getItem('url_backend');
        const str = this.apiServer + '/user/callback?code=' + code;
        return this.http.get(str, {withCredentials: true})
            .pipe(tap(resp => {}),
            catchError(ApiService.handleError));
    }

    getReport(reportName: string) {
        this.apiServer = localStorage.getItem('url_backend');
        if (this.apiServer) {
            const str = this.apiServer + '/run/report/' + reportName;
            return this.http.get(str,  { responseType: 'text', withCredentials: true})
                .pipe(tap(resp => {}),
                catchError(ApiService.handleError));
        }
    }

    deleteBlock(blockId: any) {
        const str = this.apiServer + '/mongo/deleteBlock/' + blockId;
        return this.http.delete<any>(str, ApiService.getOptions())
        .pipe(tap(resp => {

        }),
          catchError(ApiService.handleError));
      }

    public getProjectsFromJira() {
        this.apiServer = localStorage.getItem('url_backend');

        const str = this.apiServer + '/jira/projects/';

        return this.http.get<string[]>(str, ApiService.getOptions())
            .pipe(tap(resp => {
                    this.getProjectsEvent.emit(resp);
            }),
                catchError(ApiService.handleError));
    }

    public getRepositories(): Observable<RepositoryContainer[]> {
        this.apiServer = localStorage.getItem('url_backend');

        const str = this.apiServer + '/user/repositories';

        return this.http.get<RepositoryContainer[]>(str, ApiService.getOptions())
          .pipe(tap(resp => {
            this.getRepositoriesEvent.emit(resp);
          }),
            catchError(ApiService.handleError));
    }

    disconnectGithub() {
        const str = this.apiServer + '/github/disconnectGithub';
        return this.http.delete<any>(str, ApiService.getOptions())
        .pipe(tap(resp => {
          // this.getStoriesEvent.emit(resp);
        }),
          catchError(ApiService.handleError));
    }

    public loginGithubToken(login: string, id) {
        this.apiServer = localStorage.getItem('url_backend');
        const str = this.apiServer + '/user/githubLogin';
        const user = {login, id};

        return this.http.post<any>(str, user, ApiService.getOptions())
          .pipe(tap(resp => {
            // this.getStoriesEvent.emit(resp);
          }),
            catchError(ApiService.handleError));
    }

    public loginUser(email: string, password: string, stayLoggedIn: boolean): Observable<any> {
        this.apiServer = localStorage.getItem('url_backend');
        const str = this.apiServer + '/user/login';
        let user;
        if (!email && !password) {
        } else {
            user = {
                email, password, stayLoggedIn
            };
        }
        return this.http.post<string[]>(str, user, ApiService.getOptions())
          .pipe(tap(resp => {

            // this.getStoriesEvent.emit(resp);
          }),
            catchError(ApiService.handleError));
    }

    public jiraLogin(jiraName: string, jiraPassword: string, jiraServer: string) {
        console.log('Trying to connect to Jira');
        this.apiServer = localStorage.getItem('url_backend');
        const body = {  'jiraAccountName': jiraName,
                            'jiraPassword': jiraPassword,
                            'jiraServer': jiraServer};
        return this.http.post(this.apiServer + '/jira/login', body, ApiService.getOptions())
            .pipe(tap(resp => {
                localStorage.setItem('JiraSession', resp.toString());
            }));
    }

    public createRepository(name: string): Observable<any> {
        this.apiServer = localStorage.getItem('url_backend');
        console.log(this.apiServer);
        const body = {'name' : name};
        return this.http
            .post<any>(this.apiServer + '/mongo/createRepository/', body, ApiService.getOptions())
            .pipe(tap(resp => {
            }));
    }

    public createStory(title: string, description: string, repository: string, _id: string): Observable<any> {
        this.apiServer = localStorage.getItem('url_backend');
        const body = {'title' : title, 'description' : description, 'repo' : repository, _id};
        return this.http
            .post<any>(this.apiServer + '/mongo/createStory/', body, ApiService.getOptions())
            .pipe(tap(resp => {
            }));
    }

/*for RESET URL GET von FRONTEND??? console logn neeeded? Get from frontend not backend / Get URLS BAckend??*/

  public requestReset(email: string): Observable <any> {
        this.apiServer = localStorage.getItem('url_backend');
        const body = {'email' : email};
        return this.http
            .post<any>(this.apiServer + '/user/resetpassword/', body)
            .pipe(tap(resp => {
            }));
  }

  public confirmReset(uuid: string, password: string): Observable <any> {
    this.apiServer = localStorage.getItem('url_backend');
    const body = {'uuid' : uuid, 'password' : password};
    return this.http
        .patch<any>(this.apiServer + '/user/reset', body)
        .pipe(tap(resp => {
            //
        }));
}



    public addToWorkgroup(_id, user){
        return this.http
        .post<any>(this.apiServer + '/workgroups/wgmembers/' + _id, user, ApiService.getOptions())
        .pipe(tap(resp => {
            //
        }));
    }

    public updateWorkgroupUser(_id, user){
        return this.http
        .put<any>(this.apiServer + '/workgroups/wgmembers/' + _id, user, ApiService.getOptions())
        .pipe(tap(resp => {
            //
        }));
    }

    public getWorkgroup(_id){
        return this.http
        .get<any>(this.apiServer + '/workgroups/wgmembers/' + _id, ApiService.getOptions())
        .pipe(tap(resp => {
            //
        }));
    }

    public removeFromWorkgroup(_id, email){
        let user = {email}
        return this.http
        .post<any>(this.apiServer + '/workgroups/deletemember/' + _id, user, ApiService.getOptions())
        .pipe(tap(resp => {
            //
        }));
    }

    public saveBlock(block: Block){
        return this.http
        .post<any>(this.apiServer + '/mongo/saveBlock', block, ApiService.getOptions())
        .pipe(tap(resp => {
            //
        }));
    }

    logoutUser() {
        const url = this.apiServer + '/user/logout';
        localStorage.removeItem('login');
        return  this.http.get<string[]>(url, ApiService.getOptions())
          .pipe(tap(resp => {
          }),
            catchError(ApiService.handleError));
    }

    handleStoryError = (error: HttpErrorResponse, caught: Observable<any>) => {
        this.storiesErrorEvent.emit();
        return of([]);
    }

    public getBackendInfo(): Promise<any> {
        const url = localStorage.getItem('url_backend');
        const clientId = localStorage.getItem('clientId');
        const version = localStorage.getItem('version');

        if (url && url !== 'undefined' && clientId && clientId !== 'undefined' && version && version !== 'undefined') {
            this.urlReceived = true;
            this.getBackendUrlEvent.emit();
            return Promise.resolve(url);
        } else {

        return this.http.get<any>(window.location.origin + '/backendInfo', ApiService.getOptions()).toPromise().then((backendInfo) => {
             localStorage.setItem('url_backend', backendInfo.url);
             localStorage.setItem('clientId', backendInfo.clientId);
             localStorage.setItem('version', backendInfo.version);
             this.getBackendUrlEvent.emit();
         });
        }
    }


    public getStories(repository: RepositoryContainer): Observable<Story[]> {
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
                console.log('Resp');
                console.log(resp);
                this.getStoriesEvent.emit(resp);
            }), catchError(this.handleStoryError));
    }

    public getIssuesFromJira(projectKey: string) {
        this.apiServer = localStorage.getItem('url_backend');
        const str = this.apiServer + '/jira/issues/' + projectKey;
        console.log('Send');
        console.log(str);
        return this.http
            .get<Story[]>(str, ApiService.getOptions())
            .pipe(tap(resp => {
                this.getStoriesEvent.emit(resp);
            }), catchError(this.handleStoryError));
    }
    public createJiraAccount(request) {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .post<any>(this.apiServer + '/jira/user/create/', request, ApiService.getOptions())
            .pipe(tap(resp => {
                //console.log(resp.body);
            }));
    }

    public getStepTypes(): Observable<StepType[]> {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .get<StepType[]>(this.apiServer + '/mongo/stepTypes', ApiService.getOptions())
            .pipe(tap(resp => {
            }));
    }

    public registerUser(email: string, password: string, userId: any): Observable<any> {
        const user = {email, password, userId};
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .post<any>(this.apiServer + '/user/register', user)
            .pipe(tap(resp => {
            }), catchError((err, caught) => {
                return new Observable(subscriber => {
                    subscriber.next(err)
                    subscriber.complete();
                })
            }));
    }

    public updateUser(userID: string, user: User): Observable<User> {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .post<User>(this.apiServer + '/mongo/user/update/' + userID, user)
            .pipe(tap(resp => {
            }), catchError(this.handleStoryError));
    }

    public deleteUser() {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .delete<any>(this.apiServer + '/mongo/user/delete', ApiService.getOptions())
            .pipe(tap(resp => {
            }), catchError(this.handleStoryError));
    }

    public mergeAccountGithub(userId: string, login: string, id: any) {
        const str = this.apiServer + '/user/mergeGithub';
        const obj = {userId, login, id};

        return this.http.post<any>(str, obj, ApiService.getOptions())
        .pipe(tap(resp => {
          // this.getStoriesEvent.emit(resp);
        }),
          catchError(ApiService.handleError));
    }

    public getUserData(): Observable<User> {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .get<User>(this.apiServer + '/mongo/user/', ApiService.getOptions())
            .pipe(tap(resp => {
            }), catchError(this.handleStoryError));
    }

    public addScenario(storyID: any, storySource: string): Observable<Scenario> {
        this.apiServer = localStorage.getItem('url_backend');

        return this.http
            .get<any>(this.apiServer + '/mongo/scenario/add/' + storyID + '/' + storySource, ApiService.getOptions())
            .pipe(tap(resp => {
                // console.log('Add new scenario in story ' + storyID + '!', resp)
            }));
    }

    public updateBackground(storyID: any, storySource: string, background: Background): Observable<Background> {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .post<Background>(this.apiServer + '/mongo/background/update/' + storyID + '/' + storySource, background, ApiService.getOptions())
            .pipe(tap(resp => {
                // console.log('Update background for story ' + storyID )
            }));
    }

    public submitGithub(obj) {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .post<any>(this.apiServer + '/github/submitIssue/', obj, ApiService.getOptions());
    }

    public updateScenario(storyID: any, storySource: string, scenario: Scenario): Observable<Story> {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .post<any>(this.apiServer + '/mongo/scenario/update/' + storyID + '/' + storySource, scenario, ApiService.getOptions())
            .pipe(tap(resp => {
                // console.log('Update scenario ' + scenario.scenario_id + ' in story ' + storyID, resp)
            }));
    }

    public deleteBackground(storyID: any, storySource: string): Observable<any> {
        this.apiServer = localStorage.getItem('url_backend');

        return this.http
            .delete<any>(this.apiServer + '/mongo/background/delete/' + storyID + '/' + storySource, ApiService.getOptions() )
            .pipe(tap(resp => {
                //  console.log('Delete background for story ' + storyID )
            }));
    }

    public deleteScenario(storyID: any, storySource: string, scenario: Scenario): Observable<Story> {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .delete<any>(this.apiServer + '/mongo/scenario/delete/' + storyID + '/' + storySource + '/' + scenario.scenario_id , ApiService.getOptions())
            .pipe(tap(resp => {
                // console.log('Delete scenario ' + scenario.scenario_id + ' in story ' + storyID + '!', resp)
            }));
    }

    // demands testing from the server
    public runTests(storyID: any, storySource: string, scenarioID: number, params) {
        this.apiServer = localStorage.getItem('url_backend');
        let head: HttpHeaders = new HttpHeaders();
        head.append('timeout', '600000')
        if (scenarioID) {
            return this.http
                .post(this.apiServer + '/run/Scenario/' + storyID + '/' + storySource + '/' + scenarioID, params, {
                    responseType: 'text', withCredentials: true, headers: head});
        }
        return this.http
            .post(this.apiServer + '/run/Feature/' + storyID + '/' + storySource, params, { responseType: 'text', withCredentials: true, headers: head});
    }

    public createNewCustomStory(repo: RepositoryContainer, story){
        this.createCustomStoryEmitter.emit({repo, story})
    }

    public getReportHistory(storyId){
        return this.http
            .get<any>(this.apiServer + '/run/reportHistory/' + storyId, ApiService.getOptions())
            .pipe(tap(resp => {
                // console.log('Add new scenario in story ' + storyID + '!', resp)
            }));
    }

    // public changeDaisy(){
    //    this.apiServer = localStorage.getItem('url_backend');
    //    return this.http.get(this.apiServer + '/user/daisy')
    // }

    isLoggedIn(): boolean {
        // if (this.cookieService.check('connect.sid')) return true;
        // return false;
        if (localStorage.getItem('login')) { return true; }
        return false;
    }
    isGithubRepo(repo): boolean {
        return ( repo.source === 'github');
    }
    isJiraRepo(repo): boolean {
        return ( repo.source === 'jira');
    }
    isCustomRepo(repo): boolean {
        return ( repo.source === 'db');
    }
}
