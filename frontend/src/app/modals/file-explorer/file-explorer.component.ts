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

  selectedFile: FileElement

  @Output() folderAdded = new EventEmitter<{ name: string }>();
  @Output() elementRemoved = new EventEmitter<FileElement>();
  @Output() elementRenamed = new EventEmitter<FileElement>();
  @Output() elementMoved = new EventEmitter<{ element: FileElement; moveTo: FileElement }>();
  @Output() selected = new EventEmitter<FileElement>();

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
    this.selectedFile = element;
    this.selected.emit(element);
    console.log('selected: ', element)
  }
}
