import { Component, EventEmitter, ViewChild} from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { Group } from 'src/app/model/Group';
import { RepositoryContainer } from 'src/app/model/RepositoryContainer';
import { Story } from 'src/app/model/Story';
import { ApiService } from 'src/app/Services/api.service';
import {FormBuilder, NgForm, Validators} from '@angular/forms';

@Component({
  selector: 'app-create-new-group',
  templateUrl: './create-new-group.component.html',
  styleUrls: ['./create-new-group.component.css']
})
export class CreateNewGroupComponent {

  @ViewChild('createNewGroupModal') createNewGroupModal: CreateNewGroupComponent;

  /**
     * selectable Stories when create Group
  */
  stories: Story[];

  filteredStories: MatTableDataSource<Story>;

  /**
  * Existing Groups
  */
  groups: Group[];

  selectedStories: string[];

  groupTitle: string;

  groupId: string;

  isSequential: boolean;

  modalReference: NgbModalRef;

  /**
  * Columns of the story table table
  */
  displayedColumnsStories: string[] = ['story', 'checkStory'];

  closeWindowEventEmitter = new EventEmitter();


  constructor(private modalService: NgbModal, public apiService: ApiService, private toastr: ToastrService) {}

  /**
     * Opens the create new group modal
     */
   openCreateNewGroupModal(groups: Group[]) {
    this.groups = groups;
    this.groupId = undefined;
    this.groupTitle = '';
    this.isSequential = true;
    this.selectedStories = undefined;
    const value = localStorage.getItem('repository');
    const _id = localStorage.getItem('id');
    const source = localStorage.getItem('source');
    const repositoryContainer: RepositoryContainer = {value, source, _id};
    this.apiService.getStories(repositoryContainer).subscribe(res => {
        this.stories = res;
        this.filteredStories = new MatTableDataSource(res);
    });
    this.modalReference = this.modalService.open(this.createNewGroupModal, {ariaLabelledBy: 'modal-basic-title'});
  }

 /**
   * Filters stories for searchterm
   */
  searchOnKey(filter: string) {
    this.filteredStories = new MatTableDataSource(this.stories);
    this.filteredStories.filterPredicate =  (data: Story, storyFilter: string) => data.title.trim().toLowerCase().indexOf(storyFilter) != -1;
    /* Apply filter */
    this.filteredStories.filter = filter.trim().toLowerCase();
  }

  /**
     * Functionality for showing if Story is in Group for Checklist
     * Checks wether the Story is already added
     * @param story
     */
  isStoryChecked(story) {
    if (this.selectedStories === undefined) {
        this.selectedStories = new Array<string>();
        return false;
    }
    const exists = this.selectedStories.find(function(x) {return x == story._id; });
    return exists !== undefined;
  }

  /**
     * Fuctionality for adding and removing Stories from a Group with a Checklist
     * @param story
     */
  selectStory(story) {
    if (this.isStoryChecked(story)) {
        this.selectedStories = this.selectedStories.filter(item => item !== story._id);
    } else {
        this.selectedStories.push(story._id);
    }
  }

  groupUnique(event, input: string, array: Group[], group?: Group) {
    array = array ? array : [];
    input = input ? input : '';

    const button = (group ? document.getElementById('groupUpdate') : document.getElementById('groupSave')) as HTMLButtonElement;
    if ((input && !array.find(i => i.name == input)) || (group ? array.find(g => g._id == group._id && g.name == input) : false)) {
        button.disabled = false;
    } else {
        button.disabled = true;
        this.toastr.error('Choose another group name');
    }
  }

  /**
     * Creates a new custom story
     */
  createNewGroup(event) {
    event.stopPropagation();
    const title = this.groupTitle;
    if (title.trim() !== '') {
      const member_stories = this.selectedStories;
      var isSequential = this.isSequential;
      const value = localStorage.getItem('repository');
      const _id = localStorage.getItem('id');
      const source = localStorage.getItem('source');
      const repositoryContainer: RepositoryContainer = {value, source, _id};
      const group = {title, member_stories, isSequential};
      this.apiService.createGroupEvent({repositoryContainer, group});
      this.modalReference.close();
    }
    
  }

  enterSubmit(event) {
    if (event.keyCode === 13) {
      this.createNewGroup(event);
    }
  }

  onClickSubmit(event) {
    this.createNewGroup(event);
  }

}
