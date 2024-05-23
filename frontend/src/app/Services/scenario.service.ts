import { EventEmitter, Injectable } from '@angular/core';
import { Scenario } from '../model/Scenario';
import { Observable } from 'rxjs';
import { ApiService } from '../Services/api.service';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Story } from '../model/Story';
import { HttpHeaders } from '@angular/common/http';


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
  public deleteScenarioEmitter(xrayEnabled: boolean) {
    console.log('Xray enabled: ' + xrayEnabled)
    this.deleteScenarioEvent.emit(xrayEnabled);
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
  public updateScenarioList(story_id, scenario_list: Scenario[]): Observable<any> {
    return this.http
      .patch(this.apiService.apiServer + '/story/' + story_id, scenario_list, ApiService.getOptions())
      .pipe(tap(_ => {
        //
      }));
  }
  /**
    * Adds a Scenario
    * @param storyID
    * @param scenarioTitle
    * @returns
  */
  addScenario(storyID: any, scenarioTitle: string): Observable<Scenario> {
    const body = { 'name': scenarioTitle };
    return this.http
      .post<any>(this.apiService.apiServer + '/story/' + storyID, body, ApiService.getOptions())
      .pipe(tap(resp => {
        console.log('Add new scenario in story ' + storyID + '!', resp);
      }));
  }
  /**
  * Add the First Scenario
  * @param storyID
  * @returns
*/
  public addFirstScenario(storyID): Observable<Scenario> {// not used ?
    return this.http
      .get<any>(this.apiService.apiServer + '/mongo/scenario/add/' + storyID, ApiService.getOptions())// route doesn't exist
      .pipe(tap(resp => {
        console.log('Add new scenario in story ' + storyID + '!', resp);
      }));
  }
  /**
   * get's single Scenario
   * @param storyID
   * @param scenarioID
  */
  getScenario(storyID: any, scenarioID): Observable<Scenario> {
    return this.http
      .get<any>(this.apiService.apiServer + '/story/' + storyID + '/' + scenarioID, ApiService.getOptions())
      .pipe(tap(resp => {
        console.log('Get scenario in story ' + storyID + '!', resp);
      }));
  }
  /**
    * Updates the scenario
    * @param storyID
    * @param scenario updatedScenario
    * @returns
  */
  updateScenario(storyID: any, scenario: Scenario): Observable<Scenario> {
    return this.http
      .put<any>(this.apiService.apiServer + '/story/' + storyID + '/' + scenario.scenario_id, scenario, ApiService.getOptions())
      .pipe(tap(_ => {
        //
      }));
  }
  /**
    * Deletes a scenario
    * @param storyID
    * @param scenario
    * @returns
  */
  deleteScenario(storyID: any, scenario: Scenario, xrayEnabled: boolean): Observable<Story> {
    if (xrayEnabled) {
      console.log('Xray enabled no 2: ' + xrayEnabled)
      const headers = new HttpHeaders()
        .set('x-xray-enabled', xrayEnabled.toString())
        .set('x-test-key', scenario.testKey.toString());
      const options = { headers: headers, ...ApiService.getOptions() };
      return this.http
        .delete<any>(this.apiService.apiServer + '/story/scenario/' + storyID + '/' + scenario.scenario_id, options)
        .pipe(tap(() => {
          //
        }));
    } else {
      return this.http
        .delete<any>(this.apiService.apiServer + '/story/scenario/' + storyID + '/' + scenario.scenario_id, ApiService.getOptions())
        .pipe(tap(() => {
          //
        }));
    }
  }
}
