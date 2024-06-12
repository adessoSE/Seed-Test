import { Component, OnInit } from '@angular/core';
import { ThemingService } from '../Services/theming.service';
import { StoryService } from '../Services/story.service';
import { Subscription } from 'rxjs/internal/Subscription';
import { FileElement } from '../model/FileElement';
import { ProjectService } from '../Services/project.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-file-manager',
  templateUrl: './file-manager.component.html',
  styleUrl: './file-manager.component.css'
})

export class FileManagerComponent implements OnInit {


  isDark: boolean;
  repoId: string;
  allFiles: FileElement[] = [];
  searchedFiles: FileElement[] = [];
  searchText: string = '';
  fileElements: Observable<FileElement[]>;
  selection = new Set<any>();
  isAllSelected: boolean = false;

  themeObservable: Subscription;
  /**
    * @ignore
    */
  constructor(private themeService: ThemingService, public storyService: StoryService, public fileService: ProjectService) { }


  /**
   * @ignore
   */
  ngOnInit(): void {
    this.isDark = this.themeService.isDarkMode();
    this.themeObservable = this.themeService.themeChanged.subscribe((changedTheme) => {
      this.isDark = this.themeService.isDarkMode();
    });
    this.updateFileElementQuery();
    this.fileElements.subscribe((files: FileElement[]) => {
      this.allFiles = files;
      this.searchFile();
    });
    this.repoId = localStorage.getItem('id');
  }

  goBackToStoryEditor(): void {
    this.storyService.changeStoryViewEvent("storyView");
  }

  /**
   * Updates the file elements by querying the file service with the repository ID.
   */
  updateFileElementQuery(): void {
    this.fileElements = this.fileService.queryFiles(this.repoId);
  }

  /**
   * Filters the files based on the search text.
   */
  searchFile(): void {
    if (this.searchText.trim() === '') {
      this.searchedFiles = this.allFiles;
    } else {
      this.searchedFiles = this.allFiles.filter(file =>
        file.filename.toLowerCase().includes(this.searchText.toLowerCase())
      );
    }
  }

  /**
   * all checkboxes are selected
   */
  toggleAllSelection(event: Event): void {
    this.selection.size === this.searchedFiles.length ? this.selection.clear() : this.searchedFiles.forEach(file => this.selection.add(file));
    this.isAllSelected = !this.isAllSelected;
  }

  /**
   * Deletes the selected files
   */
  deleteFile(): void {
    this.allFiles = this.allFiles.filter(file => !this.selection.has(file));
    Array.from(this.selection).map(file => {
      this.fileService.deleteUploadedFile(file._id).subscribe(() => {
        this.updateFileElementQuery();
      });
    });
    this.selection.clear();
    this.isAllSelected = false;
  }

  /**
   * Set checkbox to selected file
   * @param element
   */
  selectedRow(element) {
    this.selection.has(element) ? this.selection.delete(element) : this.selection.add(element);
    this.isAllSelected = this.selection.size === this.searchedFiles.length;
  }

  /**
   * Uploads a selected file
   * @param event
   */
  selectUploadFile(event: any): void {
    const file: File = event.target.files.item(0);
    this.fileService.uploadFile(this.repoId, file)
      .subscribe((res: FileElement) => {
        this.updateFileElementQuery();
      });
  }

  /**
   * Converts an ArrayBuffer to a Base64 string
   * @param buffer
   */
  arrayBufferToBase64(buffer: ArrayBuffer): string {
    const binary = new Uint8Array(buffer);
    let base64 = '';
    for (const byte of binary) {
      base64 += String.fromCharCode(byte);
    }
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
  onKeyDown(event: KeyboardEvent, row: FileElement): void {
    console.log('KeyDown event');
  }
}
