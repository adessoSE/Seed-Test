import { AiConfig, RepositoryContainer } from '@seed-test/shared/models/RepositoryContainer';
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of, shareReplay, switchMap, tap, throwError } from 'rxjs';
import { ApiService } from '../Services/api.service';
import { FileElement } from '@seed-test/shared/models/FileElement';
import { ActionTrigger } from './action-trigger';

/** Workgroup member with email and edit permission */
interface WorkgroupMember {
	email: string;
	canEdit: boolean;
}

/** Response from workgroup endpoints containing member list and owner */
interface WorkgroupResponse {
	member: WorkgroupMember[];
	owner: { email: string };
}

/** Payload for creating a new repository */
interface CreateRepositoryPayload {
	repositoryContainer: RepositoryContainer;
	name: string;
}

/** Update data sent when modifying repository settings */
interface RepositoryUpdateData {
	repoName: string;
	settings?: RepositoryContainer['settings'];
	aiConfig?: AiConfig;
}


/**
 * Service for communication between repositories and the backend
 */
@Injectable({
	providedIn: 'root'
})
export class ProjectService {
	apiService = inject(ApiService);
	private http = inject(HttpClient);

	/** Action channel for rename project — every emit is a separate request, so repeated renames are never merged */
	readonly renameProjectTrigger = new ActionTrigger<RepositoryContainer>();
	/** Action channel for create repository — every emit is a separate request, so back-to-back creations are never merged */
	readonly createRepositoryTrigger = new ActionTrigger<CreateRepositoryPayload>();
	/** Signal for update repository trigger */
	readonly updateRepositoryTrigger = signal(0);
	/** Signal for delete repository trigger */
	readonly deleteRepositoryTrigger = signal(0);
	/** Signal for get repositories trigger */
	readonly getRepositoriesTrigger = signal(0);
	/** Triggers the delete repository signal */
	public deleteRepositoryEmitter() {
		this.deleteRepositoryTrigger.update(n => n + 1);
	}
	/**
    * Requests a rename. Emits a copy: the modal mutates its object between requests, and consumers must
    * receive the values as they were at emit time.
    * @param proj
   */
	renameProjectEmitter(proj: RepositoryContainer) {
		this.renameProjectTrigger.emit({ ...proj });
	}
	/**
    * Requests a repository creation
    * @param repository
    */
	createRepositoryEvent(repository: CreateRepositoryPayload) {
		this.createRepositoryTrigger.emit(repository);
	}

	/** Signal for transfer ownership trigger */
	readonly transferOwnershipTrigger = signal(0);
	/** Triggers the transfer ownership signal */
	transferOwnershipEmitter() {
		this.transferOwnershipTrigger.update(n => n + 1);
	}
	changeOwner(repoId: string, email: string): Observable<RepositoryContainer> {
		const url = this.apiService.apiServer + '/repository/owner/' + repoId;
		return this.http
			.put<RepositoryContainer>(url, { email: email }, ApiService.getOptions())
			.pipe(catchError(this.apiService.handleError));

	}


	/**
    * Emits if repositories changed and invalidates cache
    */
	public updateRepositoryEmitter() {
		this.updateRepositoryTrigger.update(n => n + 1);
		this.refreshRepositories();
		// Fire-and-forget fetch — subscribes so the cold Observable actually issues the HTTP request
		// and updates repositoriesSignal. The in-flight guard prevents duplicate requests.
		this.getRepositories().subscribe({ error: () => { /* already logged by getRepositories() */ } });
	}
	/**
    * Triggers repositories reload signal and invalidates the getRepositories cache
    * so the next call fetches fresh data from the server.
    */
	public getRepositoriesEmitter() {
		this.getRepositoriesTrigger.update(n => n + 1);
		this.refreshRepositories();
		// Fire-and-forget fetch — subscribes so the cold Observable actually issues the HTTP request
		// and updates repositoriesSignal. The in-flight guard prevents duplicate requests.
		// WHY: Without an error handler RxJS rethrows the failure as an unhandled error. The
		// failure is already logged and the signal keeps its last good value in getRepositories().
		this.getRepositories().subscribe({ error: () => { /* already logged by getRepositories() */ } });
	}


