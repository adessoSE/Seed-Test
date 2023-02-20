import { Component, ViewChild } from '@angular/core';
import { UntypedFormControl, Validators } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { BackgroundService } from 'src/app/Services/background.service';

@Component({
  selector: 'app-rename-background',
  templateUrl: './rename-background.component.html',
  styleUrls: ['./rename-background.component.css']
})
export class RenameBackgroundComponent{

  modalReference: NgbModalRef;

  @ViewChild('renameBackground') renameBackground: RenameBackgroundComponent;

  backgroundTitle = new UntypedFormControl('', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(20)]);

  constructor(private modalService: NgbModal, public backgroundService: BackgroundService) { }

  openRenameBackgroundModal(backgroundName) {
    this.modalReference = this.modalService.open(this.renameBackground, {ariaLabelledBy: 'modal-basic-title'});
    this.backgroundTitle.setValue(backgroundName);
  }

  submitRenameBackground() {
    const title = this.backgroundTitle.value;
    this.backgroundService.renameBackgroundEmit(title);  
    this.modalReference.close();
  }

  enterSubmit(event) {
    this.submitRenameBackground();
  }

  onClickSubmit() {
    this.submitRenameBackground();
  }

}
