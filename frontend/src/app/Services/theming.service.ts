
import { EventEmitter, Injectable, Renderer2, RendererFactory2, DOCUMENT, inject, signal } from '@angular/core';

@Injectable({
	providedIn: 'root'
})
export class ThemingService {
	private document = inject<Document>(DOCUMENT);

	/** Reactive dark-mode state — replaces currentTheme + isDarkMode() */
	readonly isDark = signal(false);

	/** @deprecated EventEmitter bridge — subscribe to isDark() signal in Phase 2 */
	public themeChanged = new EventEmitter<boolean>();

	private renderer: Renderer2;

	constructor() {
		const rendererFactory = inject(RendererFactory2);

		this.renderer = rendererFactory.createRenderer(null, null);
	}

	/** Loads the persisted theme from localStorage and applies it */
	loadTheme () {
		const stored = localStorage.getItem('user-theme');
		if (stored === 'darkTheme') {
			this.isDark.set(true);
			this.themeChanged.emit(true);
		}
		this.renderTemplate(stored ?? '');
	}

	/**
	 * Toggles between dark and light theme
	 * @param dark whether dark mode should be enabled
	 */
	setNewTheme (dark: boolean) {
		this.isDark.set(dark);
		this.themeChanged.emit(dark);
		const theme = dark ? 'darkTheme' : '';
		this.renderTemplate(theme);
		localStorage.setItem('user-theme', theme);
	}

	/** @deprecated Use isDark() signal directly */
	isDarkMode() {
		return this.isDark();
	}

	private renderTemplate (theme : string) {
		if (theme === 'darkTheme')
			this.renderer.addClass(this.document.body, theme);
		else
			this.renderer.removeClass(this.document.body, 'darkTheme');
	}

}
