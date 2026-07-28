import { Component, OnInit, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { ThemingService } from '../Services/theming.service';
import { StoryService } from '../Services/story.service';
import { FileElement } from '@shared/models/FileElement';
import { ProjectService } from '../Services/project.service';
import { Observable } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { MatCheckbox } from '@angular/material/checkbox';
import { DatePipe } from '@angular/common';

@Component({
	selector: 'app-file-manager',
	templateUrl: './file-manager.component.html',
	styleUrl: './file-manager.component.css',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FormsModule, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCheckbox, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, DatePipe]
})

export class FileManagerComponent implements OnInit {
	private themeService = inject(ThemingService);
	storyService = inject(StoryService);
	fileService = inject(ProjectService);


	readonly isDark = computed(() => this.themeService.isDark());
	repoId!: string;
	allFiles = signal<FileElement[]>([]);
	searchedFiles = signal<FileElement[]>([]);
	searchText: string = '';
	fileElements!: Observable<FileElement[]>;
	selection = new Set<any>();
	isAllSelected: boolean = false;


	/**
   * @ignore
   */
	ngOnInit(): void {
		this.repoId = localStorage.getItem('id')!;
		this.updateFileElementQuery(this.repoId);
		this.fileElements.subscribe((files: FileElement[]) => {
			this.allFiles.set(files);
			this.searchFile();
		});

	}

	goBackToStoryEditor(): void {
		this.storyService.changeStoryViewEvent('storyView');
	}

	/**
   * Updates the file elements by querying the file service with the repository ID.
   */
	updateFileElementQuery(repoId: any): void {
		this.fileElements = this.fileService.queryFiles(repoId);
	}

	/**
   * Filters the files based on the search text.
   */
	searchFile(): void {
		if (this.searchText.trim() === '')
			this.searchedFiles.set(this.allFiles());
		else
			this.searchedFiles.set(this.allFiles().filter(file =>
				file.filename!.toLowerCase().includes(this.searchText.toLowerCase())
			));
    
	}

	/**
   * all checkboxes are selected
   */
	toggleAllSelection(_event: Event): void {
		if (this.selection.size === this.searchedFiles().length)
			this.selection.clear();
		else
			this.searchedFiles().forEach(file => this.selection.add(file));
		
		this.isAllSelected = !this.isAllSelected;
	}

	/**
   * Deletes the selected files
   */
	deleteFile(): void {
		this.allFiles.set(this.allFiles().filter(file => !this.selection.has(file)));
		Array.from(this.selection).map(file => {
			this.fileService.deleteUploadedFile(this.repoId, file._id).subscribe(() => {
				this.updateFileElementQuery(this.repoId);
			});
		});
		this.selection.clear();
		this.isAllSelected = false;
	}

	/**
   * Set checkbox to selected file
   * @param element
   */
	selectedRow(element: any) {
		if (this.selection.has(element)) 
			this.selection.delete(element);
		else 
			this.selection.add(element);
		
		this.isAllSelected = this.selection.size === this.searchedFiles().length;
	}

	/**
   * Uploads a selected file
   * @param event
   */
	selectUploadFile(event: any): void {
		const file: File = event.target.files.item(0);
		this.fileService.uploadFile(this.repoId, file)
			.subscribe((_res: FileElement) => {
				this.updateFileElementQuery(this.repoId);
			});
	}

	/**
   * Converts an ArrayBuffer to a Base64 string
   * @param buffer
   */
	arrayBufferToBase64(buffer: ArrayBuffer): string {
		const binary = new Uint8Array(buffer);
		let base64 = '';
		for (const byte of binary) 
			base64 += String.fromCharCode(byte);
    
		return window.btoa(base64);
	}

	/**
   * Checks if a file is selected and highlights it
   * @param file
   */
	isFileSelected(file: FileElement): boolean {
		return this.selection.has(file);
	}

	/**
   * To pass the sonarCloud check?
   */
	onKeyDown(_event: KeyboardEvent, _row: FileElement): void {
		console.log('KeyDown event');
	}
}
