import { Directive, ElementRef, HostBinding, HostListener} from '@angular/core';

@Directive({
  selector: '[appResizeInput]'
})
export class ResizeInputDirective {

  /**
    * Width of input in chars
    */
  minWidth = 10;

  @HostBinding() maxWidth!: number;

  @HostListener('keyup') onKeyUp() {
    this.resize('keyup');
  }
  


  constructor(private el: ElementRef) { 

    setTimeout(() => {
      this.resize('setup');
      /* this.maxWidth = (this.el.nativeElement.parentElement.parentElement.parentElement.parentElement.offsetWidth - this.el.nativeElement.parentElement.parentElement.parentElement.offsetWidth)/7;
      let string_length = this.el.nativeElement.value.length;
 
      if(this.maxWidth > 0) {
        if (string_length < this.maxWidth) {
          if (string_length == 0 ){
            this.el.nativeElement.setAttribute('size', this.minWidth);
          } else {
            this.el.nativeElement.setAttribute('size', string_length);
          }
        }
        else {
          this.el.nativeElement.setAttribute('size', this.maxWidth);
        } 
      }
      else {
        if (string_length == 0 ){
          let width = this.minWidth + this.maxWidth;
          this.el.nativeElement.setAttribute('size', width);
        }
        else {
          let width = string_length + this.maxWidth;
          this.el.nativeElement.setAttribute('size', width);
        }
      } */ 
    }, 500); 
  }

  private resize(mode_type: String) {
    this.maxWidth = (this.el.nativeElement.parentElement.parentElement.parentElement.parentElement.offsetWidth - this.el.nativeElement.parentElement.parentElement.parentElement.offsetWidth)/7;
    let string_length = this.el.nativeElement.value.length;

    if(this.maxWidth > 0) {
      if (string_length < this.maxWidth) {
        if (string_length == 0 ){
          this.el.nativeElement.setAttribute('size', this.minWidth);
        } else {
          this.el.nativeElement.setAttribute('size', string_length);
        }
      }
      else {
        if (mode_type == 'keyup') {
          this.el.nativeElement.setAttribute('size', this.el.nativeElement.getAttribute('size'));
        }
        if (mode_type == 'setup') {
          this.el.nativeElement.setAttribute('size', this.maxWidth);
        }  
      }
    }
    else {
      if (string_length == 0 ){
        let width = this.minWidth + this.maxWidth;
        this.el.nativeElement.setAttribute('size', width);
      }
      else {
        let width = string_length + this.maxWidth;
        this.el.nativeElement.setAttribute('size', width);
      }
    }
  }

}
