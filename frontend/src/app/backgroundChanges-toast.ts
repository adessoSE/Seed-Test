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
import { BackgroundService } from './Services/background.service';
  
  /**
   * Component of the centrally background with apllying changes 
   */
  @Component({
    selector: '[pink-toast-component]',
    styles:[`
        a {
            background: #388196;
            margin: 2px;
        }

        a:hover {
            color: black;
        }
    `],
    template: `
    <div class="row" [style.display]="state.value === 'inactive' ? 'none' : ''">
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
        <a *ngIf="!options.closeButton" class="btn btn-pink btn-sm" (click)="applyChangesCentrally($event)">
          {{ centrallBackgroundString }}
        </a>
        <a *ngIf="!options.closeButton" class="btn btn-pink btn-sm" (click)="applyToCurrentBackground($event)">
            {{ currentlyBackgroundString }}
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
  })

  export class ApplyBackgroundChanges extends Toast {
    
    /**
     * Name for the centrall Backgrounds
     */
    centrallBackgroundString = 'Save Changes for All Stories';

    /**
     * Name for the current Background
     */
    currentlyBackgroundString = 'Save as New Background'
    // constructor is only necessary when not using AoT

    /**
     * @ignore
     */
    constructor(
      protected toastrService: ToastrService,
      public toastPackage: ToastPackage,
      public backgroundService : BackgroundService,
    ) {
      super(toastrService, toastPackage);
    }
  
    /**
     * Apply changes to Backgrounds centrally
     * @param event 
     */
     applyChangesCentrally(event: Event){
        event.stopPropagation();
        this.backgroundService.applyBackgroundChanges("centrally");
        this.remove();
    }

    /**
     * Apply changes only to the current background
     * @param event 
     */
    applyToCurrentBackground(event: Event){
        event.stopPropagation();
        this.backgroundService.applyBackgroundChanges("toCurrentBackground");
        this.remove();
      
    }
  }