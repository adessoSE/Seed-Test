import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../Services/api.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, tap } from 'rxjs/operators';
import { NotificationService } from './notification.service';
import { Group } from '@shared/models/Group';
import type { RepositoryContainer } from '@shared/models/RepositoryContainer';

/** Payload for creating a custom group via the signal */
interface CreateGroupPayload {
	repositoryContainer: RepositoryContainer;
	group: { title: string; member_stories: string[]; isSequential: boolean };
}

/** Payload for updating a group via the signal */
interface UpdateGroupPayload {
	repositoryContainer: RepositoryContainer;
	group: Group;
}

/** Payload for deleting a group via the signal */
interface DeleteGroupPayload {
	repo_id: string;
	group_id: string;
}

/** Test execution parameters for running groups */
interface GroupExecutionParams {
	repository: string;
	source: string;
}

/** Parameters for running a temporary group */
interface TempGroupParams {
	id?: string | null;
	repositoryId?: string | null;
	repository: string | null;
	source: string | null;
	group: Record<string, unknown>;
}

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
	readonly createCustomGroupValue = signal<CreateGroupPayload | null>(null);
	/** Signal for update group action — carries the group object */
	readonly updateGroupValue = signal<UpdateGroupPayload | null>(null);
	/** Signal for delete group action — carries the values */
	readonly deleteGroupValue = signal<DeleteGroupPayload | null>(null);
	/**
    * Sets the create group value
    * @param group
  */
	createGroupEvent(group: CreateGroupPayload) {
		this.createCustomGroupValue.set(group);
	}
	/**
   * Sets the update group value
   * @param group
  */
	updateGroupEvent(group: UpdateGroupPayload) {
		this.updateGroupValue.set(group);
	}
	/**
    * Sets the delete group value
  */
	public deleteGroupEvent(values: DeleteGroupPayload) {
		this.deleteGroupValue.set(values);
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
	updateGroup(repoId: string, groupId: string, updatedGroup: Group): Observable<Group> {
		return this.http
			.put<Group>(this.apiService.apiServer + '/group/' + repoId + '/' + groupId, updatedGroup, ApiService.getOptions());
	}
	/**
    * Create a group
    * @param title
    * @param repoId
    * @param member_stories
    * @param isSequential
    * @returns
  */
	createGroup(title: string, repoId: string, member_stories: string[], isSequential: boolean): Observable<Group> {
		return this.http
			.post<Group>(this.apiService.apiServer + '/group/' + repoId, { 'name': title, 'member_stories': member_stories, 'sequence': isSequential }, ApiService.getOptions());
	}
	updateGroupsArray(repoId: string, groupsArray: Group[]) {
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
	runGroup(repoID: string, groupID: string, params: GroupExecutionParams) {
		const timeout = 6000000;
		return this.http
			.post(this.apiService.apiServer + '/execute/Group/' + repoID + '/' + groupID, params, { withCredentials: true, headers: new HttpHeaders({ timeout: `${timeout}` }) });
	}

	/*
  * Running a temporary group with precondition storys
  */
	runTempGroup(params: TempGroupParams): Observable<unknown> {
		const timeout = 6000000;
		return this.http
			.post(this.apiService.apiServer + '/execute/TempGroup', params, { withCredentials: true, headers: new HttpHeaders({ timeout: `${timeout}` }) });
	}
}
