import { Injectable, inject, signal } from '@angular/core';
import { Scenario } from '@seed-test/shared/models/Scenario';
import { Observable } from 'rxjs';
import { ApiService } from '../Services/api.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Story } from '@seed-test/shared/models/Story';
import { ActionTrigger } from './action-trigger';


/**
 * Service for communication between scenario component and the backend
 */
@Injectable({
	providedIn: 'root'
})
export class ScenarioService {
	apiService = inject(ApiService);
	private http = inject(HttpClient);

	/** Action channel for rename scenario — carries the new title */
	readonly renameScenarioTrigger = new ActionTrigger<string>();
	/** Action channel for scenario status change — carries {storyId, scenarioId, lastTestPassed} */
	readonly scenarioStatusChangeTrigger = new ActionTrigger<{ storyId: string; scenarioId: number; lastTestPassed: boolean }>();
	/** Signal for scenario changed trigger */
	readonly scenarioChangedTrigger = signal(0);
	/** Triggers the scenario changed signal */
	public scenarioChangedEmitter() {
		this.scenarioChangedTrigger.update(n => n + 1);
	}
	/**
    * Emits the rename scenario action
    * @param newTitle
  */
	renameScenarioEmit(newTitle: string) {
		this.renameScenarioTrigger.emit(newTitle);
	}
	/**
    * Emits the scenario status change action
    * @param storyId id of the story
    * @param scenarioId id of the scenario thats changed
    * @param lastTestPassed value status changed to
  */
	scenarioStatusChangeEmit(storyId: string, scenarioId: number, lastTestPassed: boolean) {
		this.scenarioStatusChangeTrigger.emit({ storyId: storyId, scenarioId: scenarioId, lastTestPassed: lastTestPassed });
	}
	/* Updating scenario list */
	public updateScenarioList(story_id: string, scenario_list: Scenario[]): Observable<Story> {
		return this.http
			.patch<Story>(this.apiService.apiServer + '/story/' + story_id, scenario_list, ApiService.getOptions())
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
	addScenario(storyID: string, scenarioTitle: string): Observable<Scenario> {
		const body = { 'name': scenarioTitle };
		return this.http
			.post<Scenario>(this.apiService.apiServer + '/story/' + storyID, body, ApiService.getOptions())
			.pipe(tap(resp => {
				console.log('Add new scenario in story ' + storyID + '!', resp);
			}));
	}
	/**
  * Add the First Scenario
  * @param storyID
  * @returns
*/
	public addFirstScenario(storyID: string): Observable<Scenario> {// not used ?
		return this.http
			.get<Scenario>(this.apiService.apiServer + '/mongo/scenario/add/' + storyID, ApiService.getOptions())// route doesn't exist
			.pipe(tap(resp => {
				console.log('Add new scenario in story ' + storyID + '!', resp);
			}));
	}
	/**
   * get's single Scenario
   * @param storyID
   * @param scenarioID
  */
	getScenario(storyID: string, scenarioID: number): Observable<Scenario> {
		return this.http
			.get<Scenario>(this.apiService.apiServer + '/story/' + storyID + '/' + scenarioID, ApiService.getOptions())
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
	updateScenario(storyID: string, scenario: Scenario): Observable<Scenario> {
		return this.http
			.put<Scenario>(this.apiService.apiServer + '/story/' + storyID + '/' + scenario.scenario_id, scenario, ApiService.getOptions())
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
	deleteScenario(storyID: string, scenario: Scenario, xrayEnabled: boolean): Observable<Story> {
		if (xrayEnabled) {
			console.log('Xray enabled no 2: ' + xrayEnabled);
			const headers = new HttpHeaders()
				.set('x-xray-enabled', xrayEnabled.toString())
				.set('x-test-key', scenario.testKey!.toString());
			const options = { headers: headers, ...ApiService.getOptions() };
			return this.http
				.delete<Story>(this.apiService.apiServer + '/story/scenario/' + storyID + '/' + scenario.scenario_id, options)
				.pipe(tap(() => {
					//
				}));
		} else
			return this.http
				.delete<Story>(this.apiService.apiServer + '/story/scenario/' + storyID + '/' + scenario.scenario_id, ApiService.getOptions())
				.pipe(tap(() => {
					//
				}));

	}
}
