import { EventEmitter, Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { NotificationService } from './notification.service';

/**
 * Service for communication between example component and the backend
 */
@Injectable({
	providedIn: 'root'
})
export class ExampleService {
	apiService = inject(ApiService);
	notify = inject(NotificationService);

	/** Signal for delete example trigger */
	readonly deleteExampleTrigger = signal(0);
	/** @deprecated EventEmitter bridge — subscribe to deleteExampleTrigger() signal in Phase 2 */
	public deleteExampleEvent = new EventEmitter();

	/** Signal for new example action — carries the example name */
	readonly newExampleValue = signal<string | null>(null);
	/** @deprecated EventEmitter bridge — subscribe to newExampleValue() signal in Phase 2 */
	public newExampleEvent = new EventEmitter();

	/** Signal for rename example action — carries the new name */
	readonly renameExampleValue = signal<string | null>(null);
	/** @deprecated EventEmitter bridge — subscribe to renameExampleValue() signal in Phase 2 */
	public renameExampleEvent = new EventEmitter();

	/** Signal for update example table trigger */
	readonly updateExampleTableTrigger = signal(0);
	/** @deprecated EventEmitter bridge — subscribe to updateExampleTableTrigger() signal in Phase 2 */
	public updateExampleTableEvent = new EventEmitter();

	/** Triggers the delete example signal */
	public deleteExampleEmitter() {
		this.deleteExampleTrigger.update(n => n + 1);
		this.deleteExampleEvent.emit();
	}
	/**
  * Sets the new example value
  * @param name example name
  */
	newExampleEmit(name: string) {
		this.newExampleValue.set(name);
		this.newExampleEvent.emit(name);
	}
	/**
  * Sets the rename example value
  * @param name example name
  */
	renameExampleEmit(name: string) {
		this.renameExampleValue.set(name);
		this.renameExampleEvent.emit(name);
	}
	/**
   * Triggers the update example table signal
   */
	updateExampleTableEmit() {
		this.updateExampleTableTrigger.update(n => n + 1);
		this.updateExampleTableEvent.emit();
	}
	/**
    * Checking the same name of the example
    * @param buttonId
    * @param input
    * @param array
    * @returns
  */
	public uniqueExampleName(buttonId: string, input: string, array: string[]) {
		const button = (document.getElementById(buttonId)) as HTMLButtonElement;
		if (!array.includes(input)) 
			button.disabled = false;
		else {
			button.disabled = true;
			this.notify.error('This Example Name is already in use. Please choose another Name');
		}
	}
}
