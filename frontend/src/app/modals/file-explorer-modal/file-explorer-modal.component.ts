import { Component, ViewChild } from '@angular/core';
import { Observable } from 'rxjs';
import { FileElement } from '../../model/FileElement';
import { ProjectService } from '../../Services/project.service';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-file-explorer-modal',
  templateUrl: './file-explorer-modal.component.html',
  styleUrls: ['./file-explorer-modal.component.css']
})
export class FileExplorerModalComponent {
  public fileElements: Observable<FileElement[]>;
  modalReference: NgbModalRef; 

  @ViewChild ('fileExplorerModal') fileExplorerModal: FileExplorerModalComponent;

  constructor(private modalService: NgbModal, public fileService: ProjectService) {}

  ngOnInit() {
    this.updateFileElementQuery();
  }

  openFileExplorerModal() {
    this.modalReference = this.modalService.open(this.fileExplorerModal, {ariaLabelledBy: 'modal-basic-title'});
  }

  addFile(file: { name: string }) {
    //this.fileService.add({name: file.name});
    this.updateFileElementQuery();
  }

  removeElement(element: FileElement) {
    this.fileService.deleteUploadedFile(element.id);
    this.updateFileElementQuery();
  }

  renameElement(element: FileElement) {
    //this.fileService.update(element.id, { name: element.name });
    this.updateFileElementQuery();
  }

  updateFileElementQuery() {
    this.fileElements = this.fileService.queryFiles("65818299961b8100320fccfe");
  }
}
