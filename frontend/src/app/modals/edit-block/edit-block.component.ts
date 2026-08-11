import { Component, ChangeDetectionStrategy, TemplateRef, inject, input, viewChild, computed, linkedSignal } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Block } from '@shared/models/Block';
import { BlockService } from 'src/app/Services/block.service';
import { StepType } from '@shared/models/StepType';
import { ThemingService } from '../../Services/theming.service';
import { LayoutModalComponent } from '../layout-modal/layout-modal.component';
import { BaseEditorComponent } from '../../base-editor/base-editor.component';
import { MatIconModule } from '@angular/material/icon';

@Component({
	selector: 'app-edit-block',
	templateUrl: './edit-block.component.html',
	styleUrls: ['./edit-block.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [LayoutModalComponent, BaseEditorComponent, MatIconModule]
})
export class EditBlockComponent {
	private modalService = inject(NgbModal);
	blockService = inject(BlockService);
	themeService = inject(ThemingService);


	readonly editBlockModal = viewChild<TemplateRef<unknown>>('editBlockModal');

	/**
   * Original step types not sorted or changed
   */
	readonly originalStepTypes = input<StepType[]>([]);

	/**
   * Currently selected block
   */
	// eslint-disable-next-line @angular-eslint/no-input-rename
	protected readonly selectedBlockInput = input.required<Block>({ alias: 'selectedBlock' });
	readonly selectedBlock = linkedSignal(() => this.selectedBlockInput()!);

	readonly isDark = computed(() => this.themeService.isDark());

	clipboardBlock: Block | null = null;

	modalReference!: NgbModalRef;

	testRunning = false;

	readonly TEMPLATE_NAME = 'block-editor';

	/**
   * Opens the edit block form modal
   */
	openEditBlockModal(block: Block) {
		this.modalReference = this.modalService.open(this.editBlockModal(), { ariaLabelledBy: 'modal-basic-title', modalDialogClass: 'edit-block' });
		this.clipboardBlock = JSON.parse(sessionStorage.getItem('copiedBlock')!);
		this.selectedBlock.set(block);
		Object.keys(this.selectedBlock().stepDefinitions).forEach((key, _) => {
			(this.selectedBlock().stepDefinitions as unknown as Record<string, StepType[]>)[key].forEach((step: StepType) => {
				//to prevent blocks to be checked after pasting
				step.checked = false;
			});
		});
	}

	editBlockSubmit() {
		console.log(this.selectedBlock());
		this.blockService.editBlock(this.selectedBlock()).subscribe((resp) => {

			console.log(resp);

			this.updateBlocksEventEmitter();

		});

		console.log('successfully subscirbed');
		this.modalReference.close();
		console.log('successfully closed');
	}

	updateBlocksEventEmitter() {
		this.blockService.updateBlocksEmitter();
	}

	enterSubmit(event: KeyboardEvent) {
		if (event.keyCode === 13) 
			this.editBlockSubmit();
    
	}

	onClickSubmit() {
		console.log('Go to editBlockSubmit function');
		this.editBlockSubmit();
	}
}


