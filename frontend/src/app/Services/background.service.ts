import { EventEmitter, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../Services/api.service';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Scenario } from '../model/Scenario';
import { Background } from '../model/Background';

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
  constructor(public apiService: ApiService, private http: HttpClient) { }
  /**
  * Event emitter to remane backgrounf of a story
  */
  public renameBackgroundEvent: EventEmitter<string> = new EventEmitter();
  /**
    * Event emitter to change a background
  */
  public backgroundChangedEvent: EventEmitter<Scenario> = new EventEmitter();
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
      .post<Background>(this.apiService.apiServer + '/mongo/background/update/' + storyID , background, ApiService.getOptions())
      .pipe(tap(_ => {
        console.log('Update background for story ' + storyID);
      }));
  }
  /**
    * Deletes the background
    * @param storyID
    * @param storySource
    * @returns
  */
  deleteBackground(storyID: any, storySource: string): Observable<any> {
    return this.http
      .delete<any>(this.apiService.apiServer + '/mongo/background/delete/' + storyID + '/' + storySource, ApiService.getOptions())
      .pipe(tap(() => {
        //
      }));
  }

}
