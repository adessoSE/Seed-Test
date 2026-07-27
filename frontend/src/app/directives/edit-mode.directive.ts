import { Directive, TemplateRef, inject } from '@angular/core';

/**
 * Directive to activate Edit Mode for the example table
 */

@Directive({ selector: '[editMode]' })

export class EditModeDirective {	tpl = inject<TemplateRef<any>>(TemplateRef);

}
