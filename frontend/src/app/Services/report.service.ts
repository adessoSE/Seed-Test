import { EventEmitter, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ApiService } from '../Services/api.service';

import { ReportContainer } from '@shared/models/ReportContainer';
import { StoryReport } from '@shared/models/StoryReport';
import { ScenarioReport } from '@shared/models/ScenarioReport';
import { GroupReport } from '@shared/models/GroupReport';

/**
 * Service for communication between report component and the backend
 */
@Injectable({
	providedIn: 'root'
})
export class ReportService {

	/**
   * Event emitter to distribute the reports to all components
   */
	public getReportsEvent = new EventEmitter();

	/**
    * @ignore
  */
	constructor(public apiService: ApiService, private http: HttpClient) { }

	/**
   * Retrieves the report *data* by its ID.
   * @param reportID
   * @returns
   */
	getReportData(reportID: string): Observable<StoryReport | ScenarioReport | GroupReport> {
		return this.http
			.get<StoryReport | ScenarioReport | GroupReport>(this.apiService.apiServer + '/report/' + reportID, ApiService.getOptions())
			.pipe(tap(_ => {
				//
			}));
	}

	/**
    * Retrieves a *regenerated HTML report* by its name
    * @param reportName: name of the Report
    * @returns
  */
	getReport(reportName: string): Observable<any> {
		const str = this.apiService.apiServer + '/report/regenerate/' + reportName;
		return this.http.get(str, { responseType: 'json', withCredentials: true })
			.pipe(tap(_ => {
				//
			}),
			catchError(this.apiService.handleError));
	}

	/**
    * Deletes a report
    * @param reportId
    * @returns
  */
	deleteReport(reportId): Observable<any> {
		return this.http
			.delete<any>(this.apiService.apiServer + '/report/' + reportId, ApiService.getOptions())
			.pipe(tap(_ => {
				//
			}));
	}

	/**
    * Marks a report as saved in the report history
    * @param reportId
    * @returns
  */
	saveReport(reportId): Observable<any> {
		return this.http
			.put<any>(this.apiService.apiServer + '/report/save/' + reportId, {}, ApiService.getOptions())
			.pipe(tap(_ => {
				//
			}));
	}

	/**
    * Marks a saved report as not saved
    * @param reportId
    * @returns
  */
	unsaveReport(reportId): Observable<any> {
		return this.http
			.put<any>(this.apiService.apiServer + '/report/unsave/' + reportId, {}, ApiService.getOptions())
			.pipe(tap(_ => {
				//
			}));
	}

	/**
   * Retrieves the report history of a story
   * @param storyId
   * @returns
  */
	getReportHistory(storyId: string): Observable<ReportContainer> {
		return this.http
			.get<ReportContainer>(this.apiService.apiServer + '/report/history/' + storyId, ApiService.getOptions())
			.pipe(tap(() => {
				//
			}));
	}

}