import { Component, TemplateRef, ViewChild } from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Story } from 'src/app/model/Story';
import { ApiService } from 'src/app/Services/api.service';

@Component({
  selector: 'app-rename-story',
  templateUrl: './rename-story.component.html',
  styleUrls: ['./rename-story.component.css']
})
export class RenameStoryComponent {

  modalReference: NgbModalRef;

  @ViewChild('renameStoryModal') renameStoryModal: TemplateRef<RenameStoryComponent>;

  story: Story;
  stories: Story[];
  storytitle: string;
  storyForm = new FormGroup ({
    storyTitle: new FormControl('', [Validators.required, Validators.pattern(/\S/)]),
    storyDescription: new FormControl(''),
  });

  get storyTitle() { return this.storyForm.get('storyTitle'); }

  constructor(private modalService: NgbModal, public apiService: ApiService) { }

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
    const title = this.storyForm.value.storytitle;
    const description = this.storyForm.value.storyDescription;
    this.apiService.renameStoryEmit(title, description);
    this.modalReference.close();
  }

  storyUnique() {
    this.apiService.storyUnique('submitRenameStory', this.storyForm.value.storyTitle, this.stories, this.story);
  }
}
