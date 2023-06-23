import { EventEmitter, Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { ToastrService } from 'ngx-toastr';

/**
 * Service for communication between example component and the backend
 */
@Injectable({
  providedIn: 'root'
})
export class ExampleService {
  /**
    * @ignore
  */
  constructor(public apiService: ApiService, public toastr: ToastrService) { }
  /**
  * Event emitter to delete the example
  */
  public deleteExampleEvent = new EventEmitter();
  /**
  * Event emitter to add a example to a scenario
  */
  public newExampleEvent = new EventEmitter();
  /**
  * Event emitter to rename a example
  */
  public renameExampleEvent = new EventEmitter();
  /**
     * Event emitter to update mutliple scenario table
     */
  public updateExampleTableEvent = new EventEmitter();

  /**
  * Emits the delete example event
  */
  public deleteExampleEmitter() {
    this.deleteExampleEvent.emit();
  }
  /**
  * Emits the new example event
  * @param name example name
  */
  newExampleEmit(name) {
    this.newExampleEvent.emit(name);
  }
  /**
  * Emits the renaming example event
  * @param name example name
  */
  renameExampleEmit(name) {
    this.renameExampleEvent.emit(name);
  }
  /**
   * Emits the update example table event
   */
  updateExampleTableEmit() {
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
    if (!array.includes(input)) {
      button.disabled = false;
    } else {
      button.disabled = true;
      this.toastr.error('This Example Name is already in use. Please choose another Name');
    }
  }
}
