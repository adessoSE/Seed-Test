import { Component, ViewChild } from '@angular/core';
import { UntypedFormControl, Validators } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { BackgroundService } from 'src/app/Services/background.service';
import { Background } from '../../model/Background';
import { Story } from '../../model/Story';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from '../../Services/api.service';

@Component({
  selector: 'app-rename-background',
  templateUrl: './rename-background.component.html',
  styleUrls: ['./rename-background.component.css']
})
export class RenameBackgroundComponent{

  modalReference: NgbModalRef;

  @ViewChild('renameBackground') renameBackground: RenameBackgroundComponent;
  background: Background;
  backgrounds: Background[];
  story: Story;
  saveBackgroundAndRun;
  saveButton;
  backgroundTitle = new UntypedFormControl('', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(20)]);

  constructor(private modalService: NgbModal, public backgroundService: BackgroundService,  public toastr: ToastrService, public apiService: ApiService) { }
  /**
   * Opens the rename story Modal
   * @param backgrounds
   * @param background
   */
  openRenameBackgroundModal(backgrounds: Background[], background: Background, story: Story, saveBackgroundAndRun, saveButton) {
    this.background = background;
    this.backgrounds = backgrounds;
    this.story = story;
    this.saveButton = saveButton;
    this.saveBackgroundAndRun = saveBackgroundAndRun;
    this.modalReference = this.modalService.open(this.renameBackground, {ariaLabelledBy: 'modal-basic-title'});
    this.backgroundTitle.setValue(background.name);
  }

  submitRenameBackground() {
    console.log("undefined?",this.backgrounds);
    const title = this.backgroundTitle.value;
    this.backgroundService.renameBackgroundEmit(title);  
    this.backgroundService
    .updateBackground(this.story._id, this.story.storySource, this.story.background)
    .subscribe(_ => {
      this.backgroundService.backgroundChangedEmitter();
      this.toastr.success('successfully saved', 'Background');
      if (this.saveBackgroundAndRun) {
        this.apiService.runSaveOption('saveScenario');
        this.saveBackgroundAndRun = false;
      }
    });
    this.modalReference.close();
  }

  enterSubmit(event) {
    this.submitRenameBackground();
  }

  onClickSubmit() {
    this.submitRenameBackground();
  }
  backgroundUnique() {
    const button = (document.getElementById('submitRenameBackground')) as HTMLButtonElement;
    let input = this.backgroundTitle.value;
    let array = this.backgrounds;
    if ((input && !array.find(i => i.name === input))) {
      button.disabled = false;
    } else {
      button.disabled = true;
      this.toastr.error('This Background Title is already in use. Please choose another Title');
    }
  }
}
