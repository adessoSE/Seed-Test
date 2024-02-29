import { Component, OnInit, ViewChild } from '@angular/core';
import { Observable } from 'rxjs';
import { FileElement } from '../../model/FileElement';
import { ProjectService } from '../../Services/project.service';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-file-explorer-modal',
  templateUrl: './file-explorer-modal.component.html',
  styleUrls: ['./file-explorer-modal.component.css']
})
export class FileExplorerModalComponent implements OnInit {
  public fileElements: Observable<FileElement[]>;
  modalReference: NgbModalRef;
  repoId: string;

  @ViewChild ('fileExplorerModal') fileExplorerModal: FileExplorerModalComponent;

  constructor(private modalService: NgbModal, public fileService: ProjectService) {}

  ngOnInit() {
    this.repoId = localStorage.getItem('id'); // set before updateFileElementQuery
    this.updateFileElementQuery();
    this.fileElements.subscribe((_)=>{})
  }

  openFileExplorerModal() {
    this.modalReference = this.modalService.open(this.fileExplorerModal)
    return this.modalReference.result.catch((reason)=> console.log('UploadFileModal dismissed: ', reason))
  }

  updateFileElementQuery() {
    this.fileElements = this.fileService.queryFiles(this.repoId);
  }

  selectUploadFile(event: any) {
    console.log(event.target.files[0])
    const file = event.target.files[0];
    file.arrayBuffer().then(arrayBuffer => {
      this.fileService.uploadFile(this.repoId, arrayBuffer, file.name)
        .subscribe(() => {
          this.updateFileElementQuery();
          this.selected(null,{filename: file.name})
        });
    });
  }

  selectedFile: FileElement
  selected(event: MouseEvent, element: FileElement) {
    this.selectedFile = element;
  }

  delete(event: MouseEvent) {
    this.fileService.deleteUploadedFile(this.selectedFile._id);
    this.updateFileElementQuery();
  }

  submit(event: MouseEvent) {
    this.modalReference.close(this.selectedFile);
  }
}
