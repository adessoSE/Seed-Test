import { Component, TemplateRef, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Group } from 'src/app/model/Group';
import { RepositoryContainer } from 'src/app/model/RepositoryContainer';
import { Story } from 'src/app/model/Story';
import { ApiService } from 'src/app/Services/api.service';
import { FormGroup, FormControl} from '@angular/forms';

@Component({
  selector: 'app-create-new-story',
  templateUrl: './create-new-story.component.html',
  styleUrls: ['./create-new-story.component.css']
})
export class CreateNewStoryComponent {

  @ViewChild('createNewStoryModal') createNewStoryModal: TemplateRef<CreateNewStoryComponent>;

  /**
     * selectable Stories when create Group
     */
  stories: Story[];

  filteredStories: MatTableDataSource<Story>;

  groups: Group[];

  selectedStories: string[];

  groupTitle: string;

  groupId: string;

  modalReference: NgbModalRef;

  story: Story;

  //storytitle: string;

  storyForm = new FormGroup ({
    storyTitle: new FormControl(''),
    storyDescription: new FormControl(''),
  });



  constructor(private modalService: NgbModal, public apiService: ApiService) { }

    /**
     * Opens the create new story modal
     */
  openCreateNewStoryModal(stories: Story[]) {
    this.stories = stories;
    this.modalReference = this.modalService.open(this.createNewStoryModal, {ariaLabelledBy: 'modal-basic-title'});
  }

  /**
   * Creates a new custom story
   */
  createNewStory() {
    const title = this.storyForm.value.storyTitle;
    if (title.trim() !== '') {
      const description = (this.storyForm.value.storyDescription === '') ? undefined : this.storyForm.value.storyDescription;
      const value = localStorage.getItem('repository');
      const _id = localStorage.getItem('id');
      const source = 'db';
      const repositoryContainer: RepositoryContainer = {value, source, _id};
      const story = {title, description};
      this.apiService.createCustomStoryEvent({repositoryContainer, story});
    }
    this.modalReference.close();
  }

  storyUnique() {
    this.apiService.storyUnique('submitCreateNewStory', this.storyForm.value.storyTitle, this.stories, this.story);
  }
}

