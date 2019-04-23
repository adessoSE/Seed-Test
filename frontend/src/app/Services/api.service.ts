import { Injectable } from '@angular/core';
import {tap} from 'rxjs/operators';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import { ScenarioEditorComponent } from '../scenario-editor/scenario-editor.component';
import {Constants} from 'Constants';

@Injectable({
  providedIn: 'root'
})

export class ApiService {
  private apiServer: string = Constants.apiConst;

  constructor(private http: HttpClient) { }

  public getStories() {
    return this.http
      .get<any>(this.apiServer + '/stories')
      .pipe(tap(resp =>
        console.log('GET stories', resp)
      ));
  }

  public getStepDefinitions() {
    return this.http
      .get<any>(this.apiServer + '/stepDefinitions')
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

  public updateScenario(storyID, scenario) {
    return this.http
        .post<any>(this.apiServer + '/scenario/update/' + storyID, scenario)
        .pipe(tap(resp =>
          console.log('Update scenario ' + scenario.scenario_id + ' in story ' + storyID, resp)
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
  public runTests(storyID, scenario){
    console.log("scenario: " + scenario);
    console.log("issueID: " + storyID);
    if(scenario){
    return this.http
    .get(this.apiServer + '/runScenario/' + storyID + '/' + scenario, {responseType:'text'});
    }
    return this.http
    .get(this.apiServer + '/runFeature/'+ storyID, {responseType:'text'});
    /*.pipe(tap(resp =>
      console.log('GET run tests' +  scenario.scenario_id + ' in story ', resp)
    ));*/
  }


  public downloadTestResult(){
    return this.http.get(this.apiServer + "/downloadTest", {responseType:'blob', headers: new HttpHeaders().append('Content-Type', 'application/json')});
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


