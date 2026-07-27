import { Component, OnInit, ChangeDetectionStrategy, inject, viewChild } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { FileElement } from '@shared/models/FileElement';
import { ProjectService } from '../../Services/project.service';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ThemingService } from '../../Services/theming.service';

@Component({
	selector: 'app-file-explorer-modal',
	templateUrl: './file-explorer-modal.component.html',
	styleUrls: ['./file-explorer-modal.component.css'],
	changeDetection: ChangeDetectionStrategy.Eager,
	standalone: false
})
export class FileExplorerModalComponent implements OnInit {
	private modalService = inject(NgbModal);
	fileService = inject(ProjectService);
	themeService = inject(ThemingService);

	public fileElements!: Observable<FileElement[]>;
	modalReference!: NgbModalRef;
	repoId!: string;
	fileExlorerEmpty!: boolean;
	allFiles: FileElement[] = [];
	searchedFiles: FileElement[] = [];
	selectedFile: FileElement | null = null;
	searchText: string = '';
	isDark!: boolean;
	themeObservable!: Subscription;

	readonly fileExplorerModal = viewChild.required<FileExplorerModalComponent>('fileExplorerModal');

	ngOnInit() {
		this.repoId = localStorage.getItem('id')!; // set before updateFileElementQuery
		this.isDark = this.themeService.isDarkMode();
		this.themeObservable = this.themeService.themeChanged.subscribe((_changedTheme) => {
			this.isDark = this.themeService.isDarkMode();
		});
		this.updateFileElementQuery();
		this.fileElements.subscribe((file: FileElement[])=> {
			this.allFiles = file;
			this.searchFile(); 
		});
	}

	openFileExplorerModal() {
		this.modalReference = this.modalService.open(this.fileExplorerModal());
		this.fileExlorerEmpty = this.allFiles.length > 0 ? false : true;
		return this.modalReference.result.catch((reason)=> console.log('UploadFileModal dismissed: ', reason));
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

	selectUploadFile(event: any) {
		const file: File = event.target.files.item(0);
		this.fileService.uploadFile(this.repoId, file)
			.subscribe((_res: FileElement) => {
				this.updateFileElementQuery();
				this.selectedFile = null;
			});
	}

	selected(event: MouseEvent, element: FileElement) {
		this.selectedFile = element;
	}

	searchFile() {
		if (this.searchText.trim() === '') 
			this.searchedFiles = this.allFiles;
		else 
			this.searchedFiles = this.allFiles.filter(file => 
				file.filename!.toLowerCase().includes(this.searchText.toLowerCase())
			);
    
	}

	deleteFile() {
		console.log('delete: ', this.selectedFile);
		this.fileService.deleteUploadedFile(this.repoId, this.selectedFile!._id!).subscribe(()=>{
			this.updateFileElementQuery();
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
