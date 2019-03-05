import { Injectable } from '@angular/core';
import {tap} from 'rxjs/operators';
import {HttpClient} from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiServer: string = "http://localhost:8080/api"; //"https://cucumberapp.herokuapp.com/api"

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

  //Using random numbers right now. When cucumber Integration is complete, this should request the API to run the tests and hand the results over to the component
  public runTests(scenario){
    //return this.http.get<any>(this.apiServer + '/stories').pipe(tap(resp=> console.log (resp)));
    return this.http
    .get<RunTestJson>(this.apiServer + '/runTest/')
    .pipe(tap(resp =>
      console.log('GET run tests' +  scenario.scenario_id + ' in story ', resp)
    ));
    
    //var err_msgs= [];
    //err_msgs.push("test");
 //   return{failed:5,successfull:6,not_implemented:10,not_executed:2,err_msg:err_msgs}
  }
}


interface RunTestJson{
  failed: number;
  successfull: number;
  not_implemented: number;
  not_executed: number;
  err_msg: [object];
}
