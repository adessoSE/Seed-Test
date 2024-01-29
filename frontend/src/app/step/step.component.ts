import { Component, Input } from '@angular/core';
import { StepType } from '../model/StepType';
import { HighlightInputService } from '../Services/highlight-input.service';

@Component({
  selector: 'app-step',
  templateUrl: './step.component.html',
  styleUrls: ['./step.component.css']
})
export class StepComponent {

  @Input() stepData: StepType
  @Input() index: Number

  constructor(public highlightInputService: HighlightInputService){}

  handleClick($event){
    this.stepData.checked = !this.stepData.checked
  }

}
