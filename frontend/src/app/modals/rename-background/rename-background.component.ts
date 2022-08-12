import { Component, OnInit, ViewChild } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Story } from 'src/app/model/Story';
import { ApiService } from 'src/app/Services/api.service';

@Component({
  selector: 'app-rename-background',
  templateUrl: './rename-background.component.html',
  styleUrls: ['./rename-background.component.css']
})
export class RenameBackgroundComponent{

  modalReference: NgbModalRef;

  @ViewChild('renameBackground') renameBackground: RenameBackgroundComponent;

  backgroundTitle = new FormControl('', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(20)]);

  constructor(private modalService: NgbModal, public apiService: ApiService) { }

  openRenameBackgroundModal(backgroundName) {
    this.modalReference = this.modalService.open(this.renameBackground, {ariaLabelledBy: 'modal-basic-title'});
    this.backgroundTitle.setValue(backgroundName);
  };

  submitRenameBackground() {
    const title = this.backgroundTitle.value;
    this.apiService.renameBackgroundEmit(title);
    console.log(title);   
    this.modalReference.close();
  };

  enterSubmit(event) {
    this.submitRenameBackground();
  }

  onClickSubmit() {
    this.submitRenameBackground();
  }

}
