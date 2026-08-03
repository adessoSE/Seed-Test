import { Directive, TemplateRef, inject } from '@angular/core';

/**
 * Directive to activate Edit Mode for the example table
 */

@Directive({ selector: '[appEditMode]' })

export class EditModeDirective {	tpl = inject<TemplateRef<unknown>>(TemplateRef);

}
