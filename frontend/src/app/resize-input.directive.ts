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
      this.maxWidth = this.el.nativeElement.parentElement.parentElement.parentElement.parentElement.offsetWidth;
      this.resize('setup'); 
    }, 500); 
  }

  private resize(mode_type: string) {
    //Set variables
    let string_coef = 4;
    let string_length = this.el.nativeElement.value.length+string_coef;
    let parentWidth = this.el.nativeElement.parentElement.parentElement.parentElement.offsetWidth;
    let input_width = this.el.nativeElement.offsetWidth;
    let coef = 10;
    
    //Check if maxWidth exceeded 
    if((parentWidth - input_width + string_length*coef) < this.maxWidth) {
      if (string_length == 0 ){
        this.el.nativeElement.setAttribute('size', this.minWidth);
      } else {
        this.el.nativeElement.setAttribute('size', string_length);
      }
    }  
    else {
      let gap = (this.maxWidth - parentWidth);
      if (gap > 0){

        if (mode_type == 'keyup') {
          this.el.nativeElement.setAttribute('size', this.el.nativeElement.getAttribute('size'));
        } 
        if (mode_type == 'setup') {
          let width = (input_width + gap)/coef;
          this.el.nativeElement.setAttribute('size', width);
        } 
      }
      else {
        this.el.nativeElement.setAttribute('size', this.minWidth);
      }
    }
  }

}
