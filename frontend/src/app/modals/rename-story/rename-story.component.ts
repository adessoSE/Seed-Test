import { Component, ViewChild } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ApiService } from 'src/app/Services/api.service';

@Component({
  selector: 'app-rename-story',
  templateUrl: './rename-story.component.html',
  styleUrls: ['./rename-story.component.css']
})
export class RenameStoryComponent {

  @ViewChild('renameStoryModal') renameStoryModal: RenameStoryComponent;

  constructor(private modalService: NgbModal, public apiService: ApiService) { }

  /**
   * Opens the rename story Modal
   * @param oldTitle old story title
   * @param oldDescription old description
   */
  openRenameStoryModal(oldTitle: string, oldDescription: string) {
    this.modalService.open(this.renameStoryModal, {ariaLabelledBy: 'modal-basic-title'});
    const title = document.getElementById('newStoryTitle') as HTMLInputElement;
    title.placeholder = oldTitle;
    const description = document.getElementById('selectedStory.body') as HTMLInputElement;
    description.placeholder= oldDescription;
  }

  /**
   * Submits the new name for the story & description
   */
  submitRenameStory() {
    const title = (document.getElementById('newStoryTitle') as HTMLInputElement).value ;
    const description = (document.getElementById('selectedStory.body') as HTMLInputElement).value ;
    this.apiService.renameDescriptionEmit(description);
    this.apiService.renameStoryEmit(title);
  }

}
