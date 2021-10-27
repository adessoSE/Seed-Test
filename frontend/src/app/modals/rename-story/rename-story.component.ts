import { Component, OnInit, ViewChild } from '@angular/core';
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
   */
  openRenameStoryModal(oldTitle: string) {
    this.modalService.open(this.renameStoryModal, {ariaLabelledBy: 'modal-basic-title'});
    const title = document.getElementById('newStoryTitle') as HTMLInputElement;
    title.placeholder = oldTitle;
  }

  /**
   * Submits the new name for the story
   */
  submitRenameStory() {
    const title = (document.getElementById('newStoryTitle') as HTMLInputElement).value ;
    this.apiService.renameStoryEmit(title);
  }

}
