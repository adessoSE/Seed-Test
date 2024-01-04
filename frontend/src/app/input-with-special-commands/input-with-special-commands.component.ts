import { Component } from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";

@Component({
  selector: "app-input-with-special-commands",
  templateUrl: "./input-with-special-commands.component.html",
  styleUrls: ["./input-with-special-commands.component.css"],
})
export class InputWithSpecialCommandsComponent {
  inputText: string = "";
  formattedText: any;

  constructor(private sanitizer: DomSanitizer) {}

  checkRegex() {
    const regex = /(\{Regex:)(.*?)(\})/g;
    let result = this.inputText;

    result = this.inputText.replace(
      regex,
      `<app-animated-tooltip [baseTitle]="Analysing Regex"><span class='regex-hover' style='color:gray' data-tooltip='Regex wird analysiert'>$1<span style='color:blue'>$2</span>$3</span></app-animated-tooltip>`
    );

    // Füge die Styles und das bearbeitete Ergebnis hinzu
    this.formattedText = this.sanitizer.bypassSecurityTrustHtml(result);
  }
}
