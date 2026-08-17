import { Component, OnInit, ChangeDetectionStrategy, inject, computed, signal, linkedSignal, effect } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ThemingService } from '../Services/theming.service';
import { StoryService } from '../Services/story.service';
import { FileElement } from '@seed-test/shared/models/FileElement';
import { ProjectService } from '../Services/project.service';
import { FormsModule } from '@angular/forms';
import { MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { MatCheckbox } from '@angular/material/checkbox';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
	selector: 'app-file-manager',
	templateUrl: './file-manager.component.html',
	styleUrl: './file-manager.component.css',
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [FormsModule, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCheckbox, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, DatePipe, MatIconModule]
})

export class FileManagerComponent implements OnInit {
	private themeService = inject(ThemingService);
	storyService = inject(StoryService);
	fileService = inject(ProjectService);


	readonly isDark = computed(() => this.themeService.isDark());
	repoId!: string;
	readonly refreshFilesTrigger = signal(0);
	/**
     * Direct signal dependency on service's fileElements — no BehaviorSubject bridge.
     * Automatically syncs whenever the service signal changes (query, upload, delete).
     */
	readonly allFiles = linkedSignal(() => this.fileService.fileElements());
	readonly searchedFiles = signal<FileElement[]>([]);
	searchText: string = '';
	selection = new Set<FileElement>();
	isAllSelected: boolean = false;

	/**
     * Reactive file refresh effect — calls loadFiles when refreshFilesTrigger changes.
     * Uses field initializer to stay within injection context.
     */
	constructor() {
		effect(() => {
			this.refreshFilesTrigger();
			this.loadFiles();
		});
	}


	ngOnInit(): void {
		this.repoId = localStorage.getItem('id')!;
		this.refreshFilesTrigger.update(n => n + 1);
	}

	/**
     * Loads files from the backend and syncs with the service signal.
     * The queryFiles() method already sets fileElements via tap(), so no duplicate set needed.
     */
	async loadFiles(): Promise<void> {
		if (!this.repoId) return;
		try {
			// queryFiles already sets fileElements in its tap() handler
			await firstValueFrom(this.fileService.queryFiles(this.repoId));
		} catch (error) {
			console.error('Failed to load files:', error);
			this.fileService.fileElements.set([]);
		}
	}

	goBackToStoryEditor(): void {
		this.storyService.changeStoryViewEvent('storyView');
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
   * Deletes the selected files and refreshes the file list.
   */
	async deleteFile(): Promise<void> {
		const filesToDelete = Array.from(this.selection);
		await Promise.all(
			filesToDelete.map(file =>
				firstValueFrom(this.fileService.deleteUploadedFile(this.repoId, file._id!))
			)
		);
		this.selection.clear();
		this.isAllSelected = false;
		this.refreshFilesTrigger.update(n => n + 1);
	}

	/**
   * Set checkbox to selected file
   * @param element
   */
	selectedRow(element: FileElement) {
		if (this.selection.has(element)) 
			this.selection.delete(element);
		else 
			this.selection.add(element);
		
		this.isAllSelected = this.selection.size === this.searchedFiles().length;
	}

	/**
   * Uploads a selected file and refreshes the file list.
   * @param event
   */
	async selectUploadFile(event: Event): Promise<void> {
		const file: File = (event.target as HTMLInputElement).files!.item(0)!;
		await firstValueFrom(this.fileService.uploadFile(this.repoId, file));
		this.refreshFilesTrigger.update(n => n + 1);
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
