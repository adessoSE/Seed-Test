import { Component, Input, ViewChild, ViewContainerRef, TemplateRef, AfterViewInit } from '@angular/core';
import { StepType } from '../model/StepType';
import { HighlightInputService } from '../Services/highlight-input.service';

@Component({
  selector: 'app-step',
  templateUrl: './step.component.html',
  styleUrls: ['./step.component.css']
})
export class StepComponent implements AfterViewInit {
  @ViewChild('stepContainer', { read: ViewContainerRef, static: true }) stepContainer: ViewContainerRef;
  // Templates to be used for rendering steps
  @ViewChild('stepContainerUpload', { read: TemplateRef }) templateOrange: TemplateRef<any>;
  @ViewChild('backgroundContainerEl', { read: TemplateRef }) templateDefault: TemplateRef<any>;
  @Input() stepData: StepType
  @Input() index: number

  constructor(public highlightInputService: HighlightInputService){}

  ngAfterViewInit() {
    // Set initial template
    this.setStepTemplate();
  }

  // Method to set the template based on the property type of the step
  setStepTemplate() {
    // Use different templates based on the property type
    switch (this.stepData.type) {
      case 'uploadFile':
        this.stepContainer.createEmbeddedView(this.templateOrange);
        break;
      default:
        this.stepContainer.createEmbeddedView(this.templateDefault);
        break;
    }
  }

  handleClick($event){
    this.stepData.checked = !this.stepData.checked
  }

}
