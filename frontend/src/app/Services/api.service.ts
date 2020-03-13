import { Injectable } from '@angular/core';
import {tap, catchError} from 'rxjs/operators';
import {HttpClient, HttpHeaders, HttpErrorResponse} from '@angular/common/http';
import { EventEmitter } from '@angular/core';
import { Story } from '../model/Story';
import { Observable, throwError, of } from 'rxjs';
import { StepType } from '../model/StepType';

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
      sessionStorage.setItem('github', 'https://api.github.com/repos/adessoAG/Seed-Test/issues')
  }

  public getHeader() {
    return new HttpHeaders({
      'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': 'true'
    });
  }

  public getRepositories(token: string, githubName): Observable<any> {
    let repoToken = token;
    if(!repoToken || repoToken == 'undefined') {
      repoToken = '';
    }
    const options = {headers: this.getHeader()};
    this.apiServer = localStorage.getItem('url_backend');

    let str = this.apiServer + '/repositories/' + githubName + '/' + repoToken;
    return this.http.get<any>(str, options)
      .pipe(tap(resp => {}),
        catchError(this.handleError));
  }

  handleStoryError = (error: HttpErrorResponse, caught: Observable<any> ) => {
    this.storiesErrorEvent.emit();
    return of([]);
  }

  handleError(error: HttpErrorResponse) {
    console.log(error);
    return  throwError(error);
  }

  public getBackendInfo() {
    let url = localStorage.getItem('url_backend');
    if(url && url != 'undefined'){
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

  public getStories(repository, token) {
    let storytoken = token;
    if(!storytoken || storytoken == 'undefined') {
      storytoken = '';
    }
    this.apiServer = localStorage.getItem('url_backend');
    return this.http
      .get<Story[]>(this.apiServer + '/stories/' + repository + '/' + storytoken)
      .pipe(tap(resp => {
        this.getStoriesEvent.emit(resp);
      }), catchError(this.handleStoryError));
  }

  public getStepTypes() {
    this.apiServer = localStorage.getItem('url_backend');
    return this.http
      .get<StepType[]>(this.apiServer + '/stepTypes')
      .pipe(tap(resp => {
       //console.log('GET step types', resp)
      }));
  }

  public addScenario(storyID) {
    this.apiServer = localStorage.getItem('url_backend');

      return this.http
        .get<any>(this.apiServer + '/scenario/add/' + storyID)
        .pipe(tap(resp => {
         // console.log('Add new scenario in story ' + storyID + '!', resp)
        }));
  }

  public updateBackground(storyID, background) {
    this.apiServer = localStorage.getItem('url_backend');

    return this.http
        .post<any>(this.apiServer + '/background/update/' + storyID, background)
        .pipe(tap(resp => {
         // console.log('Update background for story ' + storyID )
        }));
  }

  public submitgithub(obj) {
    let github = sessionStorage.getItem('github');

    let options = {
      headers: new HttpHeaders()
          .set('Authorization',  `Basic ${btoa('b465e192f7f740f2bba994dab7d59283fc80acb2')}`)
    }

    return this.http
        .post<any>(github, obj, options);
  }

  public updateScenario(storyID, scenario) {
    this.apiServer = localStorage.getItem('url_backend');

    return this.http
        .post<any>(this.apiServer + '/scenario/update/' + storyID, scenario)
        .pipe(tap(resp => {
         // console.log('Update scenario ' + scenario.scenario_id + ' in story ' + storyID, resp)
        }));
  }

  public deleteBackground(storyID) {
    this.apiServer = localStorage.getItem('url_backend');

    return this.http
        .delete<any>(this.apiServer + '/story/' + storyID + '/background/delete/')
        .pipe(tap(resp => {
        //  console.log('Delete background for story ' + storyID )
        }));
  }

  public deleteScenario(storyID, scenario) {
    this.apiServer = localStorage.getItem('url_backend');

   return this.http
        .delete<any>(this.apiServer + '/story/' + storyID + '/scenario/delete/' + scenario.scenario_id)
        .pipe(tap(resp => {
         // console.log('Delete scenario ' + scenario.scenario_id + ' in story ' + storyID + '!', resp)
        }));
  }

  // demands testing from the server
  public runTests(storyID, scenarioID) {
    this.apiServer = localStorage.getItem('url_backend');

    if (scenarioID) {
      return this.http
      .get(this.apiServer + '/runScenario/' + storyID + '/' + scenarioID, {responseType: 'text'});
    }
    return this.http
    .get(this.apiServer + '/runFeature/' + storyID, {responseType: 'text'});
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    if (token) { return true; }
    return false;
  }

  getToken(): string {
    return localStorage.getItem('token');
  }
}



