import { Component, OnInit, ViewChild } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { FileElement } from '../../model/FileElement';
import { ProjectService } from '../../Services/project.service';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ThemingService } from '../../Services/theming.service';

@Component({
  selector: 'app-file-explorer-modal',
  templateUrl: './file-explorer-modal.component.html',
  styleUrls: ['./file-explorer-modal.component.css']
})
export class FileExplorerModalComponent implements OnInit {
  public fileElements: Observable<FileElement[]>;
  modalReference: NgbModalRef;
  repoId: string;
  fileExlorerEmpty: boolean;
  allFiles: FileElement[]=[];
  searchedFiles: FileElement[] = [];
  selectedFile: FileElement| null = null;
  searchText: string = '';
  isDark: boolean;
  themeObservable: Subscription;

  @ViewChild ('fileExplorerModal') fileExplorerModal: FileExplorerModalComponent;

  constructor(private modalService: NgbModal, public fileService: ProjectService, public themeService: ThemingService) {}

  ngOnInit() {
    this.repoId = localStorage.getItem('id'); // set before updateFileElementQuery
    this.isDark = this.themeService.isDarkMode();
    this.themeObservable = this.themeService.themeChanged.subscribe((changedTheme) => {
        this.isDark = this.themeService.isDarkMode();
    });
    this.updateFileElementQuery();
    this.fileElements.subscribe((file: FileElement[])=> {
      this.allFiles = file;
      this.searchFile(); 
    })
  }

  openFileExplorerModal() {
    this.modalReference = this.modalService.open(this.fileExplorerModal);
    this.fileExlorerEmpty = this.allFiles.length > 0 ? false : true;
    return this.modalReference.result.catch((reason)=> console.log('UploadFileModal dismissed: ', reason))
  }

  updateFileElementQuery() {
    this.fileElements = this.fileService.queryFiles(this.repoId);
  }

  selectUploadFile(event: any) {
    const file = event.target.files[0];
    file.arrayBuffer().then(arrayBuffer => {
      this.fileService.uploadFile(this.repoId, arrayBuffer, file.name)
        .subscribe((res: FileElement) => {
          this.updateFileElementQuery();
          delete this.selectedFile;
        });
    });
  }

  selected(event: MouseEvent, element: FileElement) {
    this.selectedFile = element;
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
    this.fileService.deleteUploadedFile(this.selectedFile._id).subscribe(()=>{
      this.updateFileElementQuery();
    });
    this.updateFileElementQuery();
    delete this.selectedFile;
  }

  submitUploadFile() {
    this.modalReference.close(this.selectedFile);
    delete this.selectedFile;
  }

  closeModal(){
    delete this.selectedFile;
    this.modalReference.close();
  }
}
