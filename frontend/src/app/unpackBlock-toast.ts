import { animate, keyframes, state, style, transition, trigger} from '@angular/animations';
import { Component} from '@angular/core';
import { Toast, ToastrService, ToastPackage } from 'ngx-toastr';
import { BlockService } from './Services/block.service';

/**
 * Component of the Delete Scenario toasts
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
        <div [class]="options.titleClass" [attr.aria-label]="title">
            Unpack Block
        </div>
        <div role="alert" aria-live="polite" [class]="options.messageClass">
            Unpacking the Block will remove its reference to the original Block! Do you want to unpack the block?
        </div>
      </div>
      <div class="col-9">
        <a class="deleteButton btn btn-pink btn-sm" (click)="unpackBlock($event)">
            {{ deleteString }}
        </a>
        <a class="btn btn-pink btn-sm" (click)="remove()">
        {{ cancelString }}
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
  export class UnpackBlockToast extends Toast {
    /**
     * Name of the delete button
     */
    deleteString = 'Unpack';
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
    public blockService: BlockService
  ) {
    super(toastrService, toastPackage);
  }

  /**
   * Emits the unpackBlock Event
   * @param event
   */
  unpackBlock(event: Event) {
    event.stopPropagation();
    this.blockService.unpackBlockEmitter();
    this.remove();
  }
}
