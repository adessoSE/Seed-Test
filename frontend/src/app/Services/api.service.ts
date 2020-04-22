import { Injectable } from '@angular/core';
import { tap, catchError } from 'rxjs/operators';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { EventEmitter } from '@angular/core';
import { Story } from '../model/Story';
import { Observable, throwError, of } from 'rxjs';
import { StepType } from '../model/StepType';
import { Scenario } from '../model/Scenario';
import { Background } from '../model/Background';
import { User } from '../model/User';
import {CookieService} from 'ngx-cookie-service'

@Injectable({
    providedIn: 'root'
})

export class ApiService {
    public apiServer: string = localStorage.getItem('url_backend');
    public token: string;
    public urlReceived = false;
    public storiesErrorEvent = new EventEmitter();
    public getStoriesEvent = new EventEmitter();
    public getTokenEvent = new EventEmitter();
    public getBackendUrlEvent = new EventEmitter();
    public getRepositoriesEvent = new EventEmitter();
    public user;
    constructor(private http: HttpClient, private cookieService: CookieService) {
    }


    public getOptions(){
        return { withCredentials: true}
    }

    public getProjectsFromJira(host: string) {
        this.apiServer = localStorage.getItem('url_backend');

        const str = this.apiServer + '/jira/projects/' + host;

        return this.http.get<string[]>(str)
            .pipe(tap(resp => {
            }),
                catchError(this.handleError));
    }

    public getRepositories(): Observable<string[]> {
        this.apiServer = localStorage.getItem('url_backend');
      
        const str = this.apiServer + '/github/repositories'; 
        
        return this.http.get<string[]>(str, this.getOptions())
          .pipe(tap(resp => {
            this.getRepositoriesEvent.emit(resp);
          }),
            catchError(this.handleError));
    } 

    public githubAuthentication() {
        const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize'; 
        let s = `${AUTHORIZE_URL}?scope=repo&client_id=${localStorage.getItem('clientId')}`;
        window.location.href = s;
    }

    public loginGihubToken(login: string, id){
        const str = this.apiServer + '/user/githubLogin'
        let user = {login, id}

        return this.http.post<string[]>(str, user, this.getOptions())
          .pipe(tap(resp => {
            //this.getStoriesEvent.emit(resp);
          }),
            catchError(this.handleError));
    }

    public loginUser(email: string, password: string): Observable<any> {
        const str = this.apiServer + '/user/login'
        let user;
        if(!email && !password){

        }else {
            user = {
                email, password
            }
        }

        return this.http.post<string[]>(str, user, this.getOptions())
          .pipe(tap(resp => {
            //this.getStoriesEvent.emit(resp);
          }),
            catchError(this.handleError));
    }

    logoutUser(){
        let str = this.apiServer + '/user/logout'
       return  this.http.get<string[]>(str, this.getOptions())
          .pipe(tap(resp => {
            this.cookieService.delete('connect.sid');
          }),
            catchError(this.handleError));
    }

    handleStoryError = (error: HttpErrorResponse, caught: Observable<any>) => {
        this.storiesErrorEvent.emit();
        return of([]);
    }

    handleError(error: HttpErrorResponse) {
        console.log(JSON.stringify(error));
        return throwError(error);
    }

    public getBackendInfo() {
        const url = localStorage.getItem('url_backend');
        const clientId = localStorage.getItem('clientId');

        if (url && url !== 'undefined' && clientId && clientId !== 'undefined') {
            this.urlReceived = true;
            this.getBackendUrlEvent.emit();
        } else {
            this.http.get<any>(window.location.origin + '/backendInfo', this.getOptions()).subscribe((backendInfo) => {
                localStorage.setItem('url_backend', backendInfo.url);
                localStorage.setItem('clientId', backendInfo.clientId);
                this.urlReceived = true;
                this.getBackendUrlEvent.emit();
            });
        }
    }

    public getStories(repository: string, token: string): Observable<Story[]> {
        let storytoken = token;
        if (!storytoken || storytoken === 'undefined') {
            storytoken = '';
        }
        this.apiServer = localStorage.getItem('url_backend');
        console.log('Send');
        console.log('/github/stories/' + repository + '/' + storytoken);
        return this.http
            .get<Story[]>(this.apiServer + '/github/stories/' + repository , this.getOptions())
            .pipe(tap(resp => {
                this.getStoriesEvent.emit(resp);
            }), catchError(this.handleStoryError));
    }

