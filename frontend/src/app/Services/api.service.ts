import { Injectable, inject, signal } from '@angular/core';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError, from } from 'rxjs';
import { User } from '@seed-test/shared/models/User';
import { RepositoryContainer } from '@seed-test/shared/models/RepositoryContainer';
import { sha256Hex } from './crypto';

/** Backend info response from /backendInfo endpoint */
interface BackendInfo {
	url: string;
	clientId: string;
	version: string;
	gecko_enabled: string;
	chromium_enabled: string;
	edge_enabled: string;
	webkit_enabled: string;
	gecko_emulators: string;
	chromium_emulators: string;
	edge_emulators: string;
}

/** GitHub issue submission payload */
interface GitHubIssueRequest {
	title: string;
	body: string;
	assignees: string[];
	milestone: number | null;
	labels: string[];
}

/** GitHub issue submission response */
interface GitHubIssueResponse {
	id: number;
	number: number;
	html_url: string;
}

/** Payload for changing the user's own password while logged in */
export interface ChangePasswordPayload {
	currentPassword: string;
	newPassword: string;
}

/**
 * Service for communication between components and the backend
 */
@Injectable({
	providedIn: 'root'
})
export class ApiService {
	private http = inject(HttpClient);


	/**
    * url of the backend
    */
	public apiServer: string = localStorage.getItem('url_backend') || 'http://localhost:8080/api';

	/**
   * If the backend url was received
   */
	public urlReceived =
		localStorage.getItem('url_backend') &&
    localStorage.getItem('url_backend') !== 'undefined';

