import { EventEmitter, Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../Services/api.service';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Scenario } from '@shared/models/Scenario';
import { Background } from '@shared/models/Background';
import { NotificationService } from './notification.service';
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

	/** Signal for rename background action — carries the new name */
	readonly renameBackgroundValue = signal<string | null>(null);
	/** @deprecated EventEmitter bridge — subscribe to renameBackgroundValue() signal in Phase 2 */
	public renameBackgroundEvent = new EventEmitter();

	/** Signal for background changed trigger */
	readonly backgroundChangedTrigger = signal(0);
	/** @deprecated EventEmitter bridge — subscribe to backgroundChangedTrigger() signal in Phase 2 */
	public backgroundChangedEvent = new EventEmitter();

	/**
    * Track if background was replaced
  */
	public backgroundReplaced = false;

	/** Signal for apply background changes action — carries the option string */
	readonly applyChangesBackgroundValue = signal<string | null>(null);
	/** @deprecated EventEmitter bridge — subscribe to applyChangesBackgroundValue() signal in Phase 2 */
	public applyChangesBackgroundEvent = new EventEmitter();

	/**
    * Sets the apply background changes value
    * @param option
  */
	public applyBackgroundChanges(option: string) {
		this.applyChangesBackgroundValue.set(option);
		this.applyChangesBackgroundEvent.emit(option);
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
		this.backgroundChangedEvent.emit();
	}
	/**
  * Sets the background rename value
  */
	renameBackgroundEmit(newBackgroundName: string) {
		this.renameBackgroundValue.set(newBackgroundName);
		this.renameBackgroundEvent.emit(newBackgroundName);
	}
	/**
   * Updates the background
   * @param storyID
   * @param background
   * @returns
  */
	public updateBackground(storyID: any, background: Background): Observable<Background> {
		return this.http
			.put<Background>(this.apiService.apiServer + '/background/' + storyID , background, ApiService.getOptions())
			.pipe(tap(_ => {
				console.log('Update background for story ' + storyID);
			}));
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
	deleteBackground(storyID: any): Observable<any> {
		return this.http
			.delete<any>(this.apiService.apiServer + '/background/' + storyID , ApiService.getOptions())
			.pipe(tap(() => {
				//
			}));
	}

}
