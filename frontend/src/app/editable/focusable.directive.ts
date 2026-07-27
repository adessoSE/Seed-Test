import { Directive, ElementRef, AfterViewInit, inject } from '@angular/core';

/**
 * Directive for an table cell to be focusable
 */
@Directive({ selector: '[focusable]' })
export class FocusableDirective implements AfterViewInit {
	private host = inject(ElementRef);


	/**
   * focues the native element
   */
	ngAfterViewInit() {
		this.host.nativeElement.focus();
	}

}
