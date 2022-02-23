import { Component, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Group } from 'src/app/model/Group';
import { RepositoryContainer } from 'src/app/model/RepositoryContainer';
import { Story } from 'src/app/model/Story';
import { ApiService } from 'src/app/Services/api.service';
import {ToastrService} from 'ngx-toastr';

@Component({
  selector: 'app-create-new-story',
  templateUrl: './create-new-story.component.html',
  styleUrls: ['./create-new-story.component.css']
})
export class CreateNewStoryComponent {

  @ViewChild('createNewStoryModal') createNewStoryModal: CreateNewStoryComponent;

  /**
     * selectable Stories when create Group
     */
  stories: Story[];

  filteredStories: MatTableDataSource<Story>;

  groups: Group[];

  selectedStories: string[];

  groupTitle: string;

  groupId: string;

  storyTitle: string;

  storyDescription: string;

  modalReference: NgbModalRef;

  storytitle: string;
  
  story:Story;
  


  constructor(private modalService: NgbModal, public apiService: ApiService) { }

  // createNewStoryModal

    /**
     * Opens the create new story modal
     */
  openCreateNewStoryModal(stories: Story[]) {
    this.stories=stories;
    this.modalReference = this.modalService.open(this.createNewStoryModal, {ariaLabelledBy: 'modal-basic-title'});
  }

  /**
   * Creates a new custom story
   */
  createNewStory(event) {
    event.stopPropagation();
    const title = this.storytitle;
    if (title.trim() !== '') {
     const description = this.storyDescription;
      this.storyTitle = null;
      this.storyDescription = null;
      const value = localStorage.getItem('repository');
      const _id = localStorage.getItem('id');
      const source = 'db';
      const repositoryContainer: RepositoryContainer = {value, source, _id};
      const story = {title, description};
      this.apiService.createCustomStoryEvent({repositoryContainer, story});
      this.modalReference.close();
    }
  }

  enterSubmit(event) {
    if (event.keyCode === 13) {
      this.createNewStory(event);
    }
  }

  onClickSubmit(event) {
    this.createNewStory(event);
  }
  
  storyUnique(){
    this.apiService.storyUnique('createNewStory',this.storytitle,this.stories, this.story);
  }

}
