import { Component, Inject, Optional, OnInit, OnDestroy } from '@angular/core';
import { RepositoryContainer } from '@shared/models/RepositoryContainer';
import { NgForm, UntypedFormControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subscription } from 'rxjs';

@Component({
	selector: 'app-import-modal',
	templateUrl: './import-modal.component.html',
	styleUrls: ['./import-modal.component.css'],
	standalone: false
})
export class ImportModalComponent implements OnInit, OnDestroy {

	// --- Class properties for the template bindings ---
	isNewProject: boolean = false; 
	importMode: boolean = true; // true = Rename, false = Overwrite
	projectName: string = '';
	errorMessage: string | null = null;
	file: File | null = null;

	searchTerm: string = '';
	searchList: RepositoryContainer[] = [];

	chooseFile: any; // Used by the file input's [(ngModel)]
	selectedProject!: string; // Used by the mat-select's [(ngModel)]
	// ---------------------------------------------------

	toggleNewProject = new UntypedFormControl(false);
	toggleImportMode = new UntypedFormControl(true); // Default to 'Rename' (true)

	repoList: RepositoryContainer[] = [];

	private toggleNewProjectSub!: Subscription;
	private toggleImportModeSub!: Subscription;

	constructor(
		// Use MatDialogRef for Angular Material Modals
		public dialogRef: MatDialogRef<ImportModalComponent>,
		// Receive data (like the repoList) from the parent component
		@Optional() @Inject(MAT_DIALOG_DATA) public data: { repoList: RepositoryContainer[] }
	) {
		if (data && data.repoList) {
			this.repoList = data.repoList;
			this.searchList = data.repoList; // Initialize search list with all repos
		}
	}

	ngOnInit() {
		this.toggleNewProjectSub = this.toggleNewProject.valueChanges.subscribe(value => {
			this.isNewProject = value;
			// Clear project name when switching to "New Project" mode
			if (value)
				this.projectName = '';
		});
    
		this.toggleImportModeSub = this.toggleImportMode.valueChanges.subscribe(value => {
			this.importMode = value;
		});

		// Set initial values
		this.isNewProject = this.toggleNewProject.value;
		this.importMode = this.toggleImportMode.value;
	}

	ngOnDestroy() {
		// Clean up subscriptions
		if (this.toggleNewProjectSub) 
			this.toggleNewProjectSub.unsubscribe();
    
		if (this.toggleImportModeSub) 
			this.toggleImportModeSub.unsubscribe();
    
	}

	/**
   * Called by the "Import" button.
   * Gathers all form data and closes the modal, passing the data back to the parent.
   */
	submitImportData(form: NgForm) {
		if (!this.file) {
			this.errorMessage = 'Please select a file to import.';
			return;
		}

		const targetRepoId = this.isNewProject ? undefined : form.value.selectedProject;
		const targetProjectName = this.isNewProject ? form.value.projectName : undefined;

		if (!this.isNewProject && !targetRepoId) {
			this.errorMessage = 'Please select a project to import into.';
			return;
		}
    
		if (this.isNewProject && (!targetProjectName || targetProjectName.trim() === '')) {
			this.errorMessage = 'Please enter a name for the new project.';
			return;
		}

		const importData = {
			file: this.file,
			repoId: targetRepoId,
			projectName: targetProjectName,
			importMode: this.importMode
		};

		// Close the modal and return 'importData' to the parent's 'afterClosed()' subscription
		this.dialogRef.close(importData);
	}

	/**
   * Called by the "Cancel" button.
   */
	onCancel(): void {
		this.dialogRef.close(); // Closes the modal, returning no data
	}


	// --- Helper Functions ---

	handleFileInput(event: any) {
		const file = event.target.files[0];
		const maxSizeInBytes = 10485760; // 10 MB

		if (file) {
			this.file = null; // Reset first
			if (file.size > maxSizeInBytes) 
				this.errorMessage = 'The file is too large. Please select a smaller file.';
			else if (!this.isValidFileFormat(file)) 
				this.errorMessage = 'Invalid file format. Please select a valid .zip file.';
			else {
				this.errorMessage = null;
				this.file = file;
			}
		}
	}

	onImportToggleChange() {
		this.errorMessage = null;
	}

	searchRepos(form?: NgForm) {
		const matSelectElement = document.getElementById('projectDropDownSelect');
		if (matSelectElement && this.searchTerm) 
			matSelectElement.click();
    
		const inputElement = document.querySelector('.searchInputProject') as HTMLInputElement;
		if (inputElement) inputElement.focus();
    
		if (form!.value.searchTerm) {
			this.searchTerm = form!.value.searchTerm.trim().toLowerCase();
			this.searchList = this.repoList.filter(repo => repo.repoName.toLowerCase().includes(this.searchTerm));
		} else 
			this.searchList = this.repoList; // Show all repos if search is empty
    
		return this.searchList;
	}

	isValidFileFormat(file: File): boolean {
		const validExtensions = ['zip'];
		const validMimeType = ['application/x-zip-compressed', 'application/zip']; 
		const fileExt = this.getFileExtension(file.name);
    
		// Check MimeType OR file extension
		if (validMimeType.includes(file.type) || validExtensions.includes(fileExt)) 
			return true;
    
		return false;
	}

	getFileExtension(fileName: string): string {
		return fileName.split('.').pop()?.toLowerCase() || '';
	}

	// Reset error messages on user interaction
	onSlideToggleChange() { this.errorMessage = null; }
	onProjectChange() { this.errorMessage = null; }
}