	/**
    * Creates a new repository / project
    * @param name
    * @param _id
    * @returns
   */
	createRepository(name: string, _id: string): Observable<RepositoryContainer> {
		const body = { 'name': name, '_id': _id };
		return this.http
			.post<RepositoryContainer>(this.apiService.apiServer + '/repository/', body, ApiService.getOptions());
	}
	/**
    * Updates repo
    * @param repoID
    * @param newRepoName
    * @param settings
	//TODO: remove user, not used anymore
    * @returns
   */
	public updateRepository(repoID: string, newRepoName: string, _user: unknown, settings: RepositoryContainer['settings'] | null = null, aiConfig: AiConfig | null = null): Observable<RepositoryContainer> {
		// 1. Start with a clean base object.
		const updateData: RepositoryUpdateData = {
			repoName: newRepoName
		};

		// 2. Conditionally add 'settings' if it has a value.
		if (settings) 
			updateData.settings = settings;
    
    
		// 3. Conditionally add 'aiConfig' if it has a value.
		if (aiConfig) 
			updateData.aiConfig = aiConfig;
    

		const logData = structuredClone(updateData);

		if (logData.aiConfig?.textPreparation?.apiKey) 
			logData.aiConfig.textPreparation.apiKey = '*** HIDDEN ***';
    

		if (logData.aiConfig?.jsonConversion?.apiKey) 
			logData.aiConfig.jsonConversion.apiKey = '*** HIDDEN ***';
    

		console.log('Final update payload:', logData);

		return this.http
			.put<RepositoryContainer>(this.apiService.apiServer + '/repository/settings/' + repoID + '/', updateData, ApiService.getOptions());
	}

	/**
	 * The shared getRepositories() request: in flight, or completed and cached until
	 * refreshRepositories() drops it. Null when nothing was fetched since the last refresh
	 * or the last request failed.
	 */
	private repositoriesRequest: Observable<RepositoryContainer[]> | null = null;

	/**
	 * Bumped by refreshRepositories(). A response only writes repositoriesSignal when its
	 * request started under the current value, so an older response that arrives late
	 * cannot overwrite a newer list (#049).
	 */
	private repositoriesRequestSeq = 0;

	/**
	 * Single source of truth for the repository list.
	 *
	 * WHY: Replaces the old BehaviorSubject hybrid pattern. The signal is the
	 * only state holder — all consumers read directly from it (effects, computed
	 * signals). The HTTP fetch path updates the signal on success; on error the
	 * signal retains its last good value so transient failures never masquerade
	 * as an empty project list.
	 */
	readonly repositoriesSignal = signal<RepositoryContainer[]>([]);

	/**
    * Retrieves repositories from the server and updates `repositoriesSignal`.
    *
    * Returns an Observable that emits the HTTP response once on success.
    * Callers can subscribe to react to the response; the signal is always
    * the authoritative value for downstream effects and computed reads.
    *
    * WHY: Only one HTTP request fires per refresh cycle. Concurrent callers share
    * the in-flight request, and callers after a success get the cached list, so
    * none of them sees an empty stream. A failed request is not cached, so the
    * next call retries. After refreshRepositories() the next call starts a fresh fetch.
    * The signal is read independently by callers that need the current cached value
    * (they read repositoriesSignal() directly — no Observable needed).
    * @returns Observable emitting the fetched repository list on success.
    */
	getRepositories(): Observable<RepositoryContainer[]> {
		// CASE 1: a request is in flight or already succeeded since the last refresh — share it.
		// Returning the same Observable (instead of an empty one) makes every caller receive the list.
		if (this.repositoriesRequest)
			return this.repositoriesRequest;

		// CASE 2: nothing cached, or the previous request failed or was invalidated — start a new one
		const url = this.apiService.apiServer + '/repository/';
		const requestSeq = this.repositoriesRequestSeq;

		// The signal is updated inside tap, not as a new HTTP trigger, so signal writes
		// cannot cause additional requests (no feedback loop).
		const request$: Observable<RepositoryContainer[]> = this.http.get<RepositoryContainer[]>(url, ApiService.getOptions()).pipe(
			tap(resp => {
				// Stale response: a refresh happened after this request started, so a newer list is coming
				if (requestSeq !== this.repositoriesRequestSeq)
					return;
				// Update the signal with the fresh server response.
				sessionStorage.setItem('repositories', JSON.stringify(resp));
				this.repositoriesSignal.set(resp);
			}),
			catchError((err: { status?: number }) => {
				// Drop the failed request from the cache so the next call retries instead of replaying the error
				if (this.repositoriesRequest === request$)
					this.repositoriesRequest = null;
				// 401/403 → auth failure, clear signal so stale data doesn't linger
				if (err.status === 401 || err.status === 403) {
					if (requestSeq === this.repositoriesRequestSeq)
						this.repositoriesSignal.set([]);
					console.error('Auth error fetching repositories:', err);
					return throwError(() => err);
				}
				// Transient error (500, network, 429, etc.) → retain signal value
				// because the signal is the single source of truth.
				console.error('Failed to fetch repositories:', err);
				return throwError(() => err);
			}),
			// Cache the successful result so later subscribers replay it instead of issuing a new request
			shareReplay({ bufferSize: 1, refCount: false })
		);
		this.repositoriesRequest = request$;
		return request$;
	}

