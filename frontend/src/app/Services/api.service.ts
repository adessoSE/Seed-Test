import { EventEmitter, Injectable } from "@angular/core";
import { catchError, tap } from "rxjs/operators";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Observable, of, throwError } from "rxjs";
import { User } from "../model/User";
import { RepositoryContainer } from "../model/RepositoryContainer";

/**
 * Service for communication between components and the backend
 */
@Injectable({
  providedIn: "root",
})
export class ApiService {
  /**
   * @ignore
   */
  constructor(private http: HttpClient) {}

  /**
   * url of the backend
   */
  public apiServer: string = localStorage.getItem("url_backend");

  // ------------------------------- TOASTR TEMPLATE --------------------------------
  /**
   * name of component
   */
  public nameComponent: string;
  /**
   * name of the first option in the toastr
   */
  public firstOption: string;
  /**
   * name of the second option in the toastr
   */
  public secondOption: string;
  /**
   * set name of component
   * @param nameComponent
   */
  nameOfComponent(nameComponent: string) {
    this.nameComponent = nameComponent;
  }
  /**
   * get name of component that user wants to delete
   * @returns
   */
  getNameOfComponent() {
    return this.nameComponent;
  }
  /**
   * set options for info-warning-toster
   * @param nameComponent
   */
  setToastrOptions(first: string, second: string) {
    this.firstOption = first;
    this.secondOption = second;
  }
  /**
   * get name of options that user wants to execute
   * @returns
   */
  getNameOfToastrOptions() {
    return [this.firstOption, this.secondOption];
  }
  // ------------------------------- TOASTR TEMPLATE -----------------------------

  /**
   * If the backend url was received
   */
  public urlReceived =
    localStorage.getItem("url_backend") &&
    localStorage.getItem("url_backend") !== "undefined";

  /**
   * Event Emitter if the stories could not be retrieved
   * Api
   */
  public storiesErrorEvent = new EventEmitter();

  /**
   * Event Emitter to signal that the backend url is available
   * Api
   */
  public getBackendUrlEvent = new EventEmitter();

  /**
   * Event emitter to save the story / scenario and then run the test
   */
  public runSaveOptionEvent = new EventEmitter();

  /**
   * Event emitter for handling copy of steps with example
   */
  public copyStepWithExampleEvent = new EventEmitter();

  /**
   * Gets api headers
   * @returns
   */
  public static getOptions() {
    return { withCredentials: true };
  }

  /**
   * Handles http error
   * @param error
   * @returns
   */
  public handleError(error: HttpErrorResponse) {
    console.log(JSON.stringify(error));
    return throwError(() => error);
  }

  /**
   * Emits the run save option
   * @param option
   */
  public runSaveOption(option: string) {
    this.runSaveOptionEvent.emit(option);
  }

  /**
   * Emits the copy with example option
   * @param option
   */
  public copyStepWithExampleOption(option: string) {
    this.copyStepWithExampleEvent.emit(option);
  }

  /**
   * Handles the error from retrieve stories
   * @param error
   * @param caught
   * @returns
   */
  handleStoryError = (_error: HttpErrorResponse, _caught: Observable<any>) => {
    this.storiesErrorEvent.emit();
    return of([]);
  };

  /**
   * Retrieves the backend info for all api request necessary
   * @returns
   */
  getBackendInfo(): Promise<any> {
    const url = localStorage.getItem("url_backend");
    const clientId = localStorage.getItem("clientId");
    const version = localStorage.getItem("version");
    const gecko_enabled = localStorage.getItem("gecko_enabled");
    const chromium_enabled = localStorage.getItem("chromium_enabled");
    const edge_enabled = localStorage.getItem("edge_enabled");

    const gecko_emulators = localStorage.getItem("gecko_emulators");
    const chromium_emulators = localStorage.getItem("chromium_emulators");
    const edge_emulators = localStorage.getItem("edge_emulators");

    if (
      url &&
      url !== "undefined" &&
      clientId &&
      clientId !== "undefined" &&
      version &&
      version !== "undefined" &&
      gecko_enabled &&
      gecko_enabled !== "undefined" &&
      chromium_enabled &&
      chromium_enabled !== "undefined" &&
      edge_enabled &&
      edge_enabled !== "undefined" &&
      gecko_emulators &&
      gecko_emulators !== "undefined" &&
      chromium_emulators &&
      chromium_emulators !== "undefined" &&
      edge_emulators &&
      edge_emulators !== "undefined"
    ) {
      this.urlReceived = true;
      this.getBackendUrlEvent.emit();
      return Promise.resolve(url);
    } else {
      return this.http
        .get<any>(
          window.location.origin + "/backendInfo",
          ApiService.getOptions()
        )
        .toPromise()
        .then((backendInfo) => {
          localStorage.setItem("url_backend", backendInfo.url);
          localStorage.setItem("clientId", backendInfo.clientId);
          localStorage.setItem("version", backendInfo.version);
          localStorage.setItem("gecko_enabled", backendInfo.gecko_enabled);
          localStorage.setItem(
            "chromium_enabled",
            backendInfo.chromium_enabled
          );
          localStorage.setItem("edge_enabled", backendInfo.edge_enabled);
          localStorage.setItem("gecko_emulators", backendInfo.gecko_emulators);
          localStorage.setItem(
            "chromium_emulators",
            backendInfo.chromium_emulators
          );
          localStorage.setItem("edge_emulators", backendInfo.edge_emulators);
          this.urlReceived = true;
          this.getBackendUrlEvent.emit();
        });
    }
  }
  /**
   * Updates a user
   * @param userID
   * @param user
   * @returns
   */
  updateUser(userID: string, user: User): Observable<User> {
    //not used
    this.apiServer = localStorage.getItem("url_backend");
    return this.http
      .post<User>(this.apiServer + "/user/update/" + userID, user)
      .pipe(
        tap((_) => {
          //
        }),
        catchError(this.handleStoryError)
      );
  }
  /**
   * Submitts an issue to github to create a new step
   * @param obj
   * @returns
   */
  submitGithub(obj) {
    this.apiServer = localStorage.getItem("url_backend");
    return this.http.post<any>(
      this.apiServer + "/github/submitIssue/",
      obj,
      ApiService.getOptions()
    );
  }
  /**
   * If the repo is github repo
   * @param repo
   * @returns
   */
  isGithubRepo(repo: RepositoryContainer): boolean {
    return repo.source === "github";
  }

  /**
   * If the repo is a jira repo
   * @param repo
   * @returns
   */
  isJiraRepo(repo: RepositoryContainer): boolean {
    return repo.source === "jira";
  }

  /**
   * If the repo is a custom project
   * @param repo
   * @returns
   */
  isCustomRepo(repo: RepositoryContainer): boolean {
    return repo.source === "db";
  }

  resolveSpecialCommand(command) {
    this.apiServer = localStorage.getItem("url_backend");
    return this.http.post<any>(
      this.apiServer + "/story/specialCommands/resolve",
      { command: command },
      ApiService.getOptions()
    );
  }
}
