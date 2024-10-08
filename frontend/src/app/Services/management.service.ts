import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { ApiService } from "../Services/api.service";
import { HttpClient } from "@angular/common/http";
import { catchError, tap } from "rxjs/operators";
import { User } from "../model/User";

/**
 * Service for communication between components for managment and the backend
 */
@Injectable({
  providedIn: "root",
})
export class ManagementService {
  /**
   * @ignore
   */
  constructor(public apiService: ApiService, private http: HttpClient) {}

  /**
   * Creates a jira account
   * @param request
   * @returns
   */
  createJiraAccount(request) {
    return this.http
      .post<any>(
        this.apiService.apiServer + "/jira/user/create/",
        request,
        ApiService.getOptions()
      )
      .pipe(tap());
  }

  /**
   * Disconnects the Jira account
   * @returns
   */
  disconnectJiraAccount() {
    return this.http
      .delete<any>(
        this.apiService.apiServer + "/jira/user/disconnect/",
        ApiService.getOptions()
      )
      .pipe(tap());
  }

  /**
   * Retrieves data of the user
   * @returns
   */
  getUserData(): Observable<User> {
    return this.http
      .get<User>(this.apiService.apiServer + "/user/", ApiService.getOptions())
      .pipe(
        tap((_) => {
          //
        }),
        catchError(this.apiService.handleStoryError)
      );
  }
  /**
   * Deletes a seed-test user
   * @returns
   */
  deleteUser() {
    return this.http
      .delete<any>(
        this.apiService.apiServer + "/user/",
        ApiService.getOptions()
      )
      .pipe(
        tap((_) => {
          //
        }),
        catchError(this.apiService.handleStoryError)
      );
  }
  /**
   * Disconnects the user from github
   * @returns
   */
  disconnectGithub() {
    const str = this.apiService.apiServer + "/github/disconnectGithub";
    return this.http.delete<any>(str, ApiService.getOptions()).pipe(
      tap((_) => {
        //
      }),
      catchError(this.apiService.handleError)
    );
  }
  /**
   * Downloading custom project in a file
   * @param repo_id
   * @param version_id
   * @returns
   */
  downloadProjectFeatureFiles(repo_id, version_id = ""): Observable<Blob> {
    return this.http.get<Blob>(
      this.apiService.apiServer + "/story/download/project/" + repo_id,
      {
        withCredentials: true,
        responseType: "blob" as "json",
        params: { version_id: version_id },
      }
    );
  }

  /**
   * Downloading importable custom project in a file
   * @param repo_id
   * @param version_id
   * @returns
   */
  exportProject(repo_id, version_id = ""): Observable<Blob> {
    return this.http.get<Blob>(
      this.apiService.apiServer + "/story/download/export/" + repo_id,
      {
        withCredentials: true,
        responseType: "blob" as "json",
        params: { version_id: version_id },
      }
    );
  }

  /**
   * Uploading importable custom project
   * @param repo_id: ID of the existing project
   * @param projectName: If a new project is being created, this is the name used
   * @param file: File which should be imported
   * @param importMode: Determines mode of duplicationHandling true for renaming, false for overwriting
   * @returns
   */
  importProject(file: File, repo_id: string, projectName: string, importMode: boolean): Observable<Blob> {
    const formData: FormData = new FormData();
    formData.append("file", file, file.name);

    if (projectName) {
      return this.http.post<Blob>(
        this.apiService.apiServer + "/story/upload/import/",
        formData,
        {
          withCredentials: true,
          responseType: "json",
          params: { projectName: projectName },
        }
      );
    } else {
      return this.http.put<Blob>(
        this.apiService.apiServer + "/story/upload/import/",
        formData,
        {
          withCredentials: true,
          responseType: "json",
          params: { projectName: projectName, repo_id: repo_id, importMode: importMode },
        }
      );
    }
  }
}
