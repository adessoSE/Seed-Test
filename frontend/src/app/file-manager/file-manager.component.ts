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
  selectedFile: FileElement | null = null;
  searchText: string = '';
  public fileElements: Observable<FileElement[]>;

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
    this.fileElements.subscribe((file: FileElement[]) => {
      this.allFiles = file;
      this.searchFile();
    })
    this.repoId = localStorage.getItem('id');
  }

  /**
   * Returns to story editor
   */
  goBackToStoryEditor() {
    this.storyService.changeStoryViewEvent("storyView");
  }

  updateFileElementQuery() {
    this.fileElements = this.fileService.queryFiles(this.repoId);
  }

  searchFile() {
    if (this.searchText.trim() === '') {
      this.searchedFiles = this.allFiles;
    } else {
      this.searchedFiles = this.allFiles.filter(file =>
        file.filename.toLowerCase().includes(this.searchText.toLowerCase())
      );
    }
  }

  deleteFile() {
    console.log("delete: ", this.selectedFile)
    this.fileService.deleteUploadedFile(this.selectedFile._id).subscribe(() => {
      this.updateFileElementQuery();
    });
    this.updateFileElementQuery();
    delete this.selectedFile;
  }

  selected(event: MouseEvent, element: FileElement) {
    this.selectedFile = element;
  }


  selectUploadFile(event: any) {
    const file: File = event.target.files.item(0);
    this.fileService.uploadFile(this.repoId, file)
      .subscribe((res: FileElement) => {
        this.updateFileElementQuery();
        delete this.selectedFile;
      });
  }

}
