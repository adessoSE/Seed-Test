import { Component, OnInit, ChangeDetectionStrategy, TemplateRef, inject, viewChild, signal, effect, input, untracked } from '@angular/core';
import {NgbModal, NgbModalRef} from '@ng-bootstrap/ng-bootstrap';
import { Block } from '@seed-test/shared/models/Block';
import { StepType } from '@seed-test/shared/models/StepType';
import { BlockService } from 'src/app/Services/block.service';
import { NotificationService } from 'src/app/Services/notification.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent, ConfirmDialogData } from '../confirm-dialog/confirm-dialog.component';
import { ApiService } from 'src/app/Services/api.service';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LayoutModalComponent } from '../layout-modal/layout-modal.component';
import { MatSelectionList, MatListOption } from '@angular/material/list';
import { MatTable, MatColumnDef, MatCellDef, MatCell, MatRowDef, MatRow } from '@angular/material/table';
import { MatFormField, MatSelect, MatOption } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';

@Component({
	selector: 'app-add-block-form',
	templateUrl: './add-block-form.component.html',
	styleUrls: ['./add-block-form.component.css', '../layout-modal/layout-modal.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [LayoutModalComponent, MatSelectionList, FormsModule, MatListOption, MatTable, MatColumnDef, MatCellDef, MatCell, MatRowDef, MatRow, MatFormField, MatSelect, ReactiveFormsModule, MatOption, MatIconModule]
})
export class AddBlockFormComponent implements OnInit {
	private modalService = inject(NgbModal);
	blockService = inject(BlockService);
	notify = inject(NotificationService);
	dialog = inject(MatDialog);
	apiService = inject(ApiService);

	/** Watches for block deletion trigger from the service */
	private deleteBlockEffect = effect(() => {
		const trigger = this.blockService.deleteBlockTrigger();
		if (trigger === 0) return; // skip initial
		this.blockDeleted(this.selectedBlock);
	});

	readonly addBlockFormModal = viewChild<TemplateRef<unknown>>('addBlockFormModal');
 
	currentStepType = new FormControl('When');
	/**
     * Saved blocks
     */
	readonly blocks = signal<Block[]>([]);
	/**
     * New block name when renaming
     */
	newBlockName: string | undefined;

	/**
     * Old block name
     */
	oldName!: string;
	selectedTemplate!: string;
	/**
      * Sets a new selected story
      */
	readonly templateName = input<string>();

	/** Syncs selectedTemplate when templateName input changes */
	private templateNameEffect = effect(() => {
		const name = this.templateName();
		if (name === undefined) return;
		untracked(() => { this.selectedTemplate = name; });
	});
	/**
      * If blocks are saved 
      */
	blockSaved!: boolean;
	/**
      * If save button is disable
      */
	saveBlockButtonDisable: boolean | undefined;

	/**
      * Steps of the current block
      */
	stepList: StepType[] = [];

	/**
      * Current selected block list
      */
	selectedBlockList!: Block[];

	/**
      *The type of step to which to add the block
      */
	addBlockToStepType: string[] = ['Given', 'When', 'Then'];
	/**
      * Currently selected block
      */
	selectedBlock!: Block;

	/**
      * Columns of the select block table
      */
	displayedColumns: string[] = ['stepType', 'pre'];

	/**
      * Background or Scenario, depending from where the block was saved
      */
	correspondingComponent!: string;

	/**
      * Block which is saved to the clipboard
      */
	clipboardBlock!: Block;

	/**
     * Boolean, wether Block should be added as a single steps
     */
	addAsSingleSteps: boolean | undefined;

	modalReference!: NgbModalRef;
     
	ngOnInit() {
		const id = localStorage.getItem('id');
		if (!id) return;
		this.blockService.getBlocks(id).subscribe((resp) => {
			this.blocks.set(resp);
		});
	}

	/**
     * Opens the add block form modal
     * @param correspondingComponent is either background or scenario
     * @param repoId id of the current repository / project
     */
	openAddBlockFormModal(correspondingComponent: string, repoId: string) {
		if (this.selectedTemplate === 'background')
			this.checkaddAsSingleSteps(); 
      
		this.blockSaved = true;
		this.getAllBlocks(repoId);
		this.correspondingComponent = correspondingComponent;
		this.modalReference = this.modalService.open(this.addBlockFormModal(), {ariaLabelledBy: 'modal-basic-title',  modalDialogClass: 'addBlock'});
		if (this.correspondingComponent == 'background') 
			this.clipboardBlock = JSON.parse(sessionStorage.getItem('backgroundBlock')!);
		else if (this.correspondingComponent == 'scenario')
			this.clipboardBlock = JSON.parse(sessionStorage.getItem('scenarioBlock')!);
      
	}

	/**
     * Get all blocks from the backend
     * @param repoId id of the repository / project
     */
	getAllBlocks(repoId: string) {
		this.blockService.getBlocks(repoId).subscribe((resp) => {
			this.blocks.set(resp);
		});
	}

	getFilteredListBlocks() {
		let filtered = this.blocks().filter((b)=> b.isBackground == undefined);
		// In background mode, only show blocks that contain 'when' steps
		if (this.correspondingComponent === 'background') 
			filtered = filtered.filter((b) => b.stepDefinitions?.when?.length > 0);
      
		return filtered;
	}
	/**
     * Deletes a block(call a toastr)
     */
	deleteBlock() {
		let warningMessage;
		let warningQuestion;
		if (this.selectedBlock.usedAsReference){
			warningMessage = "This block has a references and you're going to delete them. It cannot be restored.";
			warningQuestion = 'Delete this block and all its references?';
		} else {
			warningMessage = 'Are you sure you want to delete this block? It cannot be restored.';
			warningQuestion = 'Delete Block?';
		}
		const ref = this.dialog.open(ConfirmDialogComponent, {
			data: {
				title: warningQuestion,
				message: warningMessage,
				buttons: [
					{ label: 'Delete', value: 'delete', color: 'warn' },
					{ label: 'Cancel', value: 'cancel' }
				]
			} as ConfirmDialogData
		});
		ref.afterClosed().subscribe(result => {
			if (result === 'delete') this.blockService.deleteBlockEmitter();
		});
	}  

	/**
     * Delete block from blocks
     * @param block selected block
     */
	blockDeleted(block:Block){
		if (this.blocks().find(x => x === this.selectedBlock))
			this.blockService
				.deleteBlock(block._id!)
				.subscribe((resp) => {
					if (block.usedAsReference)
						this.blockService.deleteReferenceEmitter(block);

					this.blocks.update(b => b.filter(x => x !== this.selectedBlock));
					this.stepList = [];
					this.selectedBlock = undefined!;
					console.log(resp);
					this.updateBlocksEventEmitter();
					this.notify.error('', 'Block deleted');
				}); 
      
	}
	/**
     * Change block title
     */
	changeBlockTitle() {
		this.blockSaved = !this.blockSaved;
	}
	/**
     * Check if a new block name is valid
     */   
	checkName(inputValue: string){
		this.newBlockName = inputValue;
		const isNameValid = this.newBlockName.trim().length > 0;
		const isNameUnique = !this.blocks().some(i => i.name === this.newBlockName) || (this.selectedBlock && this.blocks().some(g => g._id === this.selectedBlock._id && g.name === this.newBlockName));
      
		this.saveBlockButtonDisable = !(isNameValid && isNameUnique);
      
		if (!isNameValid) 
			this.notify.warning('', 'The field cannot be empty. Enter a name.');
		else if (!isNameUnique)
			this.notify.warning('', 'This name already exists. Enter a unique name.');
      
	}
	/**
     * Changes block selection and updates the shown step list
     * @param event
     */
	changeBlockSelection() {
		this.selectedBlock = this.selectedBlockList[0];
		this.selectedBlockList = [];
		this.stepList = [];
		Object.keys(this.selectedBlock.stepDefinitions).forEach((key, _index) => {
			(this.selectedBlock.stepDefinitions as unknown as Record<string, StepType[]>)[key].forEach((step: StepType) => {
				this.stepList.push(step);
			});
		});
		//to avoid an error if the user select another block when the changes haven't been saved
		if (!this.blockSaved){
			this.blockSaved = !this.blockSaved;
			this.saveBlockButtonDisable = undefined;
			this.newBlockName = undefined;
		}
	}

	/**
     * Copies a block from the clipboard to the scenario
     */
	copiedBlock() {
		if (this.clipboardBlock) 
			this.blockService.addBlockToScenario(this.clipboardBlock, this.correspondingComponent, null!, false);
      
	}

	/**
     * Add a block to a scenario
     */
	addBlockFormSubmit() {
		this.blockService.addBlockToScenario(this.selectedBlock, this.correspondingComponent, this.currentStepType.value!, this.addAsSingleSteps ?? false);
		this.addAsSingleSteps = undefined;
		this.selectedBlock = undefined!;
		this.stepList = [];
		this.currentStepType = new FormControl('When');
		this.modalReference.close();
	}
    
	/**
     * Update block when title is changed
     */
	updateBlock(){
		if (!this.saveBlockButtonDisable){
			if (this.newBlockName == undefined)//if user has not entered anything, name saves without changes
				this.newBlockName = this.selectedBlock.name!;
			else {
				this.selectedBlock.name = this.newBlockName.trim();    
				this.blockService
					.updateBlock(this.selectedBlock)
					.subscribe(_ => {
						if (this.selectedBlock.usedAsReference)
							this.blockService.updateNameRefEmitter(this.selectedBlock);
            
						this.updateBlocksEventEmitter();
						this.notify.success('successfully saved', 'Block');
					});
			}
			this.blockSaved = true;
			this.newBlockName = undefined;
		}
 
	}

	updateBlocksEventEmitter() {
		this.blockService.updateBlocksEmitter();
	}

	checkaddAsSingleSteps() {
		this.addAsSingleSteps = (!this.addAsSingleSteps);
	}

	enterSubmit(_event: Event) {
		this.addBlockFormSubmit();
	}

	onClickSubmit() {
		this.addBlockFormSubmit();
	}
	closeModal(){
		this.addAsSingleSteps = undefined;
		this.selectedBlock = undefined!;
		this.currentStepType = new FormControl('When');
		this.stepList = [];
		this.modalReference.close();
	}
}
