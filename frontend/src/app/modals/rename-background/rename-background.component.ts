import { Component, ViewChild } from '@angular/core';
import { UntypedFormControl, Validators } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { BackgroundService } from 'src/app/Services/background.service';
import { Background } from '../../model/Background';
import { Story } from '../../model/Story';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from '../../Services/api.service';
import { Block } from '../../model/Block';
import { BlockService } from '../../Services/block.service';

@Component({
    selector: 'app-rename-background',
    templateUrl: './rename-background.component.html',
    styleUrls: ['./rename-background.component.css'],
    standalone: false
})
export class RenameBackgroundComponent{

  modalReference: NgbModalRef;

  @ViewChild('renameBackground') renameBackground: RenameBackgroundComponent;
  background: Background;
  backgrounds: Background[];
  story: Story;
  saveBackgroundAndRun;
  blockToRename: Block;
  storiesWithBlock: Story[];
  backgroundTitle = new UntypedFormControl('', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(20)]);

  constructor(private modalService: NgbModal, public backgroundService: BackgroundService,  public toastr: ToastrService, public apiService: ApiService, public blockService: BlockService) { }
  /**
   * Opens the rename story Modal
   * @param backgrounds
   * @param background
   */
  openRenameBackgroundModal(backgrounds: Background[], background: Background, story: Story, saveBackgroundAndRun, blockToRename, storiesWithBlock) {
    this.background = background;
    this.backgrounds = backgrounds;
    this.story = story;
    this.blockToRename = blockToRename;
    this.storiesWithBlock = storiesWithBlock;
    this.saveBackgroundAndRun = saveBackgroundAndRun;
    this.modalReference = this.modalService.open(this.renameBackground, {ariaLabelledBy: 'modal-basic-title'});
    this.backgroundTitle.setValue(background.name);
  }

  submitRenameBackground() {
    const title = this.backgroundTitle.value;
    this.story.background.saved = undefined;
    this.backgroundService.renameBackgroundEmit(title);  
    if(this.blockToRename && (this.storiesWithBlock && this.storiesWithBlock.length == 1)){
      this.blockToRename.name = title;
      this.blockService.updateBlock(this.blockToRename).subscribe(_=>{
        this.updateBlocksEventEmitter();
      })
    }
    this.backgroundService
      .updateBackground(this.story._id, this.story.background)
      .subscribe(_ => {
        this.backgroundService.backgroundChangedEmitter();
        this.toastr.success('successfully saved', 'Background');
        if (this.saveBackgroundAndRun) {
          this.apiService.runSaveOption('saveScenario');
          this.saveBackgroundAndRun = false;
        }
    });
    this.backgroundService.backgroundReplaced = undefined;
    this.modalReference.close();
  }

  enterSubmit(event) {
    this.submitRenameBackground();
  }

  onClickSubmit() {
    this.submitRenameBackground();
  }
  updateBlocksEventEmitter() {
    this.blockService.updateBlocksEvent.emit();
  }
  backgroundUnique() {
    const button = (document.getElementById('submitRenameBackground')) as HTMLButtonElement;
    let input = this.backgroundTitle.value;
    let array = this.backgrounds;
    if ((input && !array.find(i => i.name === input))) {
      button.disabled = false;
    } else if (input.length == 0){
      this.toastr.error('Background Title can not be empty. Please enter the Title');
      button.disabled = true;
    }
     else{
      button.disabled = true;
      this.toastr.error('This Background Title is already in use. Please choose another Title');
    }
  }
}
