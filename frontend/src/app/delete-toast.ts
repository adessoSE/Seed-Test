import {
    animate,
    keyframes,
    state,
    style,
    transition,
    trigger
  } from '@angular/animations';
import { Component, OnInit } from '@angular/core';
import { Toast, ToastrService, ToastPackage } from 'ngx-toastr';
import { ApiService } from './Services/api.service';
import { BlockService } from './Services/block.service';
import { ExampleService } from './Services/example.service';
import { ProjectService } from './Services/project.service';
import { ScenarioService } from './Services/scenario.service';
import { StoryService } from './Services/story.service';

/**
 * Component of the Delete toasts
 */
  @Component({
    selector: '[pink-toast-component]',
    styles:[`
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
  export class DeleteToast extends Toast implements OnInit {
    /**
     * Name of the delete button
     */
    deleteString = 'Delete';
    /**
     * Name of the cancel button
     */
    cancelString = 'Cancel';
    /**
     * Name of the component that the user wants to delete
     */
    nameComponent: string;
    toastData: any;

    /**
     * Constructor
     * @param toastrService 
     * @param toastPackage 
     * @param scenarioService 
     * constructor is only necessary when not using AoT
     */
    constructor(
      protected toastrService: ToastrService,
      public toastPackage: ToastPackage,
      public scenarioService: ScenarioService,
      public storyService: StoryService,
      public apiService: ApiService,
      public exampleService: ExampleService,
      public projectService: ProjectService,
      public blockService: BlockService

    ) {
      super(toastrService, toastPackage);
      this.nameComponent = this.apiService.getNameOfComponent();
      if (this.nameComponent == 'unpackBlock') {
        this.deleteString = 'Unpack';
      }else {
        this.deleteString = 'Delete';
      }
    }
      
    ngOnInit() {
      this.blockService.toastData$.subscribe((data) => {
        this.toastData = data;
      });
    }
    /**
     * Creates a toast and delete the selected component
     * @param event 
     */
    deleteToast(event: Event){
        event.stopPropagation();
        switch(this.nameComponent){
          case 'scenario': this.scenarioService.deleteScenarioEmitter();
          break;
          case 'story': this.storyService.deleteStoryEmitter();
          break;
          case 'example': this.exampleService.deleteExampleEmitter();
          break;
          case 'repository': this.projectService.deleteRepositoryEmitter();
          break;
          case 'block': this.blockService.deleteBlockEmitter();
          break;
          case 'unpackBlock': this.blockService.unpackBlockEmitter(this.toastData);
          break;
        }
        this.remove();
    }
  }
