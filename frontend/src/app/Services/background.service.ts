import { EventEmitter, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../Services/api.service';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Scenario } from '../model/Scenario';
import { Background } from '../model/Background';
import { ToastrService } from 'ngx-toastr';
/**
 * Service for communication between background of the story and the backend
 */
@Injectable({
  providedIn: 'root'
})
export class BackgroundService {

  /**
  * @ignore
  */
  constructor(public apiService: ApiService, private http: HttpClient, public toastr: ToastrService) { }
  /**
  * Event emitter to remane backgrounf of a story
  */
  public renameBackgroundEvent: EventEmitter<string> = new EventEmitter();
  /**
    * Event emitter to change a background
  */
  public backgroundChangedEvent: EventEmitter<Scenario> = new EventEmitter();
 /**
    * Track if background was replaced
  */
  public backgroundReplaced = false;
  /**
    * Event emitter for applying changes to Backgrounds(current or centrally)
  */
  public applyChangesBackgroundEvent = new EventEmitter();
  /**
    * Emits the applying changes for background
    * @param option
  */
  public applyBackgroundChanges(option: string) {
    this.applyChangesBackgroundEvent.emit(option);
  }

  /**
    * Track current background before saving changes
  */
  public currentBackground: Background;
  /* 
  * Emits background changed event 
  */
  public backgroundChangedEmitter() {
    this.backgroundChangedEvent.emit();
  }
  /* 
  * Emits background rename event 
  */
  renameBackgroundEmit(newBackgroundName) {
    const val = newBackgroundName;
    this.renameBackgroundEvent.emit(val);
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
    if ((input && !array.find(i => i.name === input)) || (background ? array.find(g => g.name === background.name && g.name === input) : false)) {
      button.disabled = false;
    } else {
      button.disabled = true;
      this.toastr.error('This Background Title is already in use. Please choose another Title');
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
