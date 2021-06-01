import { Directive, TemplateRef } from '@angular/core';

/**
 * Directive to activate Edit Mode for the example table
 */

@Directive({
  selector: '[editMode]'
})

export class EditModeDirective {
  /**
   * Constructor
   * @param tpl
   */
  constructor(public tpl: TemplateRef<any>) { }
}
