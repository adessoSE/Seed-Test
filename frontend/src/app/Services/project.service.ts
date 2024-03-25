import { EventEmitter, Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { ApiService } from '../Services/api.service';
import { HttpClient } from '@angular/common/http';
import { catchError, tap } from 'rxjs/operators';
import { RepositoryContainer } from '../model/RepositoryContainer';
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
    const url = this.apiService.apiServer + '/user/repository/' + repoId;
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
      .post<RepositoryContainer>(this.apiService.apiServer + '/user/createRepository/', body, ApiService.getOptions())
      .pipe(tap(_ => {
        //
      }));
  }
  /**
   * Updates repo
   * @param repoID
   * @param newRepoName
   * @param settings
   * @param user
   * @returns
  */
  public updateRepository(repoID, newRepoName: string, user: any, settings: any = null): Observable<any> {
    let updateData = { repoName: newRepoName };

    if (settings != null) {
      updateData['settings'] = settings;
    }
    console.log(updateData)
    return this.http
      .put<RepositoryContainer>(this.apiService.apiServer + '/user/repository/' + repoID + '/' + user, updateData, ApiService.getOptions())
      .pipe(tap(_ => {
        //
      }));
  }
  /**
   * Retrieves the repositories
   * @returns
  */
  getRepositories(): Observable<RepositoryContainer[]> {
    const str = this.apiService.apiServer + '/user/repositories';

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
    const str = this.apiService.apiServer + '/user/repository/settings/' + repoId;

    return this.http.get<any>(str, ApiService.getOptions())
      .pipe(
        tap(settings => {
          console.log('received settings:', settings);
        }),
        catchError(this.apiService.handleError) 
      );
  }

  /**
   * Delete one Repository
   * @param repo
   * @param user
   * @returns
  */
  deleteRepository(repo: RepositoryContainer, user) {
    const str = this.apiService.apiServer + '/user/repositories/' + repo._id + '/' + user;
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
      .post<any>(this.apiService.apiServer + '/workgroups/wgmembers/' + _id, user, ApiService.getOptions())
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
      .put<any>(this.apiService.apiServer + '/workgroups/wgmembers/' + _id, user, ApiService.getOptions())
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
      .get<any>(this.apiService.apiServer + '/workgroups/wgmembers/' + _id, ApiService.getOptions())
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
    const user = { email };
    return this.http
      .post<any>(this.apiService.apiServer + '/workgroups/deletemember/' + _id, user, ApiService.getOptions())
      .pipe(tap(_ => {
        //
      }));
  }

  
  private querySubject: BehaviorSubject<FileElement[]> = new BehaviorSubject<FileElement[]>([]);

  public getUploadedFiles(repoId: string): Observable<FileElement[]> {
    return this.http.get<FileElement[]>(this.apiService.apiServer + '/story/uploadFile/' + repoId, ApiService.getOptions())
      .pipe(
        tap(files => console.log(files)), // Optional: Log files
        catchError(error => {
          console.error('Error fetching uploaded files:', error);
          return throwError(error);
        })
      );
  }

  public queryFiles(repoId: string): Observable<FileElement[]> {
    if (!this.querySubject.value.length) {
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
    }
    return this.querySubject.asObservable();
  }

  /**
   * deleteUploadedFile
   */
  public deleteUploadedFile(fileId: string) {
    return this.http
      .delete(this.apiService.apiServer + '/story/uploadFile/' + fileId, ApiService.getOptions())
      .pipe(tap(_ => {
        this.querySubject.next([...this.querySubject.value.filter((item) => item._id != fileId)])
      }));
  }

  /**
   * uploadFile
   */
  public uploadFile(repoId: string, file: ArrayBuffer, filename:string) {
    return this.http
      .post(`${this.apiService.apiServer}/story/uploadFile/${repoId}/${filename}`, file ,ApiService.getOptions())
      .pipe(tap((result: FileElement) => {
        const currentDate = new Date();
        const formattedDate = `${currentDate.getDate().toString().padStart(2, '0')}/${(currentDate.getMonth() + 1).toString().padStart(2, '0')}/${currentDate.getFullYear()} ${currentDate.getHours().toString().padStart(2, '0')}:${currentDate.getMinutes().toString().padStart(2, '0')}`;
        result.uploadDate = formattedDate;
        this.querySubject.next([...this.querySubject.value, result])
        return result
      }));
  }
}