    public getIssuesFromJira(host: string, projectKey: string) {
        this.apiServer = localStorage.getItem('url_backend');

        const str = this.apiServer + '/jira/issues/' + host + '/' + projectKey;

        console.log('Send');
        console.log(str);
        this.http.get<string[]>(str)
            .pipe(tap(resp => {
            }),
                catchError(this.handleError));
        return this.http
            .get<Story[]>(str)
            .pipe(tap(resp => {
                this.getStoriesEvent.emit(resp);
            }), catchError(this.handleStoryError));
    }

    public getStepTypes(): Observable<StepType[]> {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .get<StepType[]>(this.apiServer + '/mongo/stepTypes', this.getOptions())
            .pipe(tap(resp => {
            }));
    }

    public createUser(user: User): Observable<User> {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .post<any>(this.apiServer + '/mongo/user/add', user)
            .pipe(tap(resp => {
            }), catchError(this.handleStoryError));
    }

    public updateUser(userID: string, user: User): Observable<User> {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .post<User>(this.apiServer + '/mongo/user/update/' + userID, user)
            .pipe(tap(resp => {
            }), catchError(this.handleStoryError));
    }


    public deleteUser(userID: string) {
        this.apiServer = localStorage.getItem('url_backend');
        this.http
            .delete<any>(this.apiServer + '/mongo/user/delete/' + userID)
            .pipe(tap(resp => {
            }), catchError(this.handleStoryError));
    }

    public getUserData(userID: string): Observable<Story[]> {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .get<Story[]>(this.apiServer + '/mongo/user/' + userID)
            .pipe(tap(resp => {
            }), catchError(this.handleStoryError));
    }

    public addScenario(storyID: number): Observable<Scenario> {
        this.apiServer = localStorage.getItem('url_backend');

        return this.http
            .get<any>(this.apiServer + '/mongo/scenario/add/' + storyID, this.getOptions())
            .pipe(tap(resp => {
                // console.log('Add new scenario in story ' + storyID + '!', resp)
            }));
    }

    public updateBackground(storyID: number, background: Background): Observable<Background> {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .post<any>(this.apiServer + '/mongo/background/update/' + storyID, background, this.getOptions())
            .pipe(tap(resp => {
                // console.log('Update background for story ' + storyID )
            }));
    }

    public submitGithub(obj) {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .post<any>(this.apiServer + '/github/submitIssue/', obj, this.getOptions());
    }

    public updateScenario(storyID: number, scenario: Scenario): Observable<Story> {
        this.apiServer = localStorage.getItem('url_backend');

        return this.http
            .post<any>(this.apiServer + '/mongo/scenario/update/' + storyID, scenario, this.getOptions())
            .pipe(tap(resp => {
                // console.log('Update scenario ' + scenario.scenario_id + ' in story ' + storyID, resp)
            }));
    }

    public deleteBackground(storyID: number): Observable<any> {
        this.apiServer = localStorage.getItem('url_backend');

        return this.http
            .delete<any>(this.apiServer + '/mongo/background/delete/' + storyID, this.getOptions() )
            .pipe(tap(resp => {
                //  console.log('Delete background for story ' + storyID )
            }));
    }

    public deleteScenario(storyID: number, scenario: Scenario): Observable<Story> {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .delete<any>(this.apiServer + '/mongo/scenario/delete/' + storyID + '/' + scenario.scenario_id, this.getOptions())
            .pipe(tap(resp => {
                // console.log('Delete scenario ' + scenario.scenario_id + ' in story ' + storyID + '!', resp)
            }));
    }

    // demands testing from the server
    public runTests(storyID: number, scenarioID: number) {
        this.apiServer = localStorage.getItem('url_backend');

        if (scenarioID) {
            return this.http
                .get(this.apiServer + '/run/Scenario/' + storyID + '/' + scenarioID, { responseType: 'text' });
        }
        return this.http
            .get(this.apiServer + '/run/Feature/' + storyID, { responseType: 'text' });
    }

    isLoggedIn(): boolean {
        if (this.cookieService.check('connect.sid')) {
            return true;
        }
        return false;
    }

    getToken(): string {
        return localStorage.getItem('token');
    }


}