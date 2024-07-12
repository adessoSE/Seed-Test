import { AfterViewChecked, AfterViewInit, Component, ContentChild, ElementRef, OnInit, Output, ViewChild, ViewChildren } from "@angular/core";
import { RepositoryContainer } from "../../model/RepositoryContainer";
import { ManagementService } from "../../Services/management.service";
import { ApiService } from "../../Services/api.service";
import { FormControl, NgForm, UntypedFormControl, UntypedFormGroup, Validators } from "@angular/forms";
import { NgbModal, NgbModalRef } from "@ng-bootstrap/ng-bootstrap";
import { Router } from "@angular/router";
import { Subscription } from "rxjs";
import { ProjectService } from "../../Services/project.service";
import { MatSelect } from "@angular/material/select";
//import AdmZip from "adm-zip";

@Component({
  selector: "app-import-modal",
  templateUrl: "./import-modal.component.html",
  styleUrls: ["./import-modal.component.css"],
})
export class ImportModalComponent implements AfterViewChecked {


  /**
 * Model Reference for open/closing
 */
  modalReference: NgbModalRef;

  isNewProject: boolean; // default value, overwritten by user toggle
  importMode: boolean; //default value (Renaming)
  projectName: string = "";
  searchTerm: string = "";

  importingRepoId: string;
  repoList: RepositoryContainer[];
  searchList: RepositoryContainer[] = [];


  errorMessage: string;
  file: File;

  @ViewChild('importProjectModal', { static: true }) importProjectModal: ImportModalComponent;

  toggleNewProject = new UntypedFormControl(false);
  toggleImportMode = new UntypedFormControl(false);

  constructor(private apiService: ApiService,
    private modalService: NgbModal,
    private managmentService: ManagementService,
    public router: Router,
    public projectService: ProjectService) {
  }



  ngAfterViewChecked() {
    this.isNewProject = this.toggleNewProject.value;
    this.importMode = this.toggleImportMode.value;
  }
  /**
   * Opens the import projects modal
   */
  openImportProjectModal(repositories) {
    this.repoList = repositories;
    this.modalReference = this.modalService.open(this.importProjectModal, { ariaLabelledBy: 'modal-basic-titles' });
  }


  importTestCases(file, form: NgForm) {
    this.importingRepoId = form.value.selectedProject;
    this.managmentService
      .importProject(file, this.importingRepoId, this.projectName, this.importMode)
      .subscribe((ret) => {
        console.log(ret);
      });
  }

  handleFileInput(event: any) {
    const file = event.target.files[0];
    const maxSizeInBytes = 10485760;

    if (file) {
      if (file.size > maxSizeInBytes) {
        this.errorMessage =
          "The file is too large. Please select a smaller file.";
      } else if (!this.isValidFileFormat(file)) {
        this.errorMessage =
          "Invalid file format. Please select a valid .zip file.";
      } else {
        this.errorMessage = null;
        console.log("Import - RepoID: ", this.importingRepoId);
        console.log("Import - File name: ", file.name);
        console.log("Import - File type: ", file.type);
        console.log("Import - File size: ", file.size, " bytes");
        console.log(this.projectName);
        this.file = file;
      }
    }
  }

  onSlideToggleChange() {
    if (this.isNewProject) {
      delete this.projectName;
    }
  }

  onImportToggleChange() {
    console.log(this.importMode ? "We are in the renaming mode" : "We are in the overwriting mode");
  }

  searchRepos(form?: NgForm) {
    const matSelectElement = document.getElementById("projectDropDownSelect");

    if (matSelectElement && this.searchTerm) {
      matSelectElement.click();
    }

    const inputElement = document.querySelector('.searchInputProject') as HTMLInputElement;
    inputElement.focus();

    this.searchTerm = form.value.searchTerm.trim().toLowerCase();
    this.searchList = this.repoList.filter(repo => repo.value.toLowerCase().includes(this.searchTerm));

    return this.searchList;
  }

  onProjectChange(form: NgForm) {
    this.projectName = form.value.projectName;
    // console.log("Import - RepoID: ", this.importingRepoId);
    // console.log("Import - File name: ", this.file.name);
    // console.log("Import - File type: ", this.file.type);
    // console.log("Import - File size: ", this.file.size, " bytes");
  }

  isValidFileFormat(file: File): boolean {
    const validExtensions = ["zip"]; //Später vielleicht noch einzelne .json Files?
    const validMimeType = ["application/x-zip-compressed"]; //Andere MIME-Types möglich, der sollte aber reichen

    return (
      validExtensions.includes(this.getFileExtension(file.name)) &&
      validMimeType.includes(file.type)
    );
  }

  /* hasValidContent(file: File): boolean {
    const zip = new AdmZip(file);

    const zipEntries = zip.getEntries();

    // Schleife durch alle Dateien im ZIP-Archiv
    zipEntries.forEach((zipEntry) => {
      // Prüfen, ob die Datei den gewünschten Inhalt enthält
      const fileContent = zipEntry.getData().toString("utf8");

      const expectedKeywords = [""];
      console.log("Validating " + zipEntry.entryName);
      if (zipEntry.entryName === "keyStoryIds") {
        if (this.isValidAlphanumericArray(zipEntry)) {
          console.log("KeyStoryIds seem valid!");
        } else {
          console.log("Possibly malignant KeyStoryIds!");
          return false;
        }
      }

      if (expectedKeywords.some((keyword) => fileContent.includes(keyword))) {
        console.log(`The data ${zipEntry.entryName} seems valid.`);
      } else {
        console.log(
          `The uploaded data ${zipEntry.entryName} has the wrong semantics.`
        );
        return false;
      }
    });
    return true;
  }
 */
  getFileExtension(fileName: string): string {
    return fileName.split(".").pop();
  }

  //Für KeyStoryIds
  isValidAlphanumericArray(content: string): boolean {
    try {
      const parsedData = JSON.parse(content);

      // Überprüfen, ob es sich um ein Array handelt
      if (Array.isArray(parsedData)) {
        // Überprüfen, ob jedes Element im Array alphanumerisch ist
        const isAlphanumeric = parsedData.every((item) =>
          /^[a-zA-Z0-9]+$/.test(item)
        );

        return isAlphanumeric;
      }
    } catch (error) {
      console.log(error);
    }

    return false;
  }
}
