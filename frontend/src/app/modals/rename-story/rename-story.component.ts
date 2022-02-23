import { Component, ViewChild } from '@angular/core';
import { FormControl, FormGroup, NgForm, Validators } from '@angular/forms';
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

  storyForm = new FormGroup ({
    storyTitle: new FormControl('', [Validators.required, Validators.pattern(/[\S]/)]),
    storyDescription: new FormControl(''),
  });

  get storyTitle() { return this.storyForm.get('storyTitle'); }

  constructor(private modalService: NgbModal, public apiService: ApiService) { }

  /**
   * Opens the rename story Modal
   * @param oldTitle old story title
   * @param oldDescription old description
   */
  openRenameStoryModal(oldTitle: string, oldDescription: string) {
    this.modalReference = this.modalService.open(this.renameStoryModal, {ariaLabelledBy: 'modal-basic-title'});
    this.storyForm.setValue({
      storyTitle: oldTitle,
      storyDescription: oldDescription
    });
  }

  /**
   * Submits the new name for the story & description
   */
  submitRenameStory() {
    const title = this.storyForm.value.storyTitle;
    const description = this.storyForm.value.storyDescription;
    this.apiService.renameStoryEmit(title, description);
    this.modalReference.close();
  }

}