	/**
    * Forces a fresh HTTP fetch of the repository list, invalidating the cache.
    * Call after create / delete / rename operations so the next getRepositories()
    * subscriber receives up-to-date data.
    *
    * WHY: Drops the cached request so the next getRepositories() call starts a
    * new HTTP request, and invalidates any request still in flight so its response
    * cannot overwrite the newer list. Does NOT modify repositoriesSignal — the signal
    * retains the last good value until the fresh response arrives (or fails).
    */
	refreshRepositories(): void {
		this.repositoriesRequest = null;
		this.repositoriesRequestSeq++;
	}

	/**
	 * Drops all repository state of the current user: the cached request, repositoriesSignal
	 * and the sessionStorage copy. Call on logout, before another user logs in.
	 *
	 * WHY: The shareReplay cache lives as long as the tab, so without this a re-login as
	 * another user replays the previous user's list. The seq bump in refreshRepositories()
	 * also discards a response that is still in flight from the old session, so it cannot
	 * repopulate the signal after logout.
	 */
	clearRepositories(): void {
		this.refreshRepositories();
		this.repositoriesSignal.set([]);
		sessionStorage.removeItem('repositories');
	}

	/**
    * Inserts a freshly-created repository into the repositories signal so the
    * UI shows it immediately after create.
    *
    * WHY: The create flow triggers an async HTTP refresh (refreshRepositories) but
    * also synchronously re-reads sessionStorage (updateRepos / updateRepositories).
    * Reading sessionStorage before the new fetch writes back yields a stale list that
    * hides the just-created project until a later refresh — a create/refresh race.
    * Writing to the signal here ensures the source-of-truth has the fresh entry;
    * downstream effects reading from the signal (not sessionStorage) will immediately
    * propagate it to all components, and the eventual server response still overwrites
    * with the authoritative list.
    * @param repo The repository just created by the backend.
    */
	public addRepositoryToCache(repo: RepositoryContainer): void {
		const current = this.repositoriesSignal();
		// Deduplicate by _id — a subsequent server refresh may carry the same entry.
		const updated = current.filter(r => r._id !== repo._id).concat(repo);
		this.repositoriesSignal.set(updated);

		// Keep sessionStorage in sync for non-signal consumers (e.g. old fallback code).
		sessionStorage.setItem('repositories', JSON.stringify(updated));
	}

	/**
	 * Retrieves the global settings from the repository
	 * @returns
	*/
	getRepositorySettings(repoId: string) {
		const str = this.apiService.apiServer + '/repository/settings/' + repoId;

		return this.http.get<RepositoryContainer['settings']>(str, ApiService.getOptions())
			.pipe(
				catchError(this.apiService.handleError)
			);
	}

	/**
    * Retrieves the dedicated AI configuration for a repository.
    * @param repoId The ID of the repository.
    * @returns An Observable with the AI configuration.
    */
	getRepositoryAiConfig(repoId: string): Observable<AiConfig> {
		const str = this.apiService.apiServer + '/repository/aiconfig/' + repoId;
		return this.http.get<AiConfig>(str, ApiService.getOptions())
			.pipe(
				catchError(this.apiService.handleError)
			);
	}

