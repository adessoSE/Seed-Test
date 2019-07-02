import { Directive, ElementRef } from '@angular/core';

@Directive({
  selector: '[focusable]'
})
export class FocusableDirective {

  constructor(private host: ElementRef) { }

  ngAfterViewInit() {
    this.host.nativeElement.focus();
  }

}
