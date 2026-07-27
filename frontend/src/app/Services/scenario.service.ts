import { EventEmitter, Injectable, inject, signal } from '@angular/core';
import { Scenario } from '@shared/models/Scenario';
import { Observable } from 'rxjs';
import { ApiService } from '../Services/api.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Story } from '@shared/models/Story';


/**
 * Service for communication between scenario component and the backend
 */
@Injectable({
	providedIn: 'root'
})
export class ScenarioService {
	apiService = inject(ApiService);
	private http = inject(HttpClient);

	/** Signal for rename scenario action — carries the new title */
	readonly renameScenarioValue = signal<string | null>(null);
	/** EventEmitter (legacy bridge) for rename scenario action */
	public renameScenarioEvent = new EventEmitter();

	/** Signal for delete scenario action — carries xrayEnabled flag */
	readonly deleteScenarioValue = signal<boolean | null>(null);
	/** EventEmitter (legacy bridge) for delete scenario action */
	public deleteScenarioEvent = new EventEmitter();

	/** Signal for scenario status change — carries {storyId, scenarioId, lastTestPassed} */
	readonly scenarioStatusChange = signal<{ storyId: string; scenarioId: number; lastTestPassed: boolean } | null>(null);
	/** EventEmitter (legacy bridge) for scenario status change */
	public scenarioStatusChangeEvent = new EventEmitter();

	/** Signal for scenario changed trigger */
	readonly scenarioChangedTrigger = signal(0);
	/** EventEmitter (legacy bridge) for scenario changed trigger */
	public scenarioChangedEvent = new EventEmitter();

	/** Sets the delete scenario value with xray flag — updates signal and emits event */
	public deleteScenarioEmitter(xrayEnabled: boolean) {
		console.log('Xray enabled: ' + xrayEnabled);
		this.deleteScenarioValue.set(xrayEnabled);
		this.deleteScenarioEvent.emit(xrayEnabled);
	}
	/** Triggers the scenario changed signal and emits event */
	public scenarioChangedEmitter() {
		this.scenarioChangedTrigger.update(n => n + 1);
		this.scenarioChangedEvent.emit();
	}
	/**
    * Sets the rename scenario value — updates signal and emits event
    * @param newTitle
  */
	renameScenarioEmit(newTitle: string) {
		this.renameScenarioValue.set(newTitle);
		this.renameScenarioEvent.emit(newTitle);
	}
	/**
    * Sets the scenario status change value — updates signal and emits event
    * @param storyId id of the story
    * @param scenarioId id of the scenario thats changed
    * @param lastTestPassed value status changed to
  */
	scenarioStatusChangeEmit(storyId: string, scenarioId: number, lastTestPassed: boolean) {
		const val = { storyId: storyId, scenarioId: scenarioId, lastTestPassed: lastTestPassed };
		this.scenarioStatusChange.set(val);
		this.scenarioStatusChangeEvent.emit(val);
	}
	/* Updating scenario list */
	public updateScenarioList(story_id: string, scenario_list: Scenario[]): Observable<any> {
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
	public addFirstScenario(storyID: string): Observable<Scenario> {// not used ?
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
	getScenario(storyID: any, scenarioID: number): Observable<Scenario> {
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
			console.log('Xray enabled no 2: ' + xrayEnabled);
			const headers = new HttpHeaders()
				.set('x-xray-enabled', xrayEnabled.toString())
				.set('x-test-key', scenario.testKey!.toString());
			const options = { headers: headers, ...ApiService.getOptions() };
			return this.http
				.delete<any>(this.apiService.apiServer + '/story/scenario/' + storyID + '/' + scenario.scenario_id, options)
				.pipe(tap(() => {
					//
				}));
		} else 
			return this.http
				.delete<any>(this.apiService.apiServer + '/story/scenario/' + storyID + '/' + scenario.scenario_id, ApiService.getOptions())
				.pipe(tap(() => {
					//
				}));
    
	}
}
