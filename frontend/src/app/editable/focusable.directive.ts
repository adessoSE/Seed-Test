import { Directive, ElementRef, AfterViewInit } from '@angular/core';

/**
 * Directive for an table cell to be focusable
 */
@Directive({
  selector: '[focusable]'
})
export class FocusableDirective implements AfterViewInit {

  /**
   * Constructor
   * @param host 
   */
  constructor(private host: ElementRef) { }

  ngAfterViewInit() {
    this.host.nativeElement.focus();
  }

}
