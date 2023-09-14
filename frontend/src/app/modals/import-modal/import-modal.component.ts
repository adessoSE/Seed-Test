import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { RepositoryContainer } from '../../model/RepositoryContainer';

@Component({
  selector: 'app-import-modal',
  templateUrl: './import-modal.component.html',
  styleUrls: ['./import-modal.component.css']
})
export class ImportModalComponent implements OnInit {
  isNewProject: boolean = false; // default value, overwritten by user toggle
  projectName: string = '';
  searchTerm: string = '';
  inputData: any;
  importingRepoId: string;
  repoList: RepositoryContainer[];
  constructor(@Inject(MAT_DIALOG_DATA) public data: any, private ref:MatDialogRef<ImportModalComponent>) { 
    this.repoList = data.repoList;
  }
  
  ngOnInit(): void {
    this.inputData = this.data;
  }

  

  importTestCases(){

  }

  handleFileInput(event: any){
    const file = event.target.files[0];
    if (file) {
      console.log('Import - RepoID: ', this.importingRepoId)
      console.log('Import - File name: ', file.name);
      console.log('Import - File type: ', file.type);
      console.log('Import - File size: ', file.size, ' bytes');
      console.log(this.projectName);
    }
  }

  filterRepositories(searchTerm: string) {
    if (!searchTerm) {
        return this.repoList;
    }
    return this.repoList.filter(repo => repo.value.toLowerCase().includes(searchTerm.toLowerCase()));
}

}
