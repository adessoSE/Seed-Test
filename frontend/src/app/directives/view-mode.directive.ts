import { Directive, TemplateRef, inject } from '@angular/core';

/**
 * Directive of table cell if it is only viewable for the example table
 */
@Directive({ selector: '[appViewMode]' })
export class ViewModeDirective {	tpl = inject<TemplateRef<unknown>>(TemplateRef);


}