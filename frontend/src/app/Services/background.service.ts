import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../Services/api.service';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Background } from '@seed-test/shared/models/Background';
import { NotificationService } from './notification.service';
import { ActionTrigger } from './action-trigger';
/**
 * Service for communication between background of the story and the backend
 */
@Injectable({
	providedIn: 'root'
})
export class BackgroundService {
	apiService = inject(ApiService);
	private http = inject(HttpClient);
	notify = inject(NotificationService);

	/** Action channel for rename background — carries the new name */
	readonly renameBackgroundTrigger = new ActionTrigger<string>();
	/** Signal for background changed trigger */
	readonly backgroundChangedTrigger = signal(0);
	/**
    * Track if background was replaced
  */
	public backgroundReplaced = false;

	/** Action channel for apply background changes — carries the option string */
	readonly applyChangesBackgroundTrigger = new ActionTrigger<string>();
	/**
    * Emits the apply background changes option
    * @param option
  */
	public applyBackgroundChanges(option: string) {
		this.applyChangesBackgroundTrigger.emit(option);
	}

	/**
    * Track current background before saving changes
  */
	public currentBackground!: Background;
	/**
  * Triggers the background changed signal
  */
	public backgroundChangedEmitter() {
		this.backgroundChangedTrigger.update(n => n + 1);
	}
	/**
  * Sets the background rename value
  */
	renameBackgroundEmit(newBackgroundName: string) {
		this.renameBackgroundTrigger.emit(newBackgroundName);
	}
	/**
   * Updates the background
   * @param storyID
   * @param background
   * @returns
  */
	public updateBackground(storyID: string, background: Background): Observable<Background> {
		return this.http
			.put<Background>(this.apiService.apiServer + '/background/' + storyID , background, ApiService.getOptions());
	}
	/**
    * Checking the same name of the background
    * @param buttonId
    * @param input
    * @param array
    * @param background?
    * @returns
  */
	public backgroundUnique(buttonId: string, input: string, array: Background[], background?: Background) {
		array = array ? array : [];
		input = input ? input : '';
		const button = (document.getElementById(buttonId)) as HTMLButtonElement;
		if ((input && !array.find(i => i.name === input)) || (background ? array.find(g => g.name === background.name && g.name === input) : false)) 
			button.disabled = false;
		else {
			button.disabled = true;
			this.notify.error('This Background Title is already in use. Please choose another Title');
		}
	}
	/**
    * Deletes the background
    * @param storyID
    * @param storySource
    * @returns
  */
	deleteBackground(storyID: string): Observable<Background> {
		return this.http
			.delete<Background>(this.apiService.apiServer + '/background/' + storyID , ApiService.getOptions())
			.pipe(tap(() => {
				//
			}));
	}

}
