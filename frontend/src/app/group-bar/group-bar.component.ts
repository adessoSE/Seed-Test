import { Component, OnInit, EventEmitter, Output, ViewChild, OnDestroy } from '@angular/core';
import {ApiService} from '../Services/api.service';
import { Group } from '../model/Group';
import { ModalsComponent } from '../modals/modals.component';
import { Subscription } from 'rxjs/internal/Subscription';
import {Story} from "../model/Story";

/**
 * Component of the groups bar
 */
@Component({
  selector: 'app-group-bar',
  templateUrl: './group-bar.component.html',
  styleUrls: ['./group-bar.component.css']
})
export class GroupBarComponent implements OnInit, OnDestroy {
  /**
   * groups in the project
   */
  groups: Group[];

  /**
   * Currently selected Group
   */
  selectedGroup: Group;


  /**
   * If it is the daisy version
   */
  daisyVersion: boolean = true;

  /**
   * Subscription element if a custom Group should be created
   */
  createGroupEmitter: Subscription;

  /**
   * Emits a new chosen Group
   */
  @Output()
  GroupChosen: EventEmitter<any> = new EventEmitter();

  /**
   * Emits a new chosen scenario
   */
  @Output()
  scenarioChosen: EventEmitter<any> = new EventEmitter();

  /**
   * View Child Modals
   */
  @ViewChild('modalsComponent') modalsComponent: ModalsComponent;

  /**
   * Constructor
   * @param apiService
   */
  constructor(public apiService: ApiService) {
    this.apiService.getGroups(localStorage.getItem('id')).subscribe(groups => {
      this.groups = groups;
      console.log('hallo constructor', groups)
    } );


  }

  /**
   * Checks if this is the daisy version
   */
  ngOnInit() {
    let version = localStorage.getItem('version')
    if (version == 'DAISY' || !version) {
      this.daisyVersion = true;
    } else {
      this.daisyVersion = false;
    }

    this.createGroupEmitter = this.apiService.createCustomGroupEmitter.subscribe(custom => {
      this.apiService.createGroup(custom.group.title, custom.repositoryContainer._id, custom.group.member_stories).subscribe(respp => {
        this.apiService.getGroups(custom.repositoryContainer._id).subscribe((resp: Group[]) => {
          this.groups = resp;
          console.log(resp)
        });
      });
    })
  }

  ngOnDestroy() {
    if (this.createGroupEmitter) {
      this.createGroupEmitter.unsubscribe()
    }
  }


  /**
   * Sorts the groups after issue_number
   * @returns
   */
  getSortedGroups() {
    if (this.groups) {
      return this.groups
    }
  }


  /**
   * Selects a new Group
   * @param Group
   */
  selectGroupStory(Group: Group) {
    this.selectedGroup = Group;
  }

  /**
   * Opens a create New story Modal
   */
  openCreateNewStoryModal(){
    this.modalsComponent.openCreateNewGroupModal()
  }

  switchToStory(){
    //todo
  }

}
