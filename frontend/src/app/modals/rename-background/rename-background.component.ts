import { Component, ChangeDetectionStrategy, inject, viewChild, TemplateRef } from '@angular/core';
import { UntypedFormControl, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { BackgroundService } from 'src/app/Services/background.service';
import { Background } from '@seed-test/shared/models/Background';
import { Story } from '@seed-test/shared/models/Story';
import { NotificationService } from '../../Services/notification.service';
import { ApiService } from '../../Services/api.service';
import { Block } from '@seed-test/shared/models/Block';
import { BlockService } from '../../Services/block.service';
import { LayoutModalComponent, MODAL_CONFIG } from '../layout-modal/layout-modal.component';


@Component({
	selector: 'app-rename-background',
	templateUrl: './rename-background.component.html',
	styleUrls: ['./rename-background.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [LayoutModalComponent, FormsModule, ReactiveFormsModule]
})
export class RenameBackgroundComponent{
	private modalService = inject(MatDialog);
	backgroundService = inject(BackgroundService);
	notify = inject(NotificationService);
	apiService = inject(ApiService);
	blockService = inject(BlockService);


	modalReference!: MatDialogRef<unknown>;

	readonly renameBackground = viewChild.required<TemplateRef<unknown>>('renameBackground');
	background!: Background;
	backgrounds!: Background[];
	story!: Story;
	saveBackgroundAndRun!: boolean;
	blockToRename!: Block;
	storiesWithBlock!: Story[];
	backgroundTitle = new UntypedFormControl('', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(20)]);
	/**
   * Opens the rename story Modal
   * @param backgrounds
   * @param background
   */
	openRenameBackgroundModal(backgrounds: Background[], background: Background, story: Story, saveBackgroundAndRun: boolean, blockToRename: Block, storiesWithBlock: Story[]) {
		this.background = background;
		this.backgrounds = backgrounds;
		this.story = story;
		this.blockToRename = blockToRename;
		this.storiesWithBlock = storiesWithBlock;
		this.saveBackgroundAndRun = saveBackgroundAndRun;
		this.modalReference = this.modalService.open(this.renameBackground(), { ...MODAL_CONFIG, ariaLabelledBy: 'modal-basic-title', autoFocus: 'first-tabbable' });
		this.backgroundTitle.setValue(background.name);
	}

	submitRenameBackground() {
		const title = this.backgroundTitle.value;
		this.story.background.saved = undefined;
		this.backgroundService.renameBackgroundEmit(title);  
		if (this.blockToRename && (this.storiesWithBlock && this.storiesWithBlock.length == 1)){
			this.blockToRename.name = title;
			this.blockService.updateBlock(this.blockToRename).subscribe({
				next: _=>{
					this.updateBlocksEventEmitter();
				},
				error: () => this.notify.error('Could not rename block')
			});
		}
		this.backgroundService
			.updateBackground(this.story._id!, this.story.background)
			.subscribe({
				next: _ => {
					this.backgroundService.backgroundChangedEmitter();
					this.notify.success('successfully saved', 'Background');
					if (this.saveBackgroundAndRun) {
						this.apiService.runSaveOption('saveScenario');
						this.saveBackgroundAndRun = false;
					}
				},
				error: () => this.notify.error('Could not save background')
			});
		this.backgroundService.backgroundReplaced = false;
		this.modalReference.close();
	}

	enterSubmit(_event: Event) {
		this.submitRenameBackground();
	}

	onClickSubmit() {
		this.submitRenameBackground();
	}
	updateBlocksEventEmitter() {
		this.blockService.updateBlocksEmitter();
	}
	backgroundUnique() {
		const button = (document.getElementById('submitRenameBackground')) as HTMLButtonElement;
		const input = this.backgroundTitle.value;
		const array = this.backgrounds;
		if ((input && !array.find(i => i.name === input))) 
			button.disabled = false;
		else if (input.length == 0){
			this.notify.error('Background Title can not be empty. Please enter the Title');
			button.disabled = true;
		} else {
			button.disabled = true;
			this.notify.error('This Background Title is already in use. Please choose another Title');
		}
	}
}
