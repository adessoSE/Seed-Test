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

  @ViewChild ('fileExplorerModal') fileExplorerModal: FileExplorerModalComponent;

  constructor(private modalService: NgbModal, public fileService: ProjectService) {}

  ngOnInit() {
    this.updateFileElementQuery();
    this.fileElements.subscribe((hi)=>{console.log('hallo ' +hi)})
  }

  openFileExplorerModal() {
    this.modalReference = this.modalService.open(this.fileExplorerModal)
    return this.modalReference.result
  }

  addFile(file: { name: string }) {
    //this.fileService.add({name: file.name});
    this.updateFileElementQuery();
  }

  removeElement(element: FileElement) {
    this.fileService.deleteUploadedFile(element._id);
    this.updateFileElementQuery();
  }

  renameElement(element: FileElement) {
    //this.fileService.update(element.id, { name: element.name });
    this.updateFileElementQuery();
  }

  updateFileElementQuery() {
    this.fileElements = this.fileService.queryFiles("65818299961b8100320fccfe");
  }

  selectUploadFile(event: any) {
    console.log(event.target.files[0])
    const file = event.target.files[0];
    file.arrayBuffer().then(arrayBuffer => {
      this.fileService.uploadFile("65818299961b8100320fccfe", arrayBuffer, file.name)
        .subscribe(() => {
          this.updateFileElementQuery();
          this.selected({filename: file.name})
        });
    });
  }

  selectedFile: FileElement
  selected(element: FileElement) {
    this.selectedFile = element;
  }

  submit(event: MouseEvent) {
    this.modalReference.close(this.selectedFile);
  }
}
