import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatMenu, MatMenuTrigger } from '@angular/material/menu';

import { MatDialog } from '@angular/material/dialog';
import { FileElement } from '../../model/FileElement';
//import { NewFolderDialogComponent } from './modals/newFolderDialog/newFolderDialog.component';
//import { RenameDialogComponent } from './modals/renameDialog/renameDialog.component';

@Component({
  selector: 'app-file-explorer',
  templateUrl: './file-explorer.component.html',
  styleUrls: ['./file-explorer.component.css']
})
export class FileExplorerComponent {
  constructor(public dialog: MatDialog) {}

  @Input() fileElements: FileElement[];

  @Output() folderAdded = new EventEmitter<{ name: string }>();
  @Output() elementRemoved = new EventEmitter<FileElement>();
  @Output() elementRenamed = new EventEmitter<FileElement>();
  @Output() elementMoved = new EventEmitter<{ element: FileElement; moveTo: FileElement }>();
  @Output() fileSelectSubmit = new EventEmitter<FileElement>();
  @Output() uploadFile = new EventEmitter<any>();


  selectedElement: FileElement

  deleteElement(element: FileElement) {
    this.elementRemoved.emit(element);
  }


  openNewFolderDialog() {
    // let dialogRef = this.dialog.open(NewFolderDialogComponent);
    // dialogRef.afterClosed().subscribe(res => {
    //   if (res) {
    //     this.folderAdded.emit({ name: res });
    //   }
    // });
  }

  openRenameDialog(element: FileElement) {
    // let dialogRef = this.dialog.open(RenameDialogComponent);
    // dialogRef.afterClosed().subscribe(res => {
    //   if (res) {
    //     element.name = res;
    //     this.elementRenamed.emit(element);
    //   }
    // });
  }

  openMenu(event: MouseEvent, viewChild: MatMenuTrigger) {
    event.preventDefault();
    viewChild.openMenu();
  }

  selection(event: MouseEvent, element: FileElement) {
    this.selectedElement = element;
    console.log('selected: ', element)
  }

  selectUploadFile(event: any) {
    const selectedFile = event.target.files[0];
    console.log(selectedFile);
    this.uploadFile.emit(selectedFile)
  }
  submit() {
    this.fileSelectSubmit.emit(this.selectedElement)
  }
}
