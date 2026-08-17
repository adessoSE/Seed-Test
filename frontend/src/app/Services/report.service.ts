import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ApiService } from '../Services/api.service';

import { ReportContainer } from '@seed-test/shared/models/ReportContainer';
import { StoryReport } from '@seed-test/shared/models/StoryReport';
import { ScenarioReport } from '@seed-test/shared/models/ScenarioReport';
import { GroupReport } from '@seed-test/shared/models/GroupReport';

/**
 * Service for communication between report component and the backend
 */
@Injectable({
	providedIn: 'root'
})
export class ReportService {
	apiService = inject(ApiService);
	private http = inject(HttpClient);

	/** Signal for get reports trigger (currently unused — never emitted) */
	readonly getReportsTrigger = signal(0);
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
	getReport(reportName: string): Observable<Record<string, unknown>> {
		const str = this.apiService.apiServer + '/report/regenerate/' + reportName;
		return this.http.get<Record<string, unknown>>(str, { responseType: 'json', withCredentials: true })
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
	deleteReport(reportId: string): Observable<StoryReport | ScenarioReport | GroupReport> {
		return this.http
			.delete<StoryReport | ScenarioReport | GroupReport>(this.apiService.apiServer + '/report/' + reportId, ApiService.getOptions())
			.pipe(tap(_ => {
				//
			}));
	}

	/**
    * Marks a report as saved in the report history
    * @param reportId
    * @returns
  */
	saveReport(reportId: string): Observable<StoryReport | ScenarioReport | GroupReport> {
		return this.http
			.put<StoryReport | ScenarioReport | GroupReport>(this.apiService.apiServer + '/report/save/' + reportId, {}, ApiService.getOptions())
			.pipe(tap(_ => {
				//
			}));
	}

	/**
    * Marks a saved report as not saved
    * @param reportId
    * @returns
  */
	unsaveReport(reportId: string): Observable<StoryReport | ScenarioReport | GroupReport> {
		return this.http
			.put<StoryReport | ScenarioReport | GroupReport>(this.apiService.apiServer + '/report/unsave/' + reportId, {}, ApiService.getOptions())
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