import { EventEmitter, Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../Services/api.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NotificationService } from './notification.service';
import { Group } from '@shared/models/Group';


/**
 * Service for communication between group component and the backend
 */
@Injectable({
	providedIn: 'root'
})
export class GroupService {
	apiService = inject(ApiService);
	private http = inject(HttpClient);
	notify = inject(NotificationService);

	/** Signal for create custom group action — carries the group object */
	readonly createCustomGroupValue = signal<any>(null);
	/** @deprecated EventEmitter bridge — subscribe to createCustomGroupValue() signal in Phase 2 */
	public createCustomGroupEmitter = new EventEmitter();

	/** Signal for update group action — carries the group object */
	readonly updateGroupValue = signal<any>(null);
	/** @deprecated EventEmitter bridge — subscribe to updateGroupValue() signal in Phase 2 */
	public updateGroupEmitter = new EventEmitter();

	/** Signal for delete group action — carries the values */
	readonly deleteGroupValue = signal<any>(null);
	/** @deprecated EventEmitter bridge — subscribe to deleteGroupValue() signal in Phase 2 */
	public deleteGroupEmitter = new EventEmitter();

	/**
    * Sets the create group value
    * @param group
  */
	createGroupEvent(group: any) {
		this.createCustomGroupValue.set(group);
		this.createCustomGroupEmitter.emit(group);
	}
	/**
   * Sets the update group value
   * @param group
  */
	updateGroupEvent(group: any) {
		this.updateGroupValue.set(group);
		this.updateGroupEmitter.emit(group);
	}
	/**
    * Sets the delete group value
  */
	public deleteGroupEvent(values: any) {
		this.deleteGroupValue.set(values);
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
	createGroup(title: string, repoId: string, member_stories: string[], isSequential: boolean): Observable<any> {
		return this.http
			.post(this.apiService.apiServer + '/group/' + repoId, { 'name': title, 'member_stories': member_stories, 'sequence': isSequential }, ApiService.getOptions());
	}
	updateGroupsArray(repoId: string, groupsArray: any) {
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
		if ((input && !array.find(i => i.name === input)) || (group ? array.find(g => g._id == group._id && g.name == input) : false)) 
			button.disabled = false;
    

		else 
			if (input.length == 0) {
				button.disabled = true;
				this.notify.error('The field can not be empty');
			} else {
				button.disabled = true;
				this.notify.error('This Group Title is already in use. Please choose another Title');
			}
    
	}
	/**
    * Running a group
    * @param repoID
    * @param groupID
    * @param params
    * @returns
  */
	runGroup(repoID: string, groupID: string, params: any) {
		const timeout = 6000000;
		return this.http
			.post(this.apiService.apiServer + '/execute/Group/' + repoID + '/' + groupID, params, { withCredentials: true, headers: new HttpHeaders({ timeout: `${timeout}` }) });
	}

	/*
  * Running a temporary group with precondition storys
  */
	runTempGroup(params: any): Observable<any> {
		const timeout = 6000000;
		return this.http
			.post(this.apiService.apiServer + '/execute/TempGroup', params, { withCredentials: true, headers: new HttpHeaders({ timeout: `${timeout}` }) });
	}
}
