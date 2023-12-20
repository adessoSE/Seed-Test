import { Component, OnInit, Inject } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { RepositoryContainer } from "../../model/RepositoryContainer";
import { ManagementService } from "../../Services/management.service";
import { ApiService } from "../../Services/api.service";
//import AdmZip from "adm-zip";

@Component({
  selector: "app-import-modal",
  templateUrl: "./import-modal.component.html",
  styleUrls: ["./import-modal.component.css"],
})
export class ImportModalComponent implements OnInit {
  isNewProject: boolean = false; // default value, overwritten by user toggle
  projectName: string = "";
  searchTerm: string = "";
  inputData: any;
  importingRepoId: string;
  repoList: RepositoryContainer[];
  errorMessage: string;
  file: File;
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private ref: MatDialogRef<ImportModalComponent>,
    private apiService: ApiService,
    private managmentService: ManagementService
  ) {
    this.repoList = data.repoList;
  }

  ngOnInit(): void {
    this.inputData = this.data;
  }

  importTestCases(file) {
    if (this.isNewProject && !this.projectName) {
      this.errorMessage = "Please enter a project name.";
      return;
    }
    this.managmentService
      .importProject(file, this.importingRepoId, this.projectName)
      .subscribe((ret) => {
        console.log(ret);
      });
  }

  handleFileInput(event: any) {
    const file = event.target.files[0];
    const maxSizeInBytes = 10485760; // 10 MB (10 * 1024 * 1024 Bytes)

    if (file) {
      // Überprüfen Sie die Dateigröße
      if (file.size > maxSizeInBytes) {
        this.errorMessage =
          "The file is too large. Please select a smaller file.";
      } else if (!this.isValidFileFormat(file)) {
        this.errorMessage =
          "Invalid file format. Please select a valid .zip file.";
      } else {
        // Dateiformat und Größe sind gültig, setzen Sie die Fehlermeldung auf null (kein Fehler)
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

  filterRepositories(searchTerm: string) {
    if (!searchTerm) {
      return this.repoList;
    }
    return this.repoList.filter((repo) =>
      repo.value.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  onSlideToggleChange() {
    //Zurücksetzung der Eingaben bei Projekttoggle
    if (this.isNewProject) {
      this.searchTerm = "";
      this.importingRepoId = "";
    } else {
      this.projectName = "";
    }
  }

  onProjectChange() {
    console.log("Import - RepoID: ", this.importingRepoId);
    console.log("Import - File name: ", this.file.name);
    console.log("Import - File type: ", this.file.type);
    console.log("Import - File size: ", this.file.size, " bytes");
    console.log(this.projectName);
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
