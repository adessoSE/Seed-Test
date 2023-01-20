import { EventEmitter, Injectable } from '@angular/core';
import { Scenario } from '../model/Scenario';
import { Observable } from 'rxjs';
import { ApiService } from '../Services/api.service';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Story } from '../model/Story';

/**
 * Service for communication between scenario component and the backend
 */
@Injectable({
  providedIn: 'root'
})
export class ScenarioService {

  /**
  * @ignore
  */
  constructor(public apiService: ApiService, private http: HttpClient) { }
  /**
  * Event emitter to rename the scenario
  */
  public renameScenarioEvent = new EventEmitter();
  /**
  * Event emitter to delete the scenario
  */
  public deleteScenarioEvent = new EventEmitter();
  /**
  * Event emitter to reload scenario status
  */
  public scenarioStatusChangeEvent = new EventEmitter();

  /* Scenario change emitter */
  public scenarioChangedEvent: EventEmitter<Scenario> = new EventEmitter();
  /**
    * Emits the delete scenario event
  */
  public deleteScenarioEmitter() {
    this.deleteScenarioEvent.emit();
  }
  /* Emits scenario changed event */
  public scenarioChangedEmitter() {
    this.scenarioChangedEvent.emit();
  }
  /**
    * Emits the rename scenario event
    * @param newTitle
  */
  renameScenarioEmit(newTitle) {
    this.renameScenarioEvent.emit(newTitle);
  }
  /**
    * Emits the scenario status change event
    * @param storyId id of the story
    * @param scenarioId id of the scenario thats changed
    * @param lastTestPassed value status changed to
  */
  scenarioStatusChangeEmit(storyId, scenarioId, lastTestPassed) {
    const val = { storyId: storyId, scenarioId: scenarioId, lastTestPassed: lastTestPassed };
    this.scenarioStatusChangeEvent.emit(val);
  }
  /* Updating scenario list */
  public updateScenarioList(story_id, source, scenario_list: Scenario[]): Observable<any> {
    this.apiService.apiServer = localStorage.getItem('url_backend');
    return this.http
      .patch(this.apiService.apiServer + '/story/' + story_id + '/' + source, scenario_list, ApiService.getOptions())
      .pipe(tap(_ => {
        //
      }));
  }
  /**
    * Adds a Scenario
    * @param storyID
    * @param storySource
    * @param scenarioTitle
    * @returns
  */
  addScenario(storyID: any, storySource: string, scenarioTitle: string): Observable<Scenario> {
    this.apiService.apiServer = localStorage.getItem('url_backend');
    const body = { 'name': scenarioTitle };
    return this.http
      .post<any>(this.apiService.apiServer + '/story/' + storyID + '/' + storySource, body, ApiService.getOptions())
      .pipe(tap(resp => {
        console.log('Add new scenario in story ' + storyID + '!', resp);
      }));
  }
    /**
    * Add the First Scenario
    * @param storyID
    * @param storySource
    * @returns
  */
  public addFirstScenario(storyID, storySource: string): Observable<Scenario> {
    this.apiService.apiServer = localStorage.getItem('url_backend');

    return this.http
      .get<any>(this.apiService.apiServer + '/mongo/scenario/add/' + storyID + '/' + storySource, ApiService.getOptions())
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
    this.apiService.apiServer = localStorage.getItem('url_backend');
    return this.http
      .get<any>(this.apiService.apiServer + '/story/' + storyID + '/' + storySource + '/' + scenarioID, ApiService.getOptions())
      .pipe(tap(resp => {
        console.log('Get scenario in story ' + storyID + '!', resp);
      }));
  }
  /**
    * Updates the scenario
    * @param storyID
    * @param storySource
    * @param scenario updatedScenario
    * @returns
  */
  updateScenario(storyID: any, storySource: string, scenario: Scenario): Observable<Scenario> {
    this.apiService.apiServer = localStorage.getItem('url_backend');
    return this.http
      .put<any>(this.apiService.apiServer + '/story/' + storyID + '/' + storySource + '/' + scenario.scenario_id, scenario, ApiService.getOptions())
      .pipe(tap(_ => {
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
    this.apiService.apiServer = localStorage.getItem('url_backend');
    return this.http
      .delete<any>(this.apiService.apiServer + '/story/' + storyID + '/' + storySource + '/' + scenario.scenario_id, ApiService.getOptions())
      .pipe(tap(() => {
        //
      }));
  }
}
