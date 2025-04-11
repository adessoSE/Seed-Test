import { Directive, TemplateRef } from '@angular/core';

/**
 * Directive to activate Edit Mode for the example table
 */

@Directive({
    selector: '[editMode]',
    standalone: false
})

export class EditModeDirective {
  /**
   * @ignore
   */
  constructor(public tpl: TemplateRef<any>) { }
}
