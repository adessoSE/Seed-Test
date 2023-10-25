import { EventEmitter, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../Services/api.service';
import { HttpClient } from '@angular/common/http';
import { catchError, tap } from 'rxjs/operators';
import { RepositoryContainer } from '../model/RepositoryContainer';


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
}