	checkAiAvailability(): Observable<boolean> {
		return this.http.get<{ available: boolean }>(this.apiService.apiServer + '/ai/available')
			.pipe(
				map(res => res.available),
				catchError(() => of(false))
			);
	}

	/**
    * Delete one Repository
    * @param repo
	//TODO: Remove user, not needed anymore
    * @returns
   */
	deleteRepository(repo: RepositoryContainer, _user: unknown) {
		const str = this.apiService.apiServer + '/repository/' + repo._id;
		return this.http.delete<RepositoryContainer>(str, ApiService.getOptions())
			.pipe(catchError(this.apiService.handleError));
	}
	/**
    * Adds a user to a workgroup
    * @param _id
    * @param user
    * @returns
   */
	addToWorkgroup(_id: string, user: WorkgroupMember) {
		return this.http
			.post<WorkgroupResponse>(this.apiService.apiServer + `/workgroup/${_id}/members`, user, ApiService.getOptions());
	}

	/**
    * Updates a user in a workgroup
    * @param _id
    * @param user
    * @returns
    */
	updateWorkgroupUser(_id: string, user: WorkgroupMember) {
		return this.http
			.put<WorkgroupResponse>(this.apiService.apiServer + `/workgroup/${_id}/members`, user, ApiService.getOptions());
	}
	/**
    * Retrieves a workgroup
    * @param _id
    * @returns
   */
	getWorkgroup(_id: string) {
		return this.http
			.get<WorkgroupResponse>(this.apiService.apiServer + `/workgroup/${_id}/members`, ApiService.getOptions());
	}

	/**
    * Removes a user from a workgroup
    * @param _id
    * @param email
    * @returns
    */
	removeFromWorkgroup(_id: string, email: string) {
		const user = { email: email.toLowerCase() };
		const options = { 
			...ApiService.getOptions(),
			body: user // Add the user object to the 'body' property within options
		};
       
		return this.http
			.delete<WorkgroupResponse>(this.apiService.apiServer + `/workgroup/${_id}/members`, options);
	}


	/** Reactive file elements state — replaces BehaviorSubject */
	readonly fileElements = signal<FileElement[]>([]);

	public getUploadedFiles(repoId: string): Observable<FileElement[]> {
		return this.http.get<FileElement[]>(this.apiService.apiServer + '/files/' + repoId, ApiService.getOptions())
			.pipe(
				catchError(error => {
					console.error('Error fetching uploaded files:', error);
					return throwError(() => error);
				})
			);
	}

	/** Fetches files from backend and updates the fileElements signal */
	public queryFiles(repoId: string): Observable<FileElement[]> {
		return this.getUploadedFiles(repoId).pipe(
			catchError(error => {
				console.error('Error fetching uploaded files:', error);
				return [];
			})
		);
	}

	/**
    * deleteUploadedFile
    */
	public deleteUploadedFile(repoId: string, fileId: string) {
		return this.http
			.delete(this.apiService.apiServer + '/files/' + repoId + '/' + fileId, ApiService.getOptions())
			.pipe(
				switchMap(() => {
					this.fileElements.update(files => files.filter((item) => item._id != fileId));
					return [];
				})
			);
	}

	/**
    * uploadFile
    */
	public uploadFile(repoId: string, file: File) {
		const formData = new FormData();
		formData.append('file', file, file.name);
		return this.http
			.post(`${this.apiService.apiServer}/files/${repoId}`, formData, ApiService.getOptions())
			.pipe(
				switchMap((result: FileElement) => {
					const currentDate = new Date();
					const formattedDate = `${currentDate.getDate().toString().padStart(2, '0')}/${(currentDate.getMonth() + 1).toString().padStart(2, '0')}/${currentDate.getFullYear()} ${currentDate.getHours().toString().padStart(2, '0')}:${currentDate.getMinutes().toString().padStart(2, '0')}`;
					result.uploadDate = formattedDate;
					this.fileElements.update(files => [...files, result]);
					return [result];
				})
			);
	}
}