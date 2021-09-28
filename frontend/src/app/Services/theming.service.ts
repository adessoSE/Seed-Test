import { DOCUMENT } from '@angular/common';
import { parseI18nMeta } from '@angular/compiler/src/render3/view/i18n/meta';
import { Injectable, EventEmitter, Output, Renderer2, Inject, RendererFactory2} from '@angular/core';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemingService {

  currentTheme : string;

  @Output () public themeChanged = new EventEmitter();

  private renderer: Renderer2;

  constructor(@Inject(DOCUMENT) private document: Document,
  rendererFactory: RendererFactory2) { 
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  loadTheme () {
    if (localStorage.getItem('user-theme')) {
      this.currentTheme = localStorage.getItem('user-theme');
    } else {
      this.currentTheme;
    }
    this.renderTemplate(this.currentTheme);
  }

  getCurrentTheme () {
    return of(this.currentTheme)
  }

 /*  setNewTheme () {
    if(this.currentTheme === 'darkTheme') {
      this.currentTheme = '';
    } else {
      this.currentTheme = 'darkTheme';
    }
    this.renderTemplate(this.currentTheme);
    localStorage.setItem('user-theme', this.currentTheme);
    this.themeChanged.emit(this.currentTheme);
  } */

  setNewTheme (isDark:boolean) {
    if(isDark) {
      this.currentTheme = 'darkTheme';
    } else {
      this.currentTheme = '';
    }
    this.renderTemplate(this.currentTheme);
    localStorage.setItem('user-theme', this.currentTheme);
    this.themeChanged.emit(this.currentTheme);
  }

  isDarkMode() {
    return this.currentTheme === 'darkTheme';
  }

  renderTemplate (theme : string) {
    if (theme === 'darkTheme') {
      this.renderer.addClass(this.document.body, theme);
    } else {
      this.renderer.removeClass(this.document.body, 'darkTheme');
    }
    
  }

}
