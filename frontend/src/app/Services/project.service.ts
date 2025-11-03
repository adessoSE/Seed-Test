import { AiConfig } from '@shared/models/RepositoryContainer';
import { EventEmitter, Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { ApiService } from '../Services/api.service';
import { HttpClient } from '@angular/common/http';
import { catchError, tap } from 'rxjs/operators';
import { RepositoryContainer } from '@shared/models/RepositoryContainer';
import { FileElement } from '../model/FileElement';


/**
 * Service for communication between repositories and the backend
 */
@Injectable({
  providedIn: 'root'
})
export class ProjectService {

  /**
   * @ignore
   */
  constructor(public apiService: ApiService, private http: HttpClient) { }
  /**
    * Event emitter to rename the project
  */
  public renameProjectEvent = new EventEmitter();
  /**
    * Event emitter to create the repository
  */
  public createRepositoryEmitter: EventEmitter<any> = new EventEmitter();
  /**
    * Event emitter to update the repository
  */
  public updateRepositoryEvent: EventEmitter<any> = new EventEmitter();
  /**
    * Event emitter to delete the repository
  */
  public deleteRepositoryEvent = new EventEmitter();
  /**
    * Event Emitter to distribute the repositories to all components
  */
  public getRepositoriesEvent = new EventEmitter();
  /**
    * Emits the delete repository event
  */
  public deleteRepositoryEmitter() {
    this.deleteRepositoryEvent.emit();
  }
  /**
    * Emits to rename project event
    * @param proj
  */
  renameProjectEmitter(proj: RepositoryContainer) {
    this.renameProjectEvent.emit(proj);
  }
  /**
 * Emits to create repository event
 * @param repository
 */
  createRepositoryEvent(repository) {
    this.createRepositoryEmitter.emit(repository);
  }

  public transferOwnershipEvent = new EventEmitter();

  transferOwnershipEmitter() {
    this.transferOwnershipEvent.emit();
  }
  changeOwner(repoId, email): Observable<RepositoryContainer> {
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
    this.updateRepositoryEvent.emit();
  }
  /**
 * Emits if repositories should be reloaded
 */
  public getRepositoriesEmitter() {
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
   * @param user //TODO: remove user, not used anymore
   * @returns
  */
  public updateRepository(repoID, newRepoName: string, user: any, settings: any = null, aiConfig: AiConfig = null): Observable<any> {
    // 1. Start with a clean base object.
    const updateData: any = { 
        repoName: newRepoName 
    };

    // 2. Conditionally add 'settings' if it has a value.
    if (settings) {
      updateData.settings = settings;
    }
    
    // 3. Conditionally add 'aiConfig' if it has a value.
    if (aiConfig) {
      updateData.aiConfig = aiConfig;
    }
    
    console.log('Final update payload:', updateData);

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

  /**
   * Delete one Repository
   * @param repo
   * @param user //TODO: Remove user, not needed anymore
   * @returns
  */
  deleteRepository(repo: RepositoryContainer, user) {
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
  addToWorkgroup(_id: string, user) {
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
  updateWorkgroupUser(_id: string, user) {
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
      }))
  }


  private querySubject: BehaviorSubject<FileElement[]> = new BehaviorSubject<FileElement[]>([]);

  public getUploadedFiles(repoId: string): Observable<FileElement[]> {
    return this.http.get<FileElement[]>(this.apiService.apiServer + '/files/' + repoId, ApiService.getOptions())
      .pipe(
        tap(files => console.log(files)), // Optional: Log files
        catchError(error => {
          console.error('Error fetching uploaded files:', error);
          return throwError(error);
        })
      );
  }

  public queryFiles(repoId: string): Observable<FileElement[]> {
    // Perform API call if querySubject is empty
    this.getUploadedFiles(repoId).subscribe(
      response => {
        this.querySubject.next(response);
      },
      error => {
        console.error('Error fetching uploaded files:', error);
        this.querySubject.error(error);
      }
    );
    return this.querySubject.asObservable();
  }

  /**
   * deleteUploadedFile
   */
  public deleteUploadedFile(fileId: string) {
    return this.http
      .delete(this.apiService.apiServer + '/files/' + fileId, ApiService.getOptions())
      .pipe(tap(_ => {
        this.querySubject.next([...this.querySubject.value.filter((item) => item._id != fileId)])
      }));
  }

  /**
   * uploadFile
   */
  public uploadFile(repoId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file, file.name)
    return this.http
      .post(`${this.apiService.apiServer}/files/${repoId}`, formData, ApiService.getOptions())
      .pipe(tap((result: FileElement) => {
        const currentDate = new Date();
        const formattedDate = `${currentDate.getDate().toString().padStart(2, '0')}/${(currentDate.getMonth() + 1).toString().padStart(2, '0')}/${currentDate.getFullYear()} ${currentDate.getHours().toString().padStart(2, '0')}:${currentDate.getMinutes().toString().padStart(2, '0')}`;
        result.uploadDate = formattedDate;
        this.querySubject.next([...this.querySubject.value, result])
        return result
      }));
  }
}
