import { Component, OnInit, ChangeDetectionStrategy, inject, viewChild, computed, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { FileElement } from '@seed-test/shared/models/FileElement';
import { ProjectService } from '../../Services/project.service';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ThemingService } from '../../Services/theming.service';
import { NotificationService } from '../../Services/notification.service';
import { LayoutModalComponent } from '../layout-modal/layout-modal.component';
import { FormsModule } from '@angular/forms';
import { MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
	selector: 'app-file-explorer-modal',
	templateUrl: './file-explorer-modal.component.html',
	styleUrls: ['./file-explorer-modal.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [LayoutModalComponent, FormsModule, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, DatePipe, MatIconModule]
})
export class FileExplorerModalComponent implements OnInit {
	private modalService = inject(NgbModal);
	fileService = inject(ProjectService);
	themeService = inject(ThemingService);
	notify = inject(NotificationService);

	public fileElements!: Observable<FileElement[]>;
	modalReference!: NgbModalRef;
	repoId!: string;
	fileExlorerEmpty!: boolean;
	readonly allFiles = signal<FileElement[]>([]);
	readonly searchedFiles = signal<FileElement[]>([]);
	selectedFile: FileElement | null = null;
	searchText: string = '';
	readonly isDark = computed(() => this.themeService.isDark());

	readonly fileExplorerModal = viewChild.required<FileExplorerModalComponent>('fileExplorerModal');

	ngOnInit() {
		this.repoId = localStorage.getItem('id')!; // set before updateFileElementQuery
		this.updateFileElementQuery();
		this.fileElements.subscribe({
			next: (file: FileElement[]) => {
				this.allFiles.set(file);
				this.searchFile();
			},
			error: () => this.notify.error('Could not load files')
		});
	}

	openFileExplorerModal() {
		this.modalReference = this.modalService.open(this.fileExplorerModal());
		this.fileExlorerEmpty = this.allFiles().length > 0 ? false : true;
		// Dismissing the modal rejects `result`; that is a normal close, so the rejection is swallowed here
		return this.modalReference.result.catch(() => undefined);
	}

	updateFileElementQuery() {
		this.fileElements = this.fileService.queryFiles(this.repoId);
	}

	arrayBufferToBase64(buffer: ArrayBuffer) {
		const binary = new Uint8Array(buffer);
		let base64 = '';
		for (let i = 0; i < binary.length; i++) 
			base64 += String.fromCharCode(binary[i]);
    
		return window.btoa(base64);
	}

	selectUploadFile(event: Event) {
		const file: File = (event.target as HTMLInputElement).files!.item(0)!;
		this.fileService.uploadFile(this.repoId, file)
			.subscribe({
				next: (_res: FileElement) => {
					this.updateFileElementQuery();
					this.selectedFile = null;
				},
				error: () => this.notify.error('Could not upload file')
			});
	}

	selected(event: MouseEvent, element: FileElement) {
		this.selectedFile = element;
	}

	searchFile() {
		if (this.searchText.trim() === '')
			this.searchedFiles.set(this.allFiles());
		else
			this.searchedFiles.set(this.allFiles().filter(file =>
				file.filename!.toLowerCase().includes(this.searchText.toLowerCase())
			));
    
	}

	deleteFile() {
		this.fileService.deleteUploadedFile(this.repoId, this.selectedFile!._id!).subscribe({
			next: () => {
				this.updateFileElementQuery();
			},
			error: () => this.notify.error('Could not delete file')
		});
		this.updateFileElementQuery();
		this.selectedFile = null;
	}

	submitUploadFile() {
		this.modalReference.close(this.selectedFile);
		this.selectedFile = null;
	}

	closeModal(){
		this.selectedFile = null;
		this.modalReference.close();
	}
}
