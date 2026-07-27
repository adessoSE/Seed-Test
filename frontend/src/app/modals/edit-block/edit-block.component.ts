import { Component, Input, ViewChild, OnInit, ChangeDetectionStrategy, inject, input } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Block } from '@shared/models/Block';
import { BlockService } from 'src/app/Services/block.service';
import { StepType } from '@shared/models/StepType';
import { ThemingService } from '../../Services/theming.service';
import { Subscription } from 'rxjs';

@Component({
	selector: 'app-edit-block',
	templateUrl: './edit-block.component.html',
	styleUrls: ['./edit-block.component.css'],
	changeDetection: ChangeDetectionStrategy.Eager,
	standalone: false
})
export class EditBlockComponent implements OnInit {
	private modalService = inject(NgbModal);
	blockService = inject(BlockService);
	themeService = inject(ThemingService);


	@ViewChild('editBlockModal') editBlockModal: any;

	/**
   * Original step types not sorted or changed
   */
	readonly originalStepTypes = input<StepType[]>([]);

	/**
   * Currently selected block
   */
	@Input() selectedBlock!: Block;

	isDark!: boolean;

	clipboardBlock: Block | null = null;

	modalReference!: NgbModalRef;

	testRunning = false;

	readonly TEMPLATE_NAME = 'block-editor';
	themeObservable!: Subscription;

	ngOnInit() {
		this.isDark = this.themeService.isDarkMode();
		this.themeObservable = this.themeService.themeChanged.subscribe(() => {
			this.isDark = this.themeService.isDarkMode(); 
		});
	}

	/**
   * Opens the edit block form modal
   */
	openEditBlockModal(block: Block) {
		this.modalReference = this.modalService.open(this.editBlockModal, { ariaLabelledBy: 'modal-basic-title', modalDialogClass: 'edit-block' });
		this.clipboardBlock = JSON.parse(sessionStorage.getItem('copiedBlock')!);
		this.selectedBlock = block;
		Object.keys(this.selectedBlock.stepDefinitions).forEach((key, _) => {
			(this.selectedBlock.stepDefinitions as any)[key].forEach((step: StepType) => {
				//to prevent blocks to be checked after pasting
				step.checked = false;
			});
		});
	}

	editBlockSubmit() {
		console.log(this.selectedBlock);
		this.blockService.editBlock(this.selectedBlock).subscribe((resp) => {

			console.log(resp);

			this.updateBlocksEventEmitter();

		});

		console.log('successfully subscirbed');
		this.modalReference.close();
		console.log('successfully closed');
	}

	updateBlocksEventEmitter() {

		this.blockService.updateBlocksEvent.emit();

	}

	enterSubmit(event: any) {
		if (event.keyCode === 13) 
			this.editBlockSubmit();
    
	}

	onClickSubmit() {
		console.log('Go to editBlockSubmit function');
		this.editBlockSubmit();
	}
}


