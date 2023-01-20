import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../Services/api.service';
import { HttpClient } from '@angular/common/http';
import { catchError, tap } from 'rxjs/operators';

/**
 * Service for communication between report component and the backend
 */
@Injectable({
  providedIn: 'root'
})
export class ReportService {

  /**
    * @ignore
  */
  constructor(public apiService: ApiService, private http: HttpClient) { }
  /**
   * Retrieves a report
   * @param reportId
   * @returns
  */
  getReport(reportId: string) {
    if (this.apiService.apiServer) {
      const str = this.apiService.apiServer + '/mongo/report/' + reportId;
      return this.http.get(str, { responseType: 'json', withCredentials: true })
        .pipe(tap(resp => {
          console.log('Got single Report: ' + resp);
        }),
        catchError(ApiService.handleError));
    }
  }
  /**
    * Retrieves a report
    * @param reportName: name of the Report
    * @returns
  */
  getReportByName(reportName: string) {
    if (this.apiService.apiServer) {
      const str = this.apiService.apiServer + '/run/report/' + reportName;
      return this.http.get(str, { responseType: 'json', withCredentials: true })
        .pipe(tap(_ => {
          //
        }),
        catchError(ApiService.handleError));
    }
  }
  /**
    * Deletes a report
    * @param reportId
    * @returns
  */
  deleteReport(reportId): Observable<any> {
    console.log('delete reportId', reportId);
    return this.http
      .delete<any>(this.apiService.apiServer + '/run/report/' + reportId, ApiService.getOptions())
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
      .get<any>(this.apiService.apiServer + '/run/saveReport/' + reportId, ApiService.getOptions())
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
      .get<any>(this.apiService.apiServer + '/run/unsaveReport/' + reportId, ApiService.getOptions())
      .pipe(tap(_ => {
        //
      }));
  }
  /**
   * Retrieves the report history of a story
   * @param storyId
   * @returns
  */
  getReportHistory(storyId: string) {
    return this.http
      .get<any>(this.apiService.apiServer + '/run/reportHistory/' + storyId, ApiService.getOptions())
      .pipe(tap(() => {
        //
      }));
  }

}
