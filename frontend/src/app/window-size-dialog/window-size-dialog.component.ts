import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface DialogData {
  width: number;
  height: number;
}

@Component({
  selector: 'app-window-size-dialog',
  templateUrl: './window-size-dialog.component.html',
  styleUrls: ['./window-size-dialog.component.css']
})
export class WindowSizeDialogComponent {
  data: DialogData = { width: 0, height: 0 };

  constructor(
    public dialogRef: MatDialogRef<WindowSizeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public injectedData: DialogData
  ) {
    if (injectedData) {
      this.data.width = injectedData.width;
      this.data.height = injectedData.height;
    }
  }

  onNoClick(): void {
    this.dialogRef.close();
  }
}
