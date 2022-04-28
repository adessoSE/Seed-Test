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

  @HostBinding() class?;

  @HostListener('input', ['$event']) onInput() {
    this.resize('input', this.class);
  }

  constructor(private el: ElementRef) {  
    setTimeout(() => {
      el.nativeElement.classList.forEach((value) => {
        if (value == 'scenario' || value == 'background') {
          this.class = value;
        }
      });

      if (this.class === 'background') {
        this.maxWidth = this.el.nativeElement.parentElement.parentElement.parentElement.offsetWidth;
      }
      else {
        this.maxWidth = this.el.nativeElement.parentElement.parentElement.parentElement.parentElement.offsetWidth;
      }
      
      this.resize('setup', this.class); 
    }, 1); 
  }

  private resize(mode_type: string, class_name: string) {
    //Set variables
    let parentWidth;
    if (class_name === 'scenario') {
      parentWidth = this.el.nativeElement.parentElement.parentElement.parentElement.offsetWidth;
    }
    if (class_name === 'background') {
      parentWidth = this.el.nativeElement.parentElement.parentElement.offsetWidth;
    }
    let string_coef = 4;
    let string_length = this.el.nativeElement.value.length+string_coef;
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

        if (mode_type == 'input') {
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
