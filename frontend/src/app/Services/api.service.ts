import { Injectable } from '@angular/core';
import {tap} from 'rxjs/operators';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import { EventEmitter } from '@angular/core';
import { Story } from '../model/Story';
import { StepDefinition } from '../model/StepDefinition';
// import {Constants} from 'Constants';

@Injectable({
  providedIn: 'root'
})

export class ApiService {
  private apiServer: string = 'http://localhost:8080/api';

  public getStoriesEvent = new EventEmitter();
  private token = 123;
  private headers: Headers;

  constructor(private http: HttpClient) { 
    this.headers = new Headers({
      'Authorization': `Bearer ${this.getToken()}`
    });
  }

  public getRepositories(token?){
    //let options = new RequestOptions({headers: this.headers});
    return this.http.get<any>(this.apiServer + '/repositories/' + token)
    .pipe(tap(resp =>{
      console.log("GET Repositories: " + resp);
    }))
  }


  public getStories(repository?) {
    //let options = new RequestOptions({headers: this.headers});

    return this.http
      .get<Story[]>(this.apiServer + '/stories/' + repository)
      .pipe(tap(resp =>{
        this.getStoriesEvent.emit(resp);
        console.log('GET stories', resp);
      }
      ));
  }

  public getStepDefinitions() {
    return this.http
      .get<StepDefinition>(this.apiServer + '/stepDefinitions')
      .pipe(tap(resp =>
        console.log('GET step definitions', resp)
      ));
  }

  public addScenario(storyID) {
      return this.http
          .get<any>(this.apiServer + '/scenario/add/' + storyID)
          .pipe(tap(resp =>
            console.log('Add new scenario in story ' + storyID + '!', resp)
      ));
  }

  public updateBackground(storyID, background){
    return this.http
        .post<any>(this.apiServer + '/background/update/' + storyID, background)
        .pipe(tap(resp =>
          console.log('Update background for story ' + storyID )
        ));
  }

  public updateScenario(storyID, scenario) {
    return this.http
        .post<any>(this.apiServer + '/scenario/update/' + storyID, scenario)
        .pipe(tap(resp =>
          console.log('Update scenario ' + scenario.scenario_id + ' in story ' + storyID, resp)
        ));
  }

  public deleteBackground(storyID){
    return this.http
        .delete<any>(this.apiServer + '/story/' + storyID + '/background/delete/')
        .pipe(tap(resp =>
          console.log('Delete background for story ' + storyID )
        ));
  }

  public deleteScenario(storyID, scenario) {
   return this.http
        .delete<any>(this.apiServer + '/story/' + storyID + '/scenario/delete/' + scenario.scenario_id)
        .pipe(tap(resp =>
          console.log('Delete scenario ' + scenario.scenario_id + ' in story ' + storyID + '!', resp)
        ));
  }

  // demands testing from the server
  public runTests(storyID, scenarioID){
    console.log("scenario: " + scenarioID);
    console.log("issueID: " + storyID);
    if(scenarioID){
      console.log("run test scenario");
    
   // let options = new RequestOptions({responseType: ResponseContentType.Text});

    return this.http
    .get(this.apiServer + '/runScenario/' + storyID + '/' + scenarioID, {responseType: 'text'});
    }
    console.log("run test feature");

    return this.http
    .get(this.apiServer + '/runFeature/'+ storyID, {responseType: 'text'});
    /*.pipe(tap(resp =>
      console.log('GET run tests' +  scenario.scenario_id + ' in story ', resp)
    ));*/
  }


  public downloadTestResult(){
    //let header = new Headers();
    //header.append('Content-Type', 'application/json');

    return this.http.get(this.apiServer + "/downloadTest", {responseType:'blob' , headers: new HttpHeaders().append('Content-Type', 'application/json')});
  }

  getToken(): string {
    return localStorage.getItem('token');
  }
}

// interface for the runTests method, needed to unpack the json
interface RunTestJson{
  failed: number;
  successfull: number;
  not_implemented: number;
  not_executed: number;
  err_msg: [object];
}


