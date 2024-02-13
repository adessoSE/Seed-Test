import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { FileElement } from '../../model/FileElement';
import { ProjectService } from '../../Services/project.service';

@Component({
  selector: 'app-file-explorer-modal',
  templateUrl: './file-explorer-modal.component.html',
  styleUrls: ['./file-explorer-modal.component.css']
})
export class FileExplorerModalComponent {
  public fileElements: Observable<FileElement[]>;

  constructor(public fileService: ProjectService) {}

  currentRoot: FileElement;
  currentPath: string;
  canNavigateUp = false;

  ngOnInit() {
    this.updateFileElementQuery();
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
    this.fileElements = this.fileService.queryFiles(null);
  }
}
