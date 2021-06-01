import { Directive, HostListener } from '@angular/core';
import { EditableComponent } from '../editable/editable.component';

@Directive({
  selector: '[editableOnEnter]'
})

/**
 * Directive to activate change the editable field for the example table
 */
export class EditableOnEnterDirective {
  constructor(private editable: EditableComponent) {
  }

  @HostListener('keyup.enter')
  onEnter() {
    this.editable.toViewMode();
  }

}
