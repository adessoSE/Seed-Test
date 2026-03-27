import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class StepValidationService {

  private warningTimeout: any;
  
  constructor(private toastr: ToastrService) {}

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
        this.showValidationWarning(validation.message);
      });
    } else {
      element.classList.remove('quote-warning');
    }
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
    
    if (unescapedQuotes && unescapedQuotes.length > 0) {
      return {
        hasIssues: true,
        message: `${unescapedQuotes.length} unescaped single quotes detected. Use \\' instead of ' in step definitions.`
      };
    }
    
    return { hasIssues: false };
  }

  /**
   * Show validation warning
   * @param message - Warning message
   */
  showValidationWarning(message: string): void {
    this.toastr.warning(
      message,
      'Step Definition Warning',
      {
        timeOut: 5000,
        progressBar: true,
        positionClass: 'toast-top-right'
      }
    );
  }
}
