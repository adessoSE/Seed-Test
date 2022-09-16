import { Directive, ElementRef, HostBinding, HostListener, Input} from '@angular/core';

@Directive({
  selector: '[appResizeInput]'
})
export class ResizeInputDirective {

  /**
    * Width of input in chars
    */
  minWidth = 10;

  @Input() containerEl: HTMLElement;

  @Input() parentEl: HTMLElement;

  @HostBinding() maxWidth!: number;

  @HostBinding() class?;

  @HostListener('change', ['$event']) onChange() {
    this.resize('load');
  }

  @HostListener('input', ['$event']) onInput() {
    this.resize('action');
  }

 

  constructor(private el: ElementRef) {  
    setTimeout(() => {
      
      el.nativeElement.classList.forEach((value) => {
        if (value == 'scenario' || value == 'background') {
          this.class = value;
        }
      });

      if (this.class === 'background' || this.class === 'scenario') {
        this.maxWidth = this.containerEl.offsetWidth;
      }  
      this.resize('load'); 
    }, 1); 
  }
  
  /**
   * Resize input filed in backgroung or scenario on input string length
   * @param mode_type 
   */
  private resize(mode_type: string) {
    //Set variables
    let parentWidth = this.setParentWidth();
    
    let string_coef = 6;
    let string_length = this.el.nativeElement.value.length;
    let input_width = this.el.nativeElement.offsetWidth;
    let coef = 10;
    
    //Check if maxWidth exceeded 
    if((parentWidth - input_width + string_length*coef) < this.maxWidth) {
      if (string_length <= 10 ){
        this.el.nativeElement.setAttribute('size', this.minWidth);
      } else {
        this.el.nativeElement.setAttribute('size', string_length-string_coef);
      }
    }  
    else {
      let gap = (this.maxWidth - parentWidth);
      if (gap >= 0){
        if (mode_type == 'action') {
          this.el.nativeElement.setAttribute('size', this.el.nativeElement.getAttribute('size'));
        } 
        if (mode_type == 'load') {
          let width = (input_width + gap)/coef;
          this.el.nativeElement.setAttribute('size', width);
        } 
      }
      else {
        if (mode_type == 'action') {
          this.el.nativeElement.setAttribute('size', this.el.nativeElement.getAttribute('size')+gap);
        } 
        if (mode_type == 'load') {
          let width = (input_width - gap)/coef;
          this.el.nativeElement.setAttribute('size', width);
        } 
      }
    }
  }

  /**
   * Set parent width depending on class name
   * @returns 
   */
  private setParentWidth() {
    if (this.class === 'background' || this.class === 'scenario') {
      return this.parentEl.offsetWidth;
    }
  }

}
