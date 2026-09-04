import { Injectable, inject, signal } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { ApiService } from '../Services/api.service';
import { HttpClient } from '@angular/common/http';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import type { User } from '@seed-test/shared/models/User';
import { sha256Hex } from './crypto';

/** Response from the GitHub OAuth callback endpoint */
interface GithubCallbackResponse {
	error?: boolean;
	status?: number;
	login: string;
	id: number;
}

/** Response from the merge-initiate endpoint */
interface MergeInitiateResponse {
	mergeToken: string;
}

/** Credentials payload for login endpoints */
interface LoginCredentials {
	email: string;
	password: string;
	stayLoggedIn?: boolean;
}

/** Response from password reset request */
interface ResetResponse {
	message: string;
}

/**
 * Service for communication between login component and the backend
 */
@Injectable({
	providedIn: 'root'
})
export class LoginService {
	apiService = inject(ApiService);
	private http = inject(HttpClient);

	/** Signal for logout trigger */
	readonly logoutTrigger = signal(0);
	/** Triggers the logout signal */
	public logoutEmitter() {
		this.logoutTrigger.update(n => n + 1);
	}

	/** TODO: Look, if it still needed as it seems callback is doing this now?
   * Starts the github login
   */
	public githubLogin() {
		const scope = 'repo';
		const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
		const s = `${AUTHORIZE_URL}?scope=${scope}&client_id=${localStorage.getItem(
			'clientId'
		)}`;
		window.location.href = s;
	}
	/**
   * Returns the callback from github to the backend
   * @param code
   * @returns
   */
	githubCallback(code: string): Observable<GithubCallbackResponse> {
		const url = this.apiService.apiServer + '/user/callback?code=' + code;
		return this.http.get<GithubCallbackResponse>(url, { withCredentials: true }).pipe(
			tap((_) => {
				//
			}),
			catchError(this.apiService.handleError)
		);
	}

	/**
    * Initiates a GitHub account merge. Proves ownership of the target Seed account
    * by making the server verify that the current session user is the target account.
    * Returns a server-signed token that is passed through the OAuth state parameter
    * to survive the GitHub redirect.
    * @param userId — the target Seed account ID (must be the current session user)
    * @returns observable with mergeToken
    */
	initiateMergeGithub(userId: string) {
		const str = this.apiService.apiServer + '/user/mergeGithub/initiate';
		const body = { userId };

		return this.http.post<MergeInitiateResponse>(str, body, ApiService.getOptions()).pipe(
			tap((_) => {}),
			catchError(this.apiService.handleError)
		);
	}
	/**
    * Merges Seed-Test account and github account.
    * The mergeToken (from initiateMergeGithub) is now required — it is the server-signed
    * proof of ownership that replaced the old client-controlled userId field.
    * @param mergeToken
    * @returns
    */
	mergeAccountGithub(mergeToken: string) {
		const str = this.apiService.apiServer + '/user/mergeGithub';
		const body = { mergeToken };

		return this.http.post<User>(str, body, ApiService.getOptions()).pipe(
			tap((_) => {}),
			catchError(this.apiService.handleError)
		);
	}
	/**
   * Loggs in a user
   * @param user
   * @returns
   */
	loginUserLegacy(user: LoginCredentials): Observable<User | null> {
		console.log('legacy Login');
		const str = this.apiService.apiServer + '/user/login';

		const req1: Observable<User> = this.http.post<User>(str, user, ApiService.getOptions());
		req1.pipe(
			map(response=>JSON.parse(response as unknown as string)),
			catchError(this.apiService.handleError)
		);
		return req1;
	}
	/**
   * Loggs in a user
   * @param user
   * @returns
   */
	loginUser(user: LoginCredentials): Observable<User | null> {
		const str = this.apiService.apiServer + '/user/login';
		if (!window.isSecureContext) return this.loginUserLegacy(user);
		return from(sha256Hex(user.password)).pipe(
			switchMap(hash => {
				console.log('hashed', hash);
				const req1: Observable<User> = this.http.post<User>(str, { ...user, password: hash }, ApiService.getOptions());
				return req1.pipe(
					tap(ab=> {if (ab._id) return ab; else throw Error('unsuccessfull');}),
					catchError((err, _caught)=> {console.log('err', err); return this.loginUserLegacy(user);})
				);
			}),
			catchError(error => {
				console.log('error in login process', error);
				// handle error when login fails
				return of(null);
			})
		);
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
			jiraServer: jiraServer
		};
		return this.http
			.post(
				this.apiService.apiServer + '/jira/login',
				body,
				ApiService.getOptions()
			)
			.pipe(
				tap((resp) => {
					localStorage.setItem('JiraSession', resp.toString());
				})
			);
	}
	/**
   * Requests a password reset
   * @param email
   * @returns
   */
	public requestReset(email: string): Observable<ResetResponse> {
		const body = { email: email };
		return this.http
			.post<ResetResponse>(this.apiService.apiServer + '/user/resetpassword/', body)
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
	confirmReset(uuid: string, password: string): Observable<ResetResponse> {
		return from(sha256Hex(password)).pipe(
			switchMap(hash => {
				console.log('hashed', hash);
				const req1: Observable<ResetResponse> = this.http.patch<ResetResponse>(this.apiService.apiServer + '/user/reset', { uuid: uuid, password: hash });
				return req1.pipe(
					tap((_) => {
						//
					})
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
		return !!localStorage.getItem('login');
	}
	/**
   * Logs out the user
   * @returns
   */
	logoutUser() {
		const url = this.apiService.apiServer + '/user/logout';
		localStorage.removeItem('login');
		// Clear persisted repoId so a subsequent login by a different user
		// does not send a stale repoId that triggers a 403.
		localStorage.removeItem('id');
		localStorage.removeItem('repository');
		localStorage.removeItem('source');
		// Clear all session-specific keys that could leak stale data
		// across users (Jira session, GitHub repo type, userId, report state).
		localStorage.removeItem('JiraSession');
		localStorage.removeItem('repositoryType');
		localStorage.removeItem('userId');
		localStorage.removeItem('reportComponent');
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
	registerUser(email: string, password: string, userId: string | null): Observable<User> {
		const user: Record<string, unknown> = { email, password };
		if (userId) 
			user.userId = userId;

		return from(sha256Hex(user.password as string)).pipe(
			switchMap(hash => {
				console.log('hashed', hash);
				const req1: Observable<User> = this.http.post<User>(this.apiService.apiServer + '/user/register', { ...user, password: hash }, ApiService.getOptions());
				return req1.pipe(
					tap((_) => {
						//
					})
				);
			}),
			catchError(this.apiService.handleError)
		);
	}
}
