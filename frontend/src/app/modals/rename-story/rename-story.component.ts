import { Component, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { Story } from 'src/app/model/Story';
import { ApiService } from 'src/app/Services/api.service';
import { DeleteRepositoryToast } from 'src/app/deleteRepository-toast';

@Component({
  selector: 'app-rename-story',
  templateUrl: './rename-story.component.html',
  styleUrls: ['./rename-story.component.css']
})
export class RenameStoryComponent {

  modalReference: NgbModalRef;
  story:Story;
  stories:Story[];
  storytitle: string;

  
  @ViewChild('renameStoryModal') renameStoryModal: RenameStoryComponent;

  constructor(private modalService: NgbModal, public apiService: ApiService, private toastr: ToastrService) { }

  /**
   * Opens the rename story Modal
   * @param oldTitle old story title
   */
  openRenameStoryModal(stories : Story [], story:Story) {
    this.stories=stories;
    this.story=story;
    this.modalReference = this.modalService.open(this.renameStoryModal, {ariaLabelledBy: 'modal-basic-title'});
    const title = document.getElementById('newStoryTitle') as HTMLInputElement;
    title.placeholder = story.title;
  }

  /**
   * Submits the new name for the story
   */
  submitRenameStory(form : NgForm, story:Story, stories:Story[]) {
    this.story=story;
    this.stories=stories;
    const title = form.value.storytitle;
    this.apiService.renameStoryEmit(title);
    this.modalReference.close();
  }

  enterSubmit(event, form: NgForm) {
    if (event.keyCode === 13) {
      this.submitRenameStory(form,this.story,this.stories);
      form.reset(); 
    }
  }

  onClickSubmit(form: NgForm) {
    this.submitRenameStory(form,this.story,this.stories);
    form.reset();
  }
  
  storyUnique(event, input: String, array: Story[], story?: Story) {
 
    array = array ? array : [];
    input = input ? input : '';

    const button = (document.getElementById('submitRenameStory'))  as HTMLButtonElement;
        if ((input && !array.find(i => i.title == input)) || (story ? array.find(g => g._id == story._id && g.title == input) : false)) {
        button.disabled = false;
    } else {
        button.disabled = true;
        this.toastr.error('This Story Title is already in use. Please choose another Title');
    }
}

}
