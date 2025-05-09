import { Component, TemplateRef, ViewChild } from '@angular/core';
import {UntypedFormControl, UntypedFormGroup, Validators} from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Story } from 'src/app/model/Story';
import { StoryService } from 'src/app/Services/story.service';

@Component({
    selector: 'app-rename-story',
    templateUrl: './rename-story.component.html',
    styleUrls: ['./rename-story.component.css', '../layout-modal/layout-modal.component.css'],
    standalone: false
})
export class RenameStoryComponent {

  modalReference: NgbModalRef;

  @ViewChild('renameStoryModal') renameStoryModal: TemplateRef<RenameStoryComponent>;

  story: Story;
  stories: Story[];
  storyForm = new UntypedFormGroup ({
    storyTitle: new UntypedFormControl('', [Validators.required, Validators.pattern(/\S/)]),
    storyDescription: new UntypedFormControl(''),
  });

  get storyTitle() { return this.storyForm.get('storyTitle'); }

  constructor(private modalService: NgbModal, public storyService: StoryService) { }

  /**
   * Opens the rename story Modal
   * @param stories
   * @param story
   */
  openRenameStoryModal(stories: Story [], story: Story) {
    this.stories = stories;
    this.story = story;
    this.modalReference = this.modalService.open(this.renameStoryModal, {ariaLabelledBy: 'modal-basic-title'});
    const title = document.getElementById('newStoryTitle') as HTMLInputElement;
    title.placeholder = story.title;
    this.storyForm.setValue({
      storyTitle: story.title,
      storyDescription: story.body
    });
  }

  /**
   * Submits the new name for the story & description
   */
  submitRenameStory() {
    const title = this.storyForm.value.storyTitle;
    const description = this.storyForm.value.storyDescription;
    this.storyService.renameStoryEmit(title, description);
    this.modalReference.close();
  }

  storyUnique() {
    this.storyService.storyUnique('submitRenameStory', this.storyForm.value.storyTitle, this.stories, this.story);
  }
}
