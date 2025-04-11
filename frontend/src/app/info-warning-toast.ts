import {
    animate,
    keyframes,
    state,
    style,
    transition,
    trigger
  } from '@angular/animations';
import { Component} from '@angular/core';  
import { Toast, ToastrService, ToastPackage } from 'ngx-toastr';
import { ApiService } from './Services/api.service';
import { BackgroundService } from './Services/background.service';
  
  /**
   * Information warning toastr component
   */
  @Component({
    selector: '[pink-toast-component]',
    styles: [`
        a {
            background: #388196;
            margin: 2px;
        }

        a:hover {
            color: black;
        }
    `],
    template: `
    <div class="row" [style.display]="state().value === 'inactive' ? 'none' : ''">
      <div class="col-9">
        <div *ngIf="title" [class]="options.titleClass" [attr.aria-label]="title">
          {{ title }}
        </div>
        <div *ngIf="message && options.enableHtml" role="alert" aria-live="polite"
          [class]="options.messageClass" [innerHTML]="message">
        </div>
        <div *ngIf="message && !options.enableHtml" role="alert" aria-live="polite"
          [class]="options.messageClass" [attr.aria-label]="message">
          {{ message }}
        </div>
      </div>
      <div class="col-9">
        <a *ngIf="!options.closeButton" class="btn btn-pink btn-sm" (click)="firstOptionExecution($event)">
          {{ firstOptionString }}
        </a>
        <a *ngIf="!options.closeButton" class="btn btn-pink btn-sm" (click)="secondOptionExecution($event)">
            {{ secondOptionString }}
        </a>
        <a *ngIf="options.closeButton" (click)="remove()" class="btn btn-pink btn-sm">
          close
        </a>
      </div>
    </div>
    <div *ngIf="options.progressBar">
      <div class="toast-progress" [style.width]="width + '%'"></div>
    </div>
    `,
    animations: [
        trigger('flyInOut', [
            state('inactive', style({
                opacity: 0,
            })),
            transition('inactive => active', animate('400ms ease-out', keyframes([
                style({
                    transform: 'translate3d(100%, 0, 0) skewX(-30deg)',
                    opacity: 0,
                }),
                style({
                    transform: 'skewX(20deg)',
                    opacity: 1,
                }),
                style({
                    transform: 'skewX(-5deg)',
                    opacity: 1,
                }),
                style({
                    transform: 'none',
                    opacity: 1,
                }),
            ]))),
            transition('active => removed', animate('400ms ease-out', keyframes([
                style({
                    opacity: 1,
                }),
                style({
                    transform: 'translate3d(100%, 0, 0) skewX(30deg)',
                    opacity: 0,
                }),
            ]))),
        ]),
    ],
    preserveWhitespaces: false,
    standalone: false
})

  export class InfoWarningToast extends Toast {
    
    /**
     * Name for the first option
     */
    firstOptionString: string;

    /**
     * Name for the second option
     */
    secondOptionString: string;
     /**
     * Name of the toastr
     */
    nameToastr: string;

    toastrOptions: string[];
    // constructor is only necessary when not using AoT
    /**
     * @ignore
     */
    constructor(
      protected toastrService: ToastrService,
      public toastPackage: ToastPackage,
      public apiService: ApiService,
      public backgroundService: BackgroundService
    ) {
      super(toastrService, toastPackage);
    }
    ngOnInit() {
        this.nameToastr = this.apiService.getNameOfComponent();
        this.toastrOptions = this.apiService.getNameOfToastrOptions();
        this.firstOptionString = this.toastrOptions[0];
        this.secondOptionString = this.toastrOptions[1];
      }
    /**
     * Execution of the first option
     * @param event 
     */
    firstOptionExecution(event: Event){
        event.stopPropagation();
        switch(this.nameToastr){
            case 'runSaveToast': this.apiService.runSaveOption('saveRun');
            break;
            case 'copyExampleToast': this.apiService.copyStepWithExampleOption('copy')
            break;
            case 'applyBackgroundChanges': this.backgroundService.applyBackgroundChanges('centrally');
            break;
            default:
            break;
        }
        this.remove();
    }

    /**
     * Execution of the second option
     * @param event 
     */
    secondOptionExecution(event: Event){
        event.stopPropagation();
        switch(this.nameToastr){
            case 'runSaveToast': this.apiService.runSaveOption('run');
            break;
            case 'copyExampleToast': this.apiService.copyStepWithExampleOption('dontCopy')
            break;
            case 'applyBackgroundChanges': this.backgroundService.applyBackgroundChanges('toCurrentBackground');
            break;
            default:
            break;
        }
        this.remove();
    }
}