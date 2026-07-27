import { Directive, ElementRef, HostBinding, HostListener, inject, input } from '@angular/core';

@Directive({ selector: '[appResizeInput]' })
export class ResizeInputDirective {
	private el = inject(ElementRef);


	/**
    * Width of input in chars
    */
	minWidth = 10;

	readonly containerEl = input.required<HTMLElement>();

	readonly parentEl = input.required<HTMLElement>();

	maxWidth!: number;

	@HostBinding() class?: any;

	@HostListener('change') onChange() {
		this.resize();
	}

	@HostListener('input') onInput() {
		this.resize();
	}
 

	constructor() {
		const el = this.el;
  
		setTimeout(() => {
      
			el.nativeElement.classList.forEach((value: any) => {
				if (value === 'scenario' || value === 'background' || value === 'block-editor') 
					this.class = value;
        
			});

			if (this.class === 'scenario' || this.class === 'background' || this.class === 'block-editor') 
				this.maxWidth = this.containerEl().offsetWidth;
        
			this.resize('load'); 
		}, 1); 
	}
  
	/**
   * Resize input filed in backgroung or scenario on input string length
   * @param mode_type 
   */
	private resize(mode_type?: string) {
		//Set variables
		const parentWidth = this.setParentWidth()!;
		const string_coef = 4;
		const string_length = this.el.nativeElement.value.length + string_coef;
		const input_width = this.el.nativeElement.offsetWidth;
		const coef = 10;
		const gap = (this.maxWidth - parentWidth);
    

		//Check if maxWidth exceeded 
		if ((parentWidth - input_width + string_length * coef) <= this.maxWidth) 
			if (string_length <= 10 )
				this.el.nativeElement.setAttribute('size', this.minWidth);
			else 
				this.el.nativeElement.setAttribute('size', string_length - string_coef);
      
     
		else 
			if (mode_type == 'load') {
				const width = (input_width + gap) / coef;
				this.el.nativeElement.setAttribute('size', width);
			}
     
	}

	/**
   * Set parent width depending on class name
   * @returns 
   */
	private setParentWidth() {
		if (this.class === 'scenario' || this.class === 'background' || this.class === 'block-editor') 
			return this.parentEl().offsetWidth;
    
	}

}
