import { Directive, TemplateRef } from '@angular/core';

/**
 * Directive of table cell if it is only viewable for the example table
 */
@Directive({
  selector: '[viewMode]'
})
export class ViewModeDirective {

  /**
   * Constructor
   * @param tpl 
   */
  constructor(public tpl: TemplateRef<any>) { }

}