	/** Signal for stories error trigger */
	readonly storiesErrorTrigger = signal(0);
	/** Signal for backend URL ready trigger */
	readonly backendUrlReadyTrigger = signal(0);
	/** Signal for run/save option — carries the option string */
	readonly runSaveOptionValue = signal<string | null>(null);
	/** Signal for copy step with example — carries the option string */
	readonly copyStepWithExampleValue = signal<string | null>(null);
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
		this.runSaveOptionValue.set(option);
	}

	/**
   * Sets the copy with example option value
   * @param option
   */
	public copyStepWithExampleOption(option: string) {
		this.copyStepWithExampleValue.set(option);
	}

	/**
   * Handles the error from retrieve stories
   * @param error
   * @param caught
   * @returns
   */
	handleStoryError = <T>(_error: HttpErrorResponse, _caught: Observable<T>): Observable<T> => {
		this.storiesErrorTrigger.update(n => n + 1);
		// Cast the fallback empty array to the caller's expected type — callers vary
		// between Story[] and User, but on error we always fall back to an empty result
		return of([] as unknown as T);
	};

	/**
    * Initializes backend info before Angular app boot — called by APP_INITIALIZER.
    * Also updates the logger URL so LoggerModule config resolves correctly.
    */
	async initializeBackendInfo(): Promise<void> {
		if (this.urlReceived) return; // Already initialized
		await this.getBackendInfo();
		const url = localStorage.getItem('url_backend');
		if (url) localStorage.setItem('log_url', url);
	}

	/**
    * Retrieves the backend info for all api request necessary.
    * Idempotent — returns immediately if urlReceived is already true.
    * @returns
    */
	getBackendInfo(): Promise<string | undefined> {
		// Idempotent guard — skip if already initialized
		if (this.urlReceived) return Promise.resolve(localStorage.getItem('url_backend') ?? undefined);

		const url = localStorage.getItem('url_backend');
		const clientId = localStorage.getItem('clientId');
		const version = localStorage.getItem('version');
		const gecko_enabled = localStorage.getItem('gecko_enabled');
		const chromium_enabled = localStorage.getItem('chromium_enabled');
		const edge_enabled = localStorage.getItem('edge_enabled');
		const webkit_enabled = localStorage.getItem('webkit_enabled');

		const gecko_emulators = localStorage.getItem('gecko_emulators');
		const chromium_emulators = localStorage.getItem('chromium_emulators');
		const edge_emulators = localStorage.getItem('edge_emulators');
		const playwright_emulators = localStorage.getItem('playwright_emulators');

		if (
			url &&
      url !== 'undefined' &&
      clientId &&
      clientId !== 'undefined' &&
      version &&
      version !== 'undefined' &&
      gecko_enabled &&
      gecko_enabled !== 'undefined' &&
      chromium_enabled &&
      chromium_enabled !== 'undefined' &&
      edge_enabled &&
      edge_enabled !== 'undefined' &&
      webkit_enabled &&
      webkit_enabled !== 'undefined' &&
      gecko_emulators &&
      gecko_emulators !== 'undefined' &&
      chromium_emulators &&
      chromium_emulators !== 'undefined' &&
      edge_emulators &&
      edge_emulators !== 'undefined' &&
      playwright_emulators &&
      playwright_emulators !== 'undefined'
		) {
			this.urlReceived = true;
			this.backendUrlReadyTrigger.update(n => n + 1);
			return Promise.resolve(url);
		} else
			return this.http
				.get<BackendInfo>(
					window.location.origin + '/backendInfo',
					ApiService.getOptions()
				)
				.toPromise()
				.then((backendInfo) => {
					localStorage.setItem('url_backend', backendInfo!.url);
					localStorage.setItem('clientId', backendInfo!.clientId);
					localStorage.setItem('version', backendInfo!.version);
					localStorage.setItem('gecko_enabled', backendInfo!.gecko_enabled);
					localStorage.setItem(
						'chromium_enabled',
						backendInfo!.chromium_enabled
					);
					localStorage.setItem('edge_enabled', backendInfo!.edge_enabled);
					localStorage.setItem('webkit_enabled', backendInfo!.webkit_enabled);
					localStorage.setItem('gecko_emulators', backendInfo!.gecko_emulators);
					localStorage.setItem(
						'chromium_emulators',
						backendInfo!.chromium_emulators
					);
					localStorage.setItem('edge_emulators', backendInfo!.edge_emulators);
					this.getPlaywrightEmulators().subscribe();

					this.urlReceived = true;
					this.backendUrlReadyTrigger.update(n => n + 1);

					return backendInfo!.url;
				});

	}

	/**
    * Updates the logged-in user's password.
    * Sends { currentPassword, newPassword } to the backend;
    * backend rejects unknown fields and returns 401 on wrong currentPassword.
    * CRITICAL: both values are SHA-256-hashed before sending, matching how
    * login.service.ts hashes register/login. The stored hash is
    * bcrypt(SHA-256(pw)), so the controller's bcrypt.compare only matches a
    * hashed value — sending raw passwords made change-password never verify
    * and silently return 401.
    * @param userID - MongoDB ObjectId of the user
    * @param payload - current and new password values
    * @returns Observable of the updated User
    */
	updateUser(userID: string, payload: ChangePasswordPayload): Observable<User> {
		this.apiServer = localStorage.getItem('url_backend')!;
		// Hash both passwords the same way the login service hashes credentials,
		// otherwise bcrypt.compare inside the controller never matches the stored
		// hash (which is bcrypt(SHA-256(password))) and the change returns 401.
		return from(sha256Hex(payload.currentPassword)).pipe(
			switchMap(currentHash => from(sha256Hex(payload.newPassword)).pipe(
				switchMap(newHash => this.http
					// withCredentials is required: the SPA (port 4200) and backend
					// (port 8080) are cross-origin, so without it the session cookie
					// is never sent and isAuthenticated 401s before the controller runs
					.post<User>(this.apiServer + '/user/update/' + userID, {
						currentPassword: currentHash,
						newPassword: newHash
					}, ApiService.getOptions())
					// NOTE: deliberately NOT piping through handleStoryError here. That
					// helper swallows errors into an empty success result, which would
					// mask the 401 "wrong current password" and turn it into apparent
					// success. The change-password 401 must propagate so the
					// account-management component can render the inline form error.
				)
			))
		);
	}

	/**
    * Sets the available emulation devices of playwright
    */
	getPlaywrightEmulators(): Observable<string[]> {
		this.apiServer = localStorage.getItem('url_backend')!;
		return this.http.get<string[]>(
			this.apiServer + '/playwright/device-names',
			ApiService.getOptions()
		).pipe(
			tap(emulators => {
				localStorage.setItem('playwright_emulators', emulators.join(','));
			}),
			catchError(error => {
				console.error('Fehler beim Abrufen der Playwright-Geräte:', error);
				return throwError(() => error);
			})
		);
	}


	/**
   * Submitts an issue to github to create a new step
   * @param obj
   * @returns
   */
	submitGithub(obj: GitHubIssueRequest) {
		this.apiServer = localStorage.getItem('url_backend')!;
		return this.http.post<GitHubIssueResponse>(
			this.apiServer + '/github/submitIssue/',
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
		return repo.source === 'github';
	}

	/**
   * If the repo is a jira repo
   * @param repo
   * @returns
   */
	isJiraRepo(repo: RepositoryContainer): boolean {
		return repo.source === 'jira';
	}

	/**
   * If the repo is a custom project
   * @param repo
   * @returns
   */
	isCustomRepo(repo: RepositoryContainer): boolean {
		return repo.source === 'db';
	}

	resolveSpecialCommand(command: string) {
		this.apiServer = localStorage.getItem('url_backend')!;
		return this.http.post<string>(
			this.apiServer + '/story/specialCommands/resolve',
			{ command: command },
			ApiService.getOptions()
		);
	}
}
