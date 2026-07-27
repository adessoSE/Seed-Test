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
 * Thin wrapper around MatSnackBar providing typed notification methods.
 * Replaces ngx-toastr's ToastrService with the same call-site API:
 * `.success(message, title)`, `.error(message, title)`, etc.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
	private snackBar = inject(MatSnackBar);


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
		// Combine title and message — SnackBar is single-line
		const displayMessage = title ? `${title}: ${message}` : message;
		const action = opts?.closeButton ? 'Close' : undefined;
		this.snackBar.open(displayMessage, action, {
			duration: opts?.timeOut ?? 3000,
			panelClass: [panelClass],
			horizontalPosition: 'end',
			verticalPosition: 'top'
		});
	}
}
