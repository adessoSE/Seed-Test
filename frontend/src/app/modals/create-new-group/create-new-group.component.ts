import { Component, EventEmitter, ViewChild} from '@angular/core';
import { NgForm } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Group } from 'src/app/model/Group';
import { RepositoryContainer } from 'src/app/model/RepositoryContainer';
import { Story } from 'src/app/model/Story';
import { GroupService } from 'src/app/Services/group.service';
import { StoryService } from 'src/app/Services/story.service';

@Component({
    selector: 'app-create-new-group',
    templateUrl: './create-new-group.component.html',
    styleUrls: ['./create-new-group.component.css', '../layout-modal/layout-modal.component.css'],
    standalone: false
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

  groupId: string;

  isSequential: boolean;

  group: Group;

  modalReference: NgbModalRef;

  /**
  * Columns of the story table table
  */
  displayedColumnsStories: string[] = ['story', 'checkStory'];

  closeWindowEventEmitter = new EventEmitter();


  constructor(private modalService: NgbModal, public groupService: GroupService, public storyService: StoryService) {}

  /**
     * Opens the create new group modal
     */
   openCreateNewGroupModal(groups: Group[]) {
    this.groups = groups;
    this.groupId = undefined;
    this.isSequential = true;
    this.selectedStories = undefined;
    const value = localStorage.getItem('repository');
    const _id = localStorage.getItem('id');
    const source = localStorage.getItem('source');
    const repositoryContainer: RepositoryContainer = {value, source, _id};
    this.storyService.getStories(repositoryContainer).subscribe(res => {
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

  groupUnique(form :NgForm) {
    this.groupService.groupUnique('submitCreateNewGroup', form.value.title, this.groups, this.group);
  }

  /**
     * Creates a new custom story
     */
  createNewGroup(form :NgForm) {
    const title = form.value.title;
    if (title.trim() !== '') {
      const member_stories = this.selectedStories;
      var isSequential = this.isSequential;
      const value = localStorage.getItem('repository');
      const _id = localStorage.getItem('id');
      const source = localStorage.getItem('source');
      const repositoryContainer: RepositoryContainer = {value, source, _id};
      const group = {title, member_stories, isSequential};
      this.groupService.createGroupEvent({repositoryContainer, group});
     
    }
    this.modalReference.close();
  }

  //  onSubmit(event, form :NgForm) {
  //    this.createNewGroup(event, form);
  //  }

}
