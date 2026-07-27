import { AiConfig, RepositoryContainer } from '@shared/models/RepositoryContainer';
import { EventEmitter, Injectable, inject, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { ApiService } from '../Services/api.service';
import { HttpClient } from '@angular/common/http';
import { catchError, map, tap } from 'rxjs/operators';
import { FileElement } from '@shared/models/FileElement';


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
	/** @deprecated EventEmitter bridge — subscribe to renameProjectValue() signal in Phase 2 */
	public renameProjectEvent = new EventEmitter();

	/** Signal for create repository action — carries the repository object */
	readonly createRepositoryValue = signal<any>(null);
	/** @deprecated EventEmitter bridge — subscribe to createRepositoryValue() signal in Phase 2 */
	public createRepositoryEmitter = new EventEmitter();

	/** Signal for update repository trigger */
	readonly updateRepositoryTrigger = signal(0);
	/** @deprecated EventEmitter bridge — subscribe to updateRepositoryTrigger() signal in Phase 2 */
	public updateRepositoryEvent = new EventEmitter();

	/** Signal for delete repository trigger */
	readonly deleteRepositoryTrigger = signal(0);
	/** @deprecated EventEmitter bridge — subscribe to deleteRepositoryTrigger() signal in Phase 2 */
	public deleteRepositoryEvent = new EventEmitter();

	/** Signal for get repositories trigger */
	readonly getRepositoriesTrigger = signal(0);
	/** @deprecated EventEmitter bridge — subscribe to getRepositoriesTrigger() signal in Phase 2 */
	public getRepositoriesEvent = new EventEmitter();

	/** Triggers the delete repository signal */
	public deleteRepositoryEmitter() {
		this.deleteRepositoryTrigger.update(n => n + 1);
		this.deleteRepositoryEvent.emit();
	}
	/**
    * Sets the rename project value
    * @param proj
  */
	renameProjectEmitter(proj: RepositoryContainer) {
		this.renameProjectValue.set(proj);
		this.renameProjectEvent.emit(proj);
	}
	/**
  * Sets the create repository value
  * @param repository
  */
	createRepositoryEvent(repository: any) {
		this.createRepositoryValue.set(repository);
		this.createRepositoryEmitter.emit(repository);
	}

	/** Signal for transfer ownership trigger */
	readonly transferOwnershipTrigger = signal(0);
	/** @deprecated EventEmitter bridge — subscribe to transferOwnershipTrigger() signal in Phase 2 */
	public transferOwnershipEvent = new EventEmitter();

	/** Triggers the transfer ownership signal and emits event */
	transferOwnershipEmitter() {
		this.transferOwnershipTrigger.update(n => n + 1);
		this.transferOwnershipEvent.emit();
	}
	changeOwner(repoId: string, email: string): Observable<RepositoryContainer> {
		const url = this.apiService.apiServer + '/repository/owner/' + repoId;
		return this.http
			.put<any>(url, { email: email }, ApiService.getOptions())
			.pipe(tap(_ => {
				//
			}),
			catchError(this.apiService.handleError));

	}


	/**
    * Emits if repositories changed
  */
	public updateRepositoryEmitter() {
		this.updateRepositoryTrigger.update(n => n + 1);
		this.updateRepositoryEvent.emit();
	}
	/**
  * Triggers repositories reload signal
  */
	public getRepositoriesEmitter() {
		this.getRepositoriesTrigger.update(n => n + 1);
		this.getRepositoriesEvent.emit();
	}


	/**
    * Creates a new repository / project
    * @param name
    * @param _id
    * @returns
  */
	createRepository(name: string, _id: string): Observable<any> {
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
	public updateRepository(repoID: string, newRepoName: string, user: any, settings: any = null, aiConfig: AiConfig | null = null): Observable<any> {
		// 1. Start with a clean base object.
		const updateData: any = { 
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
	/**
   * Retrieves the repositories
   * @returns
  */
	getRepositories(): Observable<RepositoryContainer[]> {
		const str = this.apiService.apiServer + '/repository/';

		return this.http.get<RepositoryContainer[]>(str, ApiService.getOptions())
			.pipe(tap(resp => {
				sessionStorage.setItem('repositories', JSON.stringify(resp));
				this.updateRepositoryEmitter();
			}),
			catchError(this.apiService.handleError));
	}

	/**
 * Retrieves the global settings from the repository
 * @returns
*/
	getRepositorySettings(repoId: string) {
		const str = this.apiService.apiServer + '/repository/settings/' + repoId;

		return this.http.get<any>(str, ApiService.getOptions())
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
	deleteRepository(repo: RepositoryContainer, _user: any) {
		const str = this.apiService.apiServer + '/repository/' + repo._id;
		return this.http.delete<any>(str, ApiService.getOptions())
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
	addToWorkgroup(_id: string, user: any) {
		return this.http
			.post<any>(this.apiService.apiServer + `/workgroup/${_id}/members`, user, ApiService.getOptions())
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
	updateWorkgroupUser(_id: string, user: any) {
		return this.http
			.put<any>(this.apiService.apiServer + `/workgroup/${_id}/members`, user, ApiService.getOptions())
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
			.get<any>(this.apiService.apiServer + `/workgroup/${_id}/members`, ApiService.getOptions())
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
			.delete<any>(this.apiService.apiServer + `/workgroup/${_id}/members`, options) 
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
