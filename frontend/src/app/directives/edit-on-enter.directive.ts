import { Directive, HostListener } from '@angular/core';
import { EditableComponent } from '../editable/editable.component';

@Directive({
  selector: '[editableOnEnter]'
})

/**
 * Directive to activate change the editable field for the example table
 */
export class EditableOnEnterDirective {
  /**
   * @ignore
   */
  constructor(private editable: EditableComponent) {}

  /**
   * Enters the view mode
   */
  @HostListener('keyup.enter')
  onEnter() {
    this.editable.toViewMode();
  }

}
