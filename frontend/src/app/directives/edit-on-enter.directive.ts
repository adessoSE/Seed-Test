import { Directive, HostListener, inject } from '@angular/core';
import { EditableComponent } from '../editable/editable.component';

@Directive({ selector: '[editableOnEnter]' })

/**
 * Directive to activate change the editable field for the example table
 */
export class EditableOnEnterDirective {
	private editable = inject(EditableComponent);


	/**
   * Enters the view mode
   */
	@HostListener('keyup.enter')
	onEnter() {
		this.editable.toViewMode();
	}

}
