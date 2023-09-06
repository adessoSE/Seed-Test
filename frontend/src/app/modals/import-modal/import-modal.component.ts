import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-import-modal',
  templateUrl: './import-modal.component.html',
  styleUrls: ['./import-modal.component.css']
})
export class ImportModalComponent {

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) { }

  importTestCases(){

  }

  handleFileInput(event: any){
    const file = event.target.files[0];
    if (file) {
      console.log('File name: ', file.name);
      console.log('File type: ', file.type);
      console.log('File size: ', file.size, ' bytes');
    }
  }

}
