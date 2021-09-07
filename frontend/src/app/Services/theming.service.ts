import { parseI18nMeta } from '@angular/compiler/src/render3/view/i18n/meta';
import { Injectable, EventEmitter, Output} from '@angular/core';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemingService {

  currentTheme: string;

  @Output () public themeChanged = new EventEmitter();

  constructor() { }


  updateTheme () {
    if (localStorage.getItem('user-theme')) {
      this.currentTheme = localStorage.getItem('user-theme');
    } else {
      return this.currentTheme = 'light'
    }
  }

  getCurrentTheme () {
    return of(this.currentTheme)
  }

  setNewTheme () {
    if(this.currentTheme === 'light') {
      this.currentTheme = 'dark';
      localStorage.setItem('user-theme', 'dark');
    } else if (this.currentTheme === 'dark'){
      this.currentTheme = 'light';
      localStorage.setItem('user-theme', 'light');
    this.themeChanged.emit(this.currentTheme);
    }
  }

  isDarkMode() {
    return this.currentTheme === 'dark';
  }

}
