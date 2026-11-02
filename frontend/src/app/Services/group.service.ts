import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../Services/api.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Group } from '@seed-test/shared/models/Group';
import type { RepositoryContainer } from '@seed-test/shared/models/RepositoryContainer';
import { ActionTrigger } from './action-trigger';

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

	/** Action channel for create custom group — carries the group object */
	readonly createCustomGroupTrigger = new ActionTrigger<CreateGroupPayload>();
	/** Action channel for update group — carries the group object */
	readonly updateGroupTrigger = new ActionTrigger<UpdateGroupPayload>();
	/** Action channel for delete group — carries the values */
	readonly deleteGroupTrigger = new ActionTrigger<DeleteGroupPayload>();
	/**
    * Emits the create group action
    * @param group
  */
	createGroupEvent(group: CreateGroupPayload) {
		this.createCustomGroupTrigger.emit(group);
	}
	/**
   * Emits the update group action
   * @param group
  */
	updateGroupEvent(group: UpdateGroupPayload) {
		this.updateGroupTrigger.emit(group);
	}
	/**
    * Emits the delete group action
  */
	public deleteGroupEvent(values: DeleteGroupPayload) {
		this.deleteGroupTrigger.emit(values);
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
    * Whether another group already uses this name
    * @param input name typed in the modal
    * @param groups existing groups
    * @param group group being edited; its own name does not count as taken
    * @returns true when the name is non-empty and used by a different group
  */
	isGroupNameTaken(input: string, groups: Group[], group?: Group): boolean {
		return !!input && groups.some(g => g.name === input && (!group || g._id !== group._id));
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
