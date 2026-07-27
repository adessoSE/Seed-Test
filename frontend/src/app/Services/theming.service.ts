
import { Injectable, Renderer2, RendererFactory2, DOCUMENT, inject, EventEmitter } from '@angular/core';
import { of } from 'rxjs';

@Injectable({
	providedIn: 'root'
})
export class ThemingService {
	private document = inject<Document>(DOCUMENT);


	currentTheme!: string;

	// EventEmitter used as observable in services — not a component output
	public readonly themeChanged = new EventEmitter<string>();

	private renderer: Renderer2;

	constructor() {
		const rendererFactory = inject(RendererFactory2);
 
		this.renderer = rendererFactory.createRenderer(null, null);
	}

	loadTheme () {
		if (localStorage.getItem('user-theme')) 
			this.currentTheme = localStorage.getItem('user-theme')!;
    
		this.renderTemplate(this.currentTheme);
	}

	getCurrentTheme () {
		return of(this.currentTheme);
	}

	setNewTheme (isDark:boolean) {
		if (isDark) 
			this.currentTheme = 'darkTheme';
		else 
			this.currentTheme = '';
    
		this.renderTemplate(this.currentTheme);
		localStorage.setItem('user-theme', this.currentTheme);
		this.themeChanged.emit(this.currentTheme);
	}

	isDarkMode() {
		return this.currentTheme === 'darkTheme';
	}

	renderTemplate (theme : string) {
		if (theme === 'darkTheme') 
			this.renderer.addClass(this.document.body, theme);
		else 
			this.renderer.removeClass(this.document.body, 'darkTheme');
    
    
	}

}
