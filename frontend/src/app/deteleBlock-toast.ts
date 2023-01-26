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
import { BlockService } from 'src/app/Services/block.service';
/**
 * Component of the Delete Block toasts
 */
  @Component({
    selector: '[pink-toast-component]',
    styles: [`
        a {
            background: #388196;
            margin: 2px;
        }

        .deleteButton{
          background: darkred;
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
        <a *ngIf="!options.closeButton" class="deleteButton btn btn-pink btn-sm" (click)="deleteToast($event)">
            {{ deleteString }}
        </a>
        <a *ngIf="!options.closeButton" class="btn btn-pink btn-sm" (click)="remove()">
        {{ cancelString }}
        </a>
        <a *ngIf="options.closeButton" (click)="remove()" class="btn btn-pink btn-sm">
          close
        </a>
      </div>
    </div>
    <div >
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
  export class DeleteBlockToast extends Toast {

    /**
     * Name of the delete button
     */
    deleteString = 'Delete';
    /**
     * Name of the cancel button
     */
    cancelString = 'Cancel';
    /**
     * Constructor
     * @param toastrService
     * @param toastPackage
     * @param blockService
     * constructor is only necessary when not using AoT
     */
    constructor(
      protected toastrService: ToastrService,
      public toastPackage: ToastPackage,
      public blockService: BlockService,
    ) {
      super(toastrService, toastPackage);
    }

    /**
     * Creates a toast and deltes the story
     * @param event
     */
    deleteToast(event: Event) {
        event.stopPropagation();
        this.blockService.deleteBlockEmitter();
        this.remove();
    }
  }
