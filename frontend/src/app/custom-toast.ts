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
  
  @Component({
    selector: '[pink-toast-component]',
    //styles: [`
    //  :host {
    //    background-color: #FF69B4;
    //    position: relative;
    //    overflow: hidden;
    //    margin: 0 0 6px;
    //    padding: 10px 10px 10px 10px;
    //    width: 300px;
    //    border-radius: 3px 3px 3px 3px;
    //    color: #FFFFFF;
    //    pointer-events: all;
    //    cursor: pointer;
    //  }
    //  .btn-pink {
    //    -webkit-backface-visibility: hidden;
    //    -webkit-transform: translateZ(0);
    //  }
    //`],
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
        <a *ngIf="!options.closeButton" class="btn btn-pink btn-sm" (click)="saveAndRunTest($event)">
          {{ saveRunString }}
        </a>
        <a *ngIf="!options.closeButton" class="btn btn-pink btn-sm" (click)="runTest($event)">
            {{ runString }}
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
  export class RunTestToast extends Toast {
    // used for demo purposes
    saveRunString = 'Save and Run';
    runString = 'Run Test'
    // constructor is only necessary when not using AoT

    constructor(
      protected toastrService: ToastrService,
      public toastPackage: ToastPackage,
      public apiService: ApiService
    ) {
      super(toastrService, toastPackage);
    }
  
    runTest(event: Event){
        console.log('Run Test')
        event.stopPropagation();
        this.apiService.runSaveOption('run')
        this.toastPackage.triggerAction();
    }

    saveAndRunTest(event: Event){
        console.log('Save and Run Test')
        event.stopPropagation();
        this.apiService.runSaveOption('saveRun')
        this.toastPackage.triggerAction();
    }
  }