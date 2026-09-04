import { AiConfig, RepositoryContainer } from '@seed-test/shared/models/RepositoryContainer';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, of, throwError, ReplaySubject } from 'rxjs';
import { ApiService } from '../Services/api.service';
import { HttpClient, HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { catchError, map, tap } from 'rxjs/operators';
import { FileElement } from '@seed-test/shared/models/FileElement';

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

	/** Signal for rename project action — carries the RepositoryContainer */
	readonly renameProjectValue = signal<RepositoryContainer | null>(null);
	/** Signal for create repository action — carries the repository object */
	readonly createRepositoryValue = signal<CreateRepositoryPayload | null>(null);
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
    * Sets the rename project value
    * @param proj
  */
	renameProjectEmitter(proj: RepositoryContainer) {
		this.renameProjectValue.set(proj);
	}
	/**
  * Sets the create repository value
  * @param repository
  */
	createRepositoryEvent(repository: CreateRepositoryPayload) {
		this.createRepositoryValue.set(repository);
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
			.pipe(tap(_ => {
				//
			}),
			catchError(this.apiService.handleError));

	}


	/**
   * Emits if repositories changed and invalidates cache
   */
	public updateRepositoryEmitter() {
		this.updateRepositoryTrigger.update(n => n + 1);
		this.refreshRepositories();
	}
	/**
   * Triggers repositories reload signal and invalidates the getRepositories cache
   * so the next call fetches fresh data from the server.
   */
	public getRepositoriesEmitter() {
		this.getRepositoriesTrigger.update(n => n + 1);
		this.refreshRepositories();
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
			.post<RepositoryContainer>(this.apiService.apiServer + '/repository/', body, ApiService.getOptions())
			.pipe(tap(_ => {
				//
			}));
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
			.put<RepositoryContainer>(this.apiService.apiServer + '/repository/settings/' + repoID + '/', updateData, ApiService.getOptions())
			.pipe(tap(_ => {
				//
			}));
	}

	/** Cached replay subject for getRepositories — shares the last HTTP response across subscribers */
	private repositoriesCache$ = new ReplaySubject<RepositoryContainer[]>(1);

	/** Guards against concurrent HTTP fetch */
	private repositoriesFetchInFlight = false;

	/**
    * Retrieves the repositories, caching the last HTTP response so all concurrent
    * callers share a single request. Call refreshRepositories() to force a new fetch.
    * On HTTP error the UI never hangs on a broken ReplaySubject — but the failure
    * is classified: auth/authorization errors (401/403) clear the list to empty,
    * while any other transient error (500, 429, network) retains the last good
    * cached list instead of silently replacing it with [].
    * @returns
    */
	getRepositories(): Observable<RepositoryContainer[]> {
		// Lazy fetch — only runs HTTP once; subsequent subscribers get the cached ReplaySubject value
		if (!this.repositoriesFetchInFlight) {
			this.repositoriesFetchInFlight = true;
			const str = this.apiService.apiServer + '/repository/';

			this.http.get<RepositoryContainer[]>(str, ApiService.getOptions())
				.pipe(
					tap(resp => {
						sessionStorage.setItem('repositories', JSON.stringify(resp));
					}),
					catchError(this.apiService.handleError)
				)
				.subscribe({
					next: resp => this.repositoriesCache$.next(resp),
					error: (err) => {
						// CASE 1: Auth/authorization failure (401/403) — legitimately no
						// projects for this session. Clear to empty so the UI shows an
						// empty project list instead of a hung spinner.
						const status = (err as HttpErrorResponse)?.status;
						if (status === HttpStatusCode.Unauthorized || status === HttpStatusCode.Forbidden)
							this.repositoriesCache$.next([]);
						else {
							// CASE 2: Transient/other failure (500, 429, network) — retain the
							// last good cached list so the error does NOT masquerade as an
							// empty project, and surface the error in the console.
							console.error('Failed to fetch repositories:', err);
							const cached = sessionStorage.getItem('repositories');
							if (cached)
								try {
									this.repositoriesCache$.next(JSON.parse(cached));
								} catch {
									this.repositoriesCache$.next([]);
								}
							else
								this.repositoriesCache$.next([]);
						}
						// Allow next caller to retry the HTTP fetch
						this.repositoriesFetchInFlight = false;
					}
				});
		}

		return this.repositoriesCache$.asObservable();
	}

	/**
   * Forces a fresh HTTP fetch of the repository list, invalidating the cache.
   * Call after create / delete / rename operations so the next getRepositories()
   * subscriber receives up-to-date data.
   */
	refreshRepositories(): void {
		this.repositoriesFetchInFlight = false;
		this.repositoriesCache$ = new ReplaySubject<RepositoryContainer[]>(1);
		// Immediately kick off a new fetch so subscribers don't wait
		this.getRepositories();
	}

	/**
   * Inserts a freshly-created repository into the repositories cache and the
   * sessionStorage snapshot so the UI shows it immediately after create.
   *
   * WHY: The create flow triggers an async HTTP refresh (refreshRepositories) but
   * also synchronously re-reads sessionStorage (updateRepos / updateRepositories).
   * Reading sessionStorage before the new fetch writes back yields a stale list that
   * hides the just-created project until a later refresh — a create/refresh race.
   * Writing the new entry synchronously here closes that gap: every downstream
   * sessionStorage reader now sees the fresh list, and the eventual server response
   * still overwrites it with the authoritative list.
   * @param repo The repository just created by the backend.
   */
	public addRepositoryToCache(repo: RepositoryContainer): void {
		// Read the current snapshot so we append to the latest list rather than overwriting with [].
		const currentStr = sessionStorage.getItem('repositories');
		const current = currentStr ? (JSON.parse(currentStr) as RepositoryContainer[]) : [];
		// Deduplicate by _id — a subsequent server refresh may carry the same entry.
		const updated = current.filter(r => r._id !== repo._id).concat(repo);
		sessionStorage.setItem('repositories', JSON.stringify(updated));

		// Feed the shared ReplaySubject so reactive consumers that already subscribed
		// (e.g. app.component getRepositories) also observe the fresh list.
		this.repositoriesCache$.next(updated);
	}

	/**
 * Retrieves the global settings from the repository
 * @returns
*/
	getRepositorySettings(repoId: string) {
		const str = this.apiService.apiServer + '/repository/settings/' + repoId;

		return this.http.get<RepositoryContainer['settings']>(str, ApiService.getOptions())
			.pipe(
				tap(settings => {
					console.log('received settings:', settings);
				}),
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
				tap(aiConfig => {
					console.log('received AI configuration:', aiConfig);
				}),
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
			.pipe(tap(() => {
				//
			}),
			catchError(this.apiService.handleError));
	}
	/**
   * Adds a user to a workgroup
   * @param _id
   * @param user
   * @returns
  */
	addToWorkgroup(_id: string, user: WorkgroupMember) {
		return this.http
			.post<WorkgroupResponse>(this.apiService.apiServer + `/workgroup/${_id}/members`, user, ApiService.getOptions())
			.pipe(tap(_ => {
				//
			}));
	}

	/**
   * Updates a user in a workgroup
   * @param _id
   * @param user
   * @returns
   */
	updateWorkgroupUser(_id: string, user: WorkgroupMember) {
		return this.http
			.put<WorkgroupResponse>(this.apiService.apiServer + `/workgroup/${_id}/members`, user, ApiService.getOptions())
			.pipe(tap(_ => {
				//
			}));
	}
	/**
   * Retrieves a workgroup
   * @param _id
   * @returns
  */
	getWorkgroup(_id: string) {
		return this.http
			.get<WorkgroupResponse>(this.apiService.apiServer + `/workgroup/${_id}/members`, ApiService.getOptions())
			.pipe(tap(_ => {
				//
			}));
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
			.delete<WorkgroupResponse>(this.apiService.apiServer + `/workgroup/${_id}/members`, options)
			.pipe(tap(_ => {
				//
			}));
	}


	/** Reactive file elements state — replaces BehaviorSubject */
	readonly fileElements = signal<FileElement[]>([]);

	public getUploadedFiles(repoId: string): Observable<FileElement[]> {
		return this.http.get<FileElement[]>(this.apiService.apiServer + '/files/' + repoId, ApiService.getOptions())
			.pipe(
				tap(files => console.log(files)),
				catchError(error => {
					console.error('Error fetching uploaded files:', error);
					return throwError(error);
				})
			);
	}

	/** Fetches files from backend and updates the fileElements signal */
	public queryFiles(repoId: string): Observable<FileElement[]> {
		return this.getUploadedFiles(repoId).pipe(
			tap(response => {
				this.fileElements.set(response);
			}),
			catchError(error => {
				console.error('Error fetching uploaded files:', error);
				return of([] as FileElement[]);
			})
		);
	}

	/**
   * deleteUploadedFile
   */
	public deleteUploadedFile(repoId: string, fileId: string) {
		return this.http
			.delete(this.apiService.apiServer + '/files/' + repoId + '/' + fileId, ApiService.getOptions())
			.pipe(tap(_ => {
				this.fileElements.update(files => files.filter((item) => item._id != fileId));
			}));
	}

	/**
   * uploadFile
   */
	public uploadFile(repoId: string, file: File) {
		const formData = new FormData();
		formData.append('file', file, file.name);
		return this.http
			.post(`${this.apiService.apiServer}/files/${repoId}`, formData, ApiService.getOptions())
			.pipe(tap((result: FileElement) => {
				const currentDate = new Date();
				const formattedDate = `${currentDate.getDate().toString().padStart(2, '0')}/${(currentDate.getMonth() + 1).toString().padStart(2, '0')}/${currentDate.getFullYear()} ${currentDate.getHours().toString().padStart(2, '0')}:${currentDate.getMinutes().toString().padStart(2, '0')}`;
				result.uploadDate = formattedDate;
				this.fileElements.update(files => [...files, result]);
				return result;
			}));
	}
}
