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

  constructor(private modalService: NgbModal, public apiService: ApiService) { }

  /**
   * Opens the rename story Modal
   * @param oldTitle old story title
   */
  openRenameStoryModal(oldTitle: string) {
    this.modalReference = this.modalService.open(this.renameStoryModal, {ariaLabelledBy: 'modal-basic-title'});
    const title = document.getElementById('newStoryTitle') as HTMLInputElement;
    title.placeholder = oldTitle;
  }

  /**
   * Submits the new name for the story
   */
  submitRenameStory(form : NgForm) {
    const title = form.value.newStoryTitle;
    this.apiService.renameStoryEmit(title);
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
