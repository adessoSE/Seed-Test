import { EventEmitter, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../Services/api.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { Group } from '../model/Group';


/**
 * Service for communication between group component and the backend
 */
@Injectable({
  providedIn: 'root'
})
export class GroupService {

  /**
  * @ignore
  */
  constructor(public apiService: ApiService, private http: HttpClient, public toastr: ToastrService) { }
  /**
    * Event emitter to create a custom group
  */
  public createCustomGroupEmitter: EventEmitter<any> = new EventEmitter();
  /**
    * Event emitter to update a custom group
  */
  public updateGroupEmitter: EventEmitter<any> = new EventEmitter();
  /**
    * Event emitter to delete a custom group
  */
  public deleteGroupEmitter: EventEmitter<any> = new EventEmitter();
  /**
    * Emits the create group event
    * @param group
  */
  createGroupEvent(group) {
    this.createCustomGroupEmitter.emit(group);
  }
  /**
   * Emits the create group event
   * @param group
  */
  updateGroupEvent(group) {
    this.updateGroupEmitter.emit(group);
  }
  /**
    * Emits the delete scenario event
  */
  public deleteGroupEvent(values) {
    this.deleteGroupEmitter.emit(values);
  }
  /**
    * Get groups
    * @param repoId
    * @returns
  */
  getGroups(repoId: string): Observable<Group[]> {
    return this.http
      .get<Group[]>(this.apiService.apiServer + '/group/' + repoId, ApiService.getOptions());
  }
  /**
    * Delete a group
    * @param repoId
    * @param groupId
    * @returns
  */
  deleteGroup(repoId: string, groupId: string) {
    return this.http
      .delete(this.apiService.apiServer + '/group/' + repoId + '/' + groupId, ApiService.getOptions());
  }
  /**
    * Update a group
    * @param repoId
    * @param groupId
    * @param updatedGroup
    * @returns
  */
  updateGroup(repoId: string, groupId: string, updatedGroup: Group): Observable<any> {
    return this.http
      .put(this.apiService.apiServer + '/group/' + repoId + '/' + groupId, updatedGroup, ApiService.getOptions());
  }
  /**
    * Create a group
    * @param title
    * @param repoId
    * @param member_stories
    * @param isSequential
    * @returns
  */
  createGroup(title: string, repoId: string, member_stories, isSequential): Observable<any> {
    return this.http
      .post(this.apiService.apiServer + '/group/' + repoId, { 'name': title, 'member_stories': member_stories, 'sequence': isSequential }, ApiService.getOptions());
  }
  updateGroupsArray(repoId: string, groupsArray) {
    return this.http
      .put(this.apiService.apiServer + '/group/' + repoId, groupsArray, ApiService.getOptions());
  }
  /**
    * Checking the same name of the group
    * @param buttonId
    * @param input
    * @param array
    * @param group
    * @returns
  */
  public groupUnique(buttonId: string, input: string, array: Group[], group?: Group) {
    array = array ? array : [];
    input = input ? input : '';
    const button = (document.getElementById(buttonId)) as HTMLButtonElement;
    if ((input && !array.find(i => i.name === input)) || (group ? array.find(g => g._id == group._id && g.name == input) : false)) {
      button.disabled = false;
    }

    else {
      if (input.length == 0) {
        button.disabled = true;
        this.toastr.error('The field can not be empty');
      }
      else {
        button.disabled = true;
        this.toastr.error('This Group Title is already in use. Please choose another Title');
      }
    }
  }
  /**
    * Running a group
    * @param repoID
    * @param groupID
    * @param params
    * @returns
  */
  runGroup(repoID, groupID, params) {
    const timeout = 6000000;
    return this.http
      .post(this.apiService.apiServer + '/run/Group/' + repoID + '/' + groupID, params, { withCredentials: true, headers: new HttpHeaders({ timeout: `${timeout}` }) });
  }

  /*
  * Running a temporary group with precondition storys
  */
  runTempGroup(params): Observable<any> { 
    const timeout = 6000000;
    return this.http
      .post(this.apiService.apiServer + '/run/TempGroup', params, { withCredentials: true, headers: new HttpHeaders({ timeout: `${timeout}` }) });
  }
}
