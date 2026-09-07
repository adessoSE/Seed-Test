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
		// Fake timers for this block: validateAndShowQuoteWarning schedules a real 1000ms
		// debounce that, if left pending, fires AFTER TestBed teardown destroys the injector
		// and MatSnackBar.open on the destroyed injector throws NG0205 as an unhandled error.
		// fakeAsync() is unavailable here (zoneless app — zone.js/testing not loaded).
		beforeEach(() => {
			vi.useFakeTimers();
		});

		// Cancel any debounce still pending so no timer leaks past this block.
		afterEach(() => {
			vi.clearAllTimers();
			vi.useRealTimers();
		});

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

		it('should open the SnackBar after the debounce fires', () => {
			const notify = TestBed.inject(NotificationService);
			const warningSpy = vi.spyOn(notify, 'warning').mockImplementation(() => {});
			const element = document.createElement('input');

			service.validateAndShowQuoteWarning("It's broken", element);

			// Advance past the 1000ms debounce so the SnackBar opens inside the test,
			// rather than leaking past teardown and hitting the destroyed injector.
			vi.advanceTimersByTime(1000);

			expect(warningSpy).toHaveBeenCalled();
		});
	});
});
