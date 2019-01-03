import { Injectable } from '@angular/core';
import {tap} from "rxjs/operators";
import {HttpClient} from "@angular/common/http";

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiServer: string = "http://localhost:8080/api"; //"https://cucumberapp.herokuapp.com/api"

  constructor(private http: HttpClient) { }

  public getStories(){
    return this.http
      .get<any>(this.apiServer + '/stories')
      .pipe(tap(resp =>
        console.log('GET stories', resp)
      ));
  }

  public getStepDefinitions(){
    return this.http
      .get<any>(this.apiServer + '/stepDefinitions')
      .pipe(tap(resp =>
        console.log('GET step definitions', resp)
      ));
  }

  public addScenario(storyID){
    this.http
      .get<any>(this.apiServer + '/scenario/add/'+storyID)
      .pipe(tap(resp =>
        console.log('Add new scenario in story '+ storyID + '!', resp)
      ));
  }

  public updateScenario(storyID, scenario){
    return this.http
      .get<any>(this.apiServer + '/scenario/update'+storyID)
      .pipe(tap(resp =>
        console.log('Update scenario '+ scenario+' in story '+ storyID, resp)
      ));
  }

  public deleteScenario(storyID, scenarioID){
    this.http
      .get<any>(this.apiServer + '/scenario/delete'+storyID)
      .pipe(tap(resp =>
        console.log('Delete scenario '+scenarioID+' in story '+ storyID + '!', resp)
      ));
  }
}
