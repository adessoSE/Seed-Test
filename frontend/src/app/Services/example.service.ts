import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { NotificationService } from './notification.service';
import { ActionTrigger } from './action-trigger';

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
	/** Action channel for new example — carries the example name */
	readonly newExampleTrigger = new ActionTrigger<string>();
	/** Action channel for rename example — carries name and column index */
	readonly renameExampleTrigger = new ActionTrigger<{ name: string; column: number }>();
	/** Signal for update example table trigger */
	readonly updateExampleTableTrigger = signal(0);
	/** Triggers the delete example signal */
	public deleteExampleEmitter() {
		this.deleteExampleTrigger.update(n => n + 1);
	}
	/**
  * Sets the new example value
  * @param name example name
  */
	newExampleEmit(name: string) {
		this.newExampleTrigger.emit(name);
	}
	/**
  * Emits the rename example action
  * @param name example name
  * @param column column index
  */
	renameExampleEmit(name: string, column: number) {
		this.renameExampleTrigger.emit({ name, column });
	}
	/**
   * Triggers the update example table signal
   */
	updateExampleTableEmit() {
		this.updateExampleTableTrigger.update(n => n + 1);
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
