import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { Group } from 'src/app/model/Group';
import { RepositoryContainer } from 'src/app/model/RepositoryContainer';
import { Story } from 'src/app/model/Story';
import { ApiService } from 'src/app/Services/api.service';

@Component({
  selector: 'app-update-group',
  templateUrl: './update-group.component.html',
  styleUrls: ['./update-group.component.css']
})
export class UpdateGroupComponent {

  /**
     * selectable Stories when create Group
  */
   stories: Story[];

   filteredStories: MatTableDataSource<Story>;
 
   /**
   * Existing Groups
   */
   groups: Group[];

   scrGroup: Group;
 
   selectedStories: string[];
 
   groupTitle: string;
 
   groupId: string;
   
   /**
   * Columns of the story table table
   */
   displayedColumnsStories: string[] = ['story', 'checkStory'];

  @ViewChild('updateGroupModal') updateGroupModal: UpdateGroupComponent;

  constructor(private modalService: NgbModal, public apiService: ApiService, private toastr: ToastrService) { }

  /**
     * Opens the create new group modal
     */
  openUpdateGroupModal(group: Group, groups: Group[]) {
    this.groups = groups;
    this.scrGroup = group;
    const value = localStorage.getItem('repository');
    const _id = localStorage.getItem('id');
    const source = localStorage.getItem('source');
    const repositoryContainer: RepositoryContainer = {value, source, _id};
    this.apiService.getStories(repositoryContainer).subscribe(res => {
        this.stories = res;
        this.filteredStories = new MatTableDataSource(res);
    });
    this.groupId = group._id;
    this.groupTitle = group.name;
    this.selectedStories = [];
    for (const s of group.member_stories) {
        this.selectedStories.push(s._id);
    }
    this.modalService.open(this.updateGroupModal, {ariaLabelledBy: 'modal-basic-title'});
  }

  groupUnique(event, input: String, array: Group[], group?: Group) {
    array = array ? array : [];
    input = input ? input : '';

    const button = (group ? document.getElementById('groupUpdate') : document.getElementById('groupSave')) as HTMLButtonElement;
    if ((input && !array.find(i => i.name == input)) || (group ? array.find(g => g._id == group._id && g.name == input) : false)) {
        button.disabled = false;
    } else {
        button.disabled = true;
        this.toastr.error('Choose another Group-name');
    }
  }

   /**
   * Filters stories for searchterm
   */

  searchOnKey(filter: string) { 
    this.filteredStories = new MatTableDataSource(this.stories);
    this.filteredStories.filterPredicate =  (data: Story, filter: string) => data.title.trim().toLowerCase().indexOf(filter) != -1;
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

  deleteGroup($event) {
    event.stopPropagation();
    const repo_id = localStorage.getItem('id');
    this.apiService.deleteGroupEvent({'repo_id': repo_id, 'group_id': this.groupId});
  }

  updateGroup($event) {
    console.log('selectedStories:', this.selectedStories);
    event.stopPropagation();
    const value = localStorage.getItem('repository');
    const _id = localStorage.getItem('id');
    const source = localStorage.getItem('source');
    const repositoryContainer: RepositoryContainer = {value, source, _id};
    const group: Group = {_id: this.groupId, name: this.groupTitle, member_stories: this.selectedStories};
    this.apiService.updateGroupEvent({repositoryContainer, group});
  }

}
