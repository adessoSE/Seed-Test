import {Injectable} from '@angular/core';
import {tap, catchError} from 'rxjs/operators';
import {HttpClient, HttpHeaders, HttpErrorResponse} from '@angular/common/http';
import { EventEmitter } from '@angular/core';
import { Story } from '../model/Story';
import { Observable, throwError, of } from 'rxjs';
import { StepType } from '../model/StepType';
import { Scenario } from '../model/Scenario';
import { Background } from '../model/Background';

@Injectable({
    providedIn: 'root'
})

export class ApiService {
    public apiServer: string = localStorage.getItem('url_backend');
    public token: string;
    public urlReceived: boolean = false;
    public storiesErrorEvent = new EventEmitter();
    public getStoriesEvent = new EventEmitter();
    public getTokenEvent = new EventEmitter();
    public getBackendUrlEvent = new EventEmitter();

    constructor(private http: HttpClient) {
    }

    public getRepositories(token: string, githubName: string): Observable<string[]> {
        let repoToken = token;
        if(!repoToken || repoToken == 'undefined') {
          repoToken = '';
        }
        this.apiServer = localStorage.getItem('url_backend');
      
        const str = this.apiServer + '/github/repositories/' + githubName + '/' + repoToken; 
        
        return this.http.get<string[]>(str)
          .pipe(tap(resp => {}),
            catchError(this.handleError));
    }

    handleStoryError = (error: HttpErrorResponse, caught: Observable<any>) => {
        this.storiesErrorEvent.emit();
        return of([]);
    }

    handleError(error: HttpErrorResponse) {
        console.log(error);
        return throwError(error);
    }

    public getBackendInfo() {
        const url = localStorage.getItem('url_backend');
        if (url && url !== 'undefined') {
            this.urlReceived = true;
            this.getBackendUrlEvent.emit();
        } else {
            this.http.get<any>(window.location.origin + '/backendInfo').subscribe((backendInfo) => {
                localStorage.setItem('url_backend', backendInfo.url);
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
        return this.http
            .get<Story[]>(this.apiServer + '/github/stories/' + repository + '/' + storytoken)
            .pipe(tap(resp => {
                this.getStoriesEvent.emit(resp);
            }), catchError(this.handleStoryError));
    }

    public getStepTypes(): Observable<StepType[]> {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .get<StepType[]>(this.apiServer + '/mongo/stepTypes')
            .pipe(tap(resp => {
            }));
    }

    public addScenario(storyID: number): Observable<Scenario> {
        this.apiServer = localStorage.getItem('url_backend');

        return this.http
            .get<any>(this.apiServer + '/mongo/scenario/add/' + storyID)
            .pipe(tap(resp => {
                // console.log('Add new scenario in story ' + storyID + '!', resp)
            }));
    }
    
    public updateBackground(storyID: number, background: Background): Observable<Background> {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .post<any>(this.apiServer + '/mongo/background/update/' + storyID, background)
            .pipe(tap(resp => {
                // console.log('Update background for story ' + storyID )
            }));
    }

    public submitGithub(obj) {
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .post<any>(this.apiServer + '/github/submitIssue/', obj);
    }

    public updateScenario(storyID: number, scenario: Scenario): Observable<Story> {
        this.apiServer = localStorage.getItem('url_backend');

        return this.http
            .post<any>(this.apiServer + '/mongo/scenario/update/' + storyID, scenario)
            .pipe(tap(resp => {
                // console.log('Update scenario ' + scenario.scenario_id + ' in story ' + storyID, resp)
            }));
    }

    public deleteBackground(storyID: number): Observable<any>  {
        this.apiServer = localStorage.getItem('url_backend');

        return this.http
            .delete<any>(this.apiServer + '/mongo/background/delete/' + storyID )
            .pipe(tap(resp => {
                //  console.log('Delete background for story ' + storyID )
            }));
    }

    public deleteScenario(storyID: number, scenario: Scenario): Observable<Story>{
        this.apiServer = localStorage.getItem('url_backend');
        return this.http
            .delete<any>(this.apiServer + '/mongo/scenario/delete/' + storyID + '/' + scenario.scenario_id)
            .pipe(tap(resp => {
                // console.log('Delete scenario ' + scenario.scenario_id + ' in story ' + storyID + '!', resp)
            }));
    }

    // demands testing from the server
    public runTests(storyID: number, scenarioID: number) {
        this.apiServer = localStorage.getItem('url_backend');

        if (scenarioID) {
            return this.http
                .get(this.apiServer + '/run/Scenario/' + storyID + '/' + scenarioID, {responseType: 'text'});
        }
        return this.http
            .get(this.apiServer + '/run/Feature/' + storyID, {responseType: 'text'});
    }

    isLoggedIn(): boolean {
        const token = this.getToken();
        if (token) {
            return true;
        }
        return false;
    }

    getToken(): string {
        return localStorage.getItem('token');
    }
}



