import {
    animate,
    keyframes,
    state,
    style,
    transition,
    trigger
  } from '@angular/animations';
import { Component, EventEmitter, Output} from '@angular/core';
import { Toast, ToastrService, ToastPackage } from 'ngx-toastr';
import { ProjectService } from './Services/project.service';
/**
 * Component of the Transfer Ownership toasts
 */
  @Component({
    selector: '[pink-toast-component]',
    styles: [`
        a {
            background: #388196;
            margin: 2px;
        }

        .confirmButton{
          background: darkred;
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
        <a *ngIf="!options.closeButton" class="confirmButton btn btn-pink btn-sm" (click)="confirmToast($event)">
            {{ confirmString }}
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
    standalone: false
})
  export class TransferOwnershipToast extends Toast {

    @Output() transferOwnershipEvent: EventEmitter<any> = new EventEmitter();
    /**
     * Name of the confirm button
     */
    confirmString = 'Confirm';
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
      public projectService: ProjectService,
    ) {
      super(toastrService, toastPackage);
    }

    /**
     * Creates a toast and deltes the story
     * @param event
     */
    confirmToast(event: Event) {
        event.stopPropagation();
        this.projectService.transferOwnershipEmitter();
        this.remove();
    }
  }
