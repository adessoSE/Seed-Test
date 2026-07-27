import { TestBed } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NotificationService } from './notification.service';

import { StepValidationService } from './step-validation.service';

describe('StepValidationService', () => {
	let service: StepValidationService;
	let toastr: NotificationService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [MatSnackBarModule]
		});
		service = TestBed.inject(StepValidationService);
		toastr = TestBed.inject(NotificationService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	describe('validateQuotes', () => {
		it('should return no issues for text without single quotes', () => {
			const result = service.validateQuotes('Click on the button');
			expect(result.hasIssues).toBe(false);
			expect(result.message).toBeUndefined();
		});

		it('should detect unescaped single quotes', () => {
			const result = service.validateQuotes("Click on the 'button'");
			expect(result.hasIssues).toBe(true);
			expect(result.message).toContain('unescaped single quotes');
		});

		it('should return no issues for escaped single quotes', () => {
			const result = service.validateQuotes("Click on the \\'button\\'");
			expect(result.hasIssues).toBe(false);
		});

		it('should count the number of unescaped single quotes', () => {
			const result = service.validateQuotes("It's a 'test'");
			expect(result.hasIssues).toBe(true);
			// 3 unescaped quotes: It's, 'test', test'
			expect(result.message).toContain('3');
		});

		it('should return no issues for empty string', () => {
			const result = service.validateQuotes('');
			expect(result.hasIssues).toBe(false);
		});
	});

	describe('showValidationWarning', () => {
		it('should call notify.warning with the given message', () => {
			const spy = vi.spyOn(toastr, 'warning');
			service.showValidationWarning('Test warning');
			expect(spy).toHaveBeenCalledWith(
				'Test warning',
				'Step Definition Warning',
				expect.objectContaining({
					timeOut: 5000
				})
			);
		});
	});

	describe('validateAndShowQuoteWarning', () => {
		it('should add quote-warning class when text has issues', () => {
			const element = document.createElement('input');
			service.validateAndShowQuoteWarning("It's broken", element);
			expect(element.classList.contains('quote-warning')).toBe(true);
		});

		it('should remove quote-warning class when text has no issues', () => {
			const element = document.createElement('input');
			// Pre-add the class to verify it gets removed
			element.classList.add('quote-warning');
			service.validateAndShowQuoteWarning('No issues here', element);
			expect(element.classList.contains('quote-warning')).toBe(false);
		});
	});
});
