import { Directive, ElementRef, AfterViewInit } from '@angular/core';

/**
 * Directive for an table cell to be focusable
 */
@Directive({
  selector: '[focusable]'
})
export class FocusableDirective implements AfterViewInit {

  /**
   * @ignore
   */
  constructor(private host: ElementRef) { }

  /**
   * focues the native element
   */
  ngAfterViewInit() {
    this.host.nativeElement.focus();
  }

}
