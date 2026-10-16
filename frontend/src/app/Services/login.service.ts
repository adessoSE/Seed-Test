import { Injectable, inject, signal } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { ApiService } from '../Services/api.service';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
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

/** Response from GET /user/github/state: the OAuth state bound to this browser session */
interface GithubStateResponse {
	state: string;
}

/** Response from the merge-initiate endpoint */
interface MergeInitiateResponse {
	mergeToken: string;
}

/**
 * True when the backend rejected the hashed login because the account still has a legacy password
 * (401 with data.code LEGACY_PASSWORD, see user.controller login). Only this response may trigger the plaintext fallback.
 * @param err error from the hashed login request
 * @returns true for a legacy-account rejection
 */
function isLegacyPasswordRejection(err: unknown): boolean {
	if (!(err instanceof HttpErrorResponse) || err.status !== 401) return false;
	const body = err.error as { data?: { code?: unknown } } | null;
	return body?.data?.code === 'LEGACY_PASSWORD';
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
   * Starts the github login: fetches the OAuth state from the backend, then redirects to GitHub with it.
   * The state is required because the backend rejects a callback that does not carry the state it issued.
   * @returns observable that emits the state once the redirect has been triggered
   */
	public githubLogin(): Observable<string> {
		return this.fetchGithubState().pipe(
			tap((state) => this.redirectTo(this.buildGithubAuthorizeUrl(state)))
		);
	}

	/**
   * Requests a new OAuth state. The backend stores it in this browser's session, so the request must carry
   * the session cookie and the callback must come back from the same browser.
   * @returns observable with the state value
   */
	fetchGithubState(): Observable<string> {
		const url = this.apiService.apiServer + '/user/github/state';
		return this.http.get<GithubStateResponse>(url, ApiService.getOptions()).pipe(
			map((resp) => resp.state),
			catchError(this.apiService.handleError)
		);
	}

	/**
   * Builds the GitHub authorize URL. The state is URL-encoded because it is part of the query string.
   * @param state the value from fetchGithubState
   * @returns the authorize URL
   */
	buildGithubAuthorizeUrl(state: string): string {
		const scope = 'repo';
		const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
		const clientId = localStorage.getItem('clientId');
		return `${AUTHORIZE_URL}?scope=${scope}&client_id=${clientId}&state=${encodeURIComponent(state)}`;
	}

	/**
   * Navigates the browser to the given URL. Kept as a method so specs can observe the redirect without leaving the page.
   * @param url absolute URL to navigate to
   */
	protected redirectTo(url: string): void {
		window.location.href = url;
	}

	/**
   * Returns the callback from github to the backend
   * @param code authorization code from GitHub
   * @param state the state GitHub echoed back; the backend compares it with the one issued for this session
   * @returns
   */
	githubCallback(code: string, state: string): Observable<GithubCallbackResponse> {
		const url = this.apiService.apiServer + '/user/callback';
		const params = new HttpParams().set('code', code).set('state', state);
		return this.http.get<GithubCallbackResponse>(url, { ...ApiService.getOptions(), params }).pipe(
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
		const str = this.apiService.apiServer + '/user/login';

		// HttpClient already parses the JSON body. The former pipe was discarded (a no-op), and
		// running JSON.parse on the parsed object would throw, so the raw request is returned.
		// legacyPassword: true marks this as the plaintext retry; the backend only accepts plaintext with this flag.
		const req1: Observable<User> = this.http.post<User>(str, { ...user, legacyPassword: true }, ApiService.getOptions());
		return req1;
	}
	/**
   * Loggs in a user
   * @param user
   * @returns
   */
	loginUser(user: LoginCredentials): Observable<User | null> {
		const str = this.apiService.apiServer + '/user/login';
		// Digest is sent in every context: sha256Hex falls back to pure TS without crypto.subtle (plain http),
		// so digest-stored accounts can log in over http too. Plaintext is only sent by the legacy retry below.
		return from(sha256Hex(user.password)).pipe(
			switchMap(hash => {
				const req1: Observable<User> = this.http.post<User>(str, { ...user, password: hash }, ApiService.getOptions());
				return req1.pipe(
					tap(ab=> {if (ab._id) return ab; else throw Error('unsuccessfull');}),
					// Only a legacy-account rejection (data.code LEGACY_PASSWORD) retries with the plaintext password.
					// Wrong password, 429 and 500 are rethrown, so the plaintext is never sent for them.
					catchError((err: unknown) => isLegacyPasswordRejection(err) ? this.loginUserLegacy(user) : throwError(() => err))
				);
			}),
			catchError(error => {
				console.error('error in login process', error);
				// Outer catch: hashing failures and rejections the legacy fallback did not handle
				// Rethrow instead of of(null): a null result looked like an empty success to the callers,
				// so a rejected login navigated silently. The caller's error handler reports the failure.
				return throwError(() => error);
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
		// The Jira session stays server-side. Do not persist it in localStorage: any script
		// running on the page (e.g. via XSS) could read it.
		return this.http
			.post(
				this.apiService.apiServer + '/jira/login',
				body,
				ApiService.getOptions()
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
		// JiraSession is no longer written; this clears values left behind by older builds
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
   * Registers a user for a seed-test account. When sent from a logged-in GitHub-only account, the backend
   * adds the login to that session account, so no account id is sent from the client.
   * @param email
   * @param password
   * @returns
   */
	registerUser(email: string, password: string): Observable<User> {
		const user: Record<string, unknown> = { email, password };

		return from(sha256Hex(user.password as string)).pipe(
			switchMap(hash => {
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
