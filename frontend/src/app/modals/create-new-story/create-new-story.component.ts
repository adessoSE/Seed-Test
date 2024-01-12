import { Component, TemplateRef, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Group } from 'src/app/model/Group';
import { RepositoryContainer } from 'src/app/model/RepositoryContainer';
import { Story } from 'src/app/model/Story';
import { UntypedFormGroup, UntypedFormControl, Validators} from '@angular/forms';
import { StoryService } from 'src/app/Services/story.service';

@Component({
  selector: 'app-create-new-story',
  templateUrl: './create-new-story.component.html',
  styleUrls: ['./create-new-story.component.css',  '../layout-modal/layout-modal.component.css']
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

  storyForm = new UntypedFormGroup ({
    storyTitle: new UntypedFormControl('',[Validators.required, Validators.pattern(/[\S]/)]),
    storyDescription: new UntypedFormControl(''),
  });



  constructor(private modalService: NgbModal, public storyService: StoryService) { }

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
      this.storyService.createCustomStoryEvent({repositoryContainer, story});
    }
    this.storyForm.reset({storyTitle:'', storyDescription:''});
    this.modalReference.close();
  }

  storyUnique() {
    this.storyService.storyUnique('submitCreateNewStory', this.storyForm.value.storyTitle, this.stories, this.story);
  }
  close(modal){
    this.storyForm.reset({storyTitle:'', storyDescription:''});
    modal.dismiss('Cross click');
  }
}

