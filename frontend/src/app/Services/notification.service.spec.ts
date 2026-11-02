import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
	let service: NotificationService;
	let snackBar: { open: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		snackBar = { open: vi.fn() };
		TestBed.configureTestingModule({
			providers: [{ provide: MatSnackBar, useValue: snackBar }]
		});
		service = TestBed.inject(NotificationService);
	});

	describe('show message composition', () => {
		it('joins title and message with a colon when both are present', () => {
			service.success('Story saved', 'Done');

			expect(snackBar.open.mock.calls[0][0]).toBe('Done: Story saved');
		});

		// Regression: 16 call sites pass '' as message, which produced a trailing
		// colon ("Scenario deleted: ") in the toast.
		it('omits the separator when the message is empty', () => {
			service.success('', 'Scenario deleted');

			expect(snackBar.open.mock.calls[0][0]).toBe('Scenario deleted');
		});

		it('shows only the message when no title is given', () => {
			service.error('Could not load stories');

			expect(snackBar.open.mock.calls[0][0]).toBe('Could not load stories');
		});
	});

	describe('duplicate suppression', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		// Regression: editors are re-created per selection, so a backend outage showed one identical
		// error toast per click. Identical error/warning toasts within 5 s are collapsed into the first one.
		it('suppresses an identical error shown within 5 seconds', () => {
			service.error('Could not load stories', 'Load failed');
			service.error('Could not load stories', 'Load failed');

			expect(snackBar.open).toHaveBeenCalledTimes(1);
		});

		it('shows the identical error again after 5 seconds', () => {
			service.error('Could not load stories');
			vi.advanceTimersByTime(5000);
			service.error('Could not load stories');

			expect(snackBar.open).toHaveBeenCalledTimes(2);
		});

		it('shows different messages back to back', () => {
			service.error('Could not load stories');
			service.error('Could not load scenarios');

			expect(snackBar.open).toHaveBeenCalledTimes(2);
		});

		// Success toasts confirm user actions, so repeating one is expected to show twice
		it('shows an identical success toast every time', () => {
			service.success('Story saved', 'Done');
			service.success('Story saved', 'Done');

			expect(snackBar.open).toHaveBeenCalledTimes(2);
		});
	});
});
