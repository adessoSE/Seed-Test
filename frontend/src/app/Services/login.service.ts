import { EventEmitter, Injectable } from "@angular/core";
import { Observable, from, of } from "rxjs";
import { ApiService } from "../Services/api.service";
import { HttpClient, HttpResponse } from "@angular/common/http";
import { catchError, filter, map, switchMap, take, tap } from "rxjs/operators";


/**
 * Service for communication between login component and the backend
 */
@Injectable({
  providedIn: "root",
})
export class LoginService {
  /**
   * @ignore
   */
  constructor(public apiService: ApiService, private http: HttpClient) {}
  /**
   * Event emitter to logout the user
   */
  public logoutEvent = new EventEmitter();
  /**
   * Starts the github login
   */
  public githubLogin() {
    const scope = "repo";
    const AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
    const s = `${AUTHORIZE_URL}?scope=${scope}&client_id=${localStorage.getItem(
      "clientId"
    )}`;
    window.location.href = s;
  }
  /**
   * Returns the callback from github to the backend
   * @param code
   * @returns
   */
  githubCallback(code: string): Observable<any> {
    const url = this.apiService.apiServer + "/user/callback?code=" + code;
    return this.http.get(url, { withCredentials: true }).pipe(
      tap((_) => {
        //
      }),
      catchError(this.apiService.handleError)
    );
  }

  /**
   * Loggs in the user with a github token
   * @param login
   * @param id
   * @returns
   */
  loginGithubToken(login: string, id): Observable<any> {
    const str = this.apiService.apiServer + "/user/githubLogin";
    const user = { login, id };

    return this.http.post<any>(str, user, ApiService.getOptions()).pipe(
      tap((_) => {
        //
      }),
      catchError(this.apiService.handleError)
    );
  }
  /**
   * Merges Seed-Test account and github account
   * @param userId
   * @param login
   * @param id
   * @returns
   */
  mergeAccountGithub(userId: string, login: string, id: any) {
    const str = this.apiService.apiServer + "/user/mergeGithub";
    const body = { userId, login, id };

    return this.http.post<any>(str, body, ApiService.getOptions()).pipe(
      tap((_) => {
        //
      }),
      catchError(this.apiService.handleError)
    );
  }
  /**
   * Loggs in a user
   * @param user
   * @returns
   */
  loginUserLegacy(user): Observable<any> {
    console.log('legacy Login')
    const str = this.apiService.apiServer + "/user/login";

    const req1: Observable<any> = this.http.post<any>(str, user, ApiService.getOptions())
    req1.pipe(
      map(response=>JSON.parse(response)),
      catchError(this.apiService.handleError)
    );
    return req1;
  }
  /**
   * Loggs in a user
   * @param user
   * @returns
   */
  loginUser(user: any): Observable<any> {
    const str = this.apiService.apiServer + "/user/login";
    if(!window.isSecureContext) return this.loginUserLegacy(user);
    return from(this.sha256(user.password)).pipe(
      switchMap(hash => {
        console.log('hashed', hash)
        const req1: Observable<any> = this.http.post<any>(str, { ...user, password: hash }, ApiService.getOptions());
        return req1.pipe(
          tap(ab=> {if(ab._id)return ab; else throw Error('unsuccessfull')}),
          catchError((err, caught)=> {console.log('err', err); return this.loginUserLegacy(user)})
        );
      }),
      catchError(error => {
        console.log('error in login process', error)
        // handle error when login fails
        return of(null);
      })
    );
  }

sha256 = async (data) => {
    const textAsBuffer = new TextEncoder().encode(data);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', textAsBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const digest = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return digest;
}

  /**
   * Loggs in the user into jira
   * @param jiraName
   * @param jiraPassword
   * @param jiraServer
   * @returns
   */
  jiraLogin(jiraName: string, jiraPassword: string, jiraServer: string) {
    const body = {
      jiraAccountName: jiraName,
      jiraPassword: jiraPassword,
      jiraServer: jiraServer,
    };
    return this.http
      .post(
        this.apiService.apiServer + "/jira/login",
        body,
        ApiService.getOptions()
      )
      .pipe(
        tap((resp) => {
          localStorage.setItem("JiraSession", resp.toString());
        })
      );
  }
  /**
   * Requests a password reset
   * @param email
   * @returns
   */
  public requestReset(email: string): Observable<any> {
    const body = { email: email };
    return this.http
      .post<any>(this.apiService.apiServer + "/user/resetpassword/", body)
      .pipe(
        tap((_) => {
          //
        })
      );
  }

  /**
   * Change the old password into the new password
   * @param uuid
   * @param password
   * @returns
   */
  confirmReset(uuid: string, password: string): Observable<any> {
    return from(this.sha256(password)).pipe(
      switchMap(hash => {
        console.log('hashed', hash)
        const req1: Observable<any> = this.http.patch<any>(this.apiService.apiServer + "/user/reset", { uuid: uuid, password: hash });
        return req1.pipe(
          tap((_) => {
            //
          }),
        );
      }),
      catchError(this.apiService.handleError)
    );
  }
  /**
   * If the user is logged in
   * @returns
   */
  isLoggedIn(): boolean {
    return !!localStorage.getItem("login");
  }
  /**
   * Logs out the user
   * @returns
   */
  logoutUser() {
    const url = this.apiService.apiServer + "/user/logout";
    localStorage.removeItem("login");
    return this.http.get<string[]>(url, ApiService.getOptions()).pipe(
      tap((_) => {
        //
      }),
      catchError(this.apiService.handleError)
    );
  }
  /**
   * Registers a user for a seed-test account
   * @param email
   * @param password
   * @param userId
   * @returns
   */
  registerUser(email: string, password: string, userId: any): Observable<any> {
    const user = { email, password, userId };
    return from(this.sha256(user.password)).pipe(
      switchMap(hash => {
        console.log('hashed', hash)
        const req1: Observable<any> = this.http.post<any>(this.apiService.apiServer + "/user/register", { ...user, password: hash }, ApiService.getOptions());
        return req1.pipe(
          tap((_) => {
            //
          }),
        );
      }),
      catchError(this.apiService.handleError)
    );
  }
}
