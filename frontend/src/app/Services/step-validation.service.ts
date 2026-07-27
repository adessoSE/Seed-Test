import { Injectable, OnDestroy, inject } from '@angular/core';
import { NotificationService } from './notification.service';

@Injectable({
	providedIn: 'root'
})
export class StepValidationService implements OnDestroy {
	private notify = inject(NotificationService);


	private warningTimeout: any;

	ngOnDestroy(): void {
		clearTimeout(this.warningTimeout);
	}

	/**
   * Validates quotes and handles visual feedback for HTML elements
   * @param text - Text to validate
   * @param element - HTML element for visual feedback
   */
	validateAndShowQuoteWarning(text: string, element: HTMLElement): void {
		const validation = this.validateQuotes(text);
    
		if (validation.hasIssues) {
			element.classList.add('quote-warning');
			this.debounceWarning(() => {
				this.showValidationWarning(validation.message!);
			});
		} else 
			element.classList.remove('quote-warning');
    
	}

	private debounceWarning(callback: () => void): void {
		clearTimeout(this.warningTimeout);
		this.warningTimeout = setTimeout(callback, 1000);
	}

	/**
   * Validates step input for unescaped single quotes
   * @param text - The step text to validate
   * @returns validation result with warning message
   */
	validateQuotes(text: string): { hasIssues: boolean, message?: string } {
		// Check for unescaped single quotes
		const unescapedQuotes = text.match(/(?<!(?<!\\)(?:\\\\)*\\)'/g);
    
		if (unescapedQuotes && unescapedQuotes.length > 0) 
			return {
				hasIssues: true,
				message: `${unescapedQuotes.length} unescaped single quotes detected. Use \\' instead of ' in step definitions.`
			};
    
    
		return { hasIssues: false };
	}

	/**
   * Show validation warning
   * @param message - Warning message
   */
	showValidationWarning(message: string): void {
		this.notify.warning(
			message,
			'Step Definition Warning',
			{ timeOut: 5000 }
		);
	}
}
