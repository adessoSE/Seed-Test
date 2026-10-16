import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

/**
 * Options for notification display, matching the subset of ngx-toastr options
 * that call sites actually used.
 */
export interface NotificationOptions {
	timeOut?: number;
	closeButton?: boolean;
}

/**
 * Window in which an identical error or warning toast (same type, title and message) is suppressed.
 * Only automatic loads that fail are collapsed: editors are re-created per selection, so one backend
 * outage would otherwise show the same error once per click. Success and info toasts are never
 * suppressed, because a user saving twice expects two confirmations.
 */
const DUPLICATE_WINDOW_MS = 5000;

/**
 * Thin wrapper around MatSnackBar providing typed notification methods.
 * Replaces ngx-toastr's ToastrService with the same call-site API:
 * `.success(message, title)`, `.error(message, title)`, etc.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
	private snackBar = inject(MatSnackBar);
	// Last show time per identical toast, keyed by type+title+message
	private lastShownAt = new Map<string, number>();

	/** Show a success notification (green) */
	success(message: string, title?: string, opts?: NotificationOptions) {
		this.show(message, title, 'snackbar-success', opts);
	}

	/** Show an error notification (red) */
	error(message: string, title?: string, opts?: NotificationOptions) {
		this.show(message, title, 'snackbar-error', opts);
	}

	/** Show a warning notification (orange) */
	warning(message: string, title?: string, opts?: NotificationOptions) {
		this.show(message, title, 'snackbar-warning', opts);
	}

	/** Show an info notification (blue) */
	info(message: string, title?: string, opts?: NotificationOptions) {
		this.show(message, title, 'snackbar-info', opts);
	}

	private show(message: string, title: string | undefined, panelClass: string, opts?: NotificationOptions) {
		// Combine title and message — SnackBar is single-line.
		// The separator is only added when both parts exist: many call sites pass '' as message,
		// which would otherwise render a dangling "Title: " in the toast.
		const displayMessage = title && message ? `${title}: ${message}` : (title || message);

		// Only error and warning toasts are deduplicated; success and info always show
		if (panelClass === 'snackbar-error' || panelClass === 'snackbar-warning') {
			// CASE 1: identical error/warning still inside the window — suppressed, the user already sees it
			const key = JSON.stringify([panelClass, title ?? '', message]);
			const now = Date.now();
			const lastShown = this.lastShownAt.get(key);
			if (lastShown !== undefined && now - lastShown < DUPLICATE_WINDOW_MS) return;
			this.lastShownAt.set(key, now);
		}

		const action = opts?.closeButton ? 'Close' : undefined;
		this.snackBar.open(displayMessage, action, {
			duration: opts?.timeOut ?? 3000,
			panelClass: [panelClass],
			horizontalPosition: 'end',
			verticalPosition: 'top'
		});
	}
}
