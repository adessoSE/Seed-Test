import { Component, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ApiService } from 'src/app/Services/api.service';

@Component({
  selector: 'app-rename-story',
  templateUrl: './rename-story.component.html',
  styleUrls: ['./rename-story.component.css']
})
export class RenameStoryComponent {

  modalReference: NgbModalRef;

  @ViewChild('renameStoryModal') renameStoryModal: RenameStoryComponent;
  storyDescription: string;

  constructor(private modalService: NgbModal, public apiService: ApiService) { }

  /**
   * Opens the rename story Modal
   * @param oldTitle old story title
   * @param oldDescription old description
   */
  openRenameStoryModal(oldTitle: string, oldDescription: string) {
    this.modalReference = this.modalService.open(this.renameStoryModal, {ariaLabelledBy: 'modal-basic-title'});
    const title = document.getElementById('newStoryTitle') as HTMLInputElement;
    const description = document.getElementById('newStoryDescription') as HTMLInputElement;
    title.placeholder = oldTitle;
    description.placeholder = oldDescription;
  }

  /**
   * Submits the new name for the story & description
   */
  submitRenameStory(form: NgForm) {
    const title = form.value.newStoryTitle;
    const description = this.storyDescription;
    console.log(description);
    this.apiService.renameStoryEmit(title, description);
    this.modalReference.close();
  }

  enterSubmit(event, form: NgForm) {
    if (event.keyCode === 13) {
      this.submitRenameStory(form);
      form.reset();
    }
  }

  onClickSubmit(form: NgForm) {
    this.submitRenameStory(form);
    form.reset();
  }

}
