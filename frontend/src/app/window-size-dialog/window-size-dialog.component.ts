import { Component, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface DialogData {
  width: number;
  height: number;
}

@Component({
  selector: 'app-window-size-dialog',
  template: `
    <h1 mat-dialog-title>Set Window Size</h1>
    <div mat-dialog-content>
      <mat-form-field>
        <mat-label>Width</mat-label>
        <input matInput [(ngModel)]="data.width">
      </mat-form-field>
      <mat-form-field>
        <mat-label>Height</mat-label>
        <input matInput [(ngModel)]="data.height">
      </mat-form-field>
    </div>
    <div mat-dialog-actions>
      <button mat-button (click)="onNoClick()">Cancel</button>
      <button mat-button [mat-dialog-close]="data" cdkFocusInitial>Ok</button>
    </div>
  `
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
