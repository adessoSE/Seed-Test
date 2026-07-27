import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

/**
 * Button definition for the confirm dialog.
 */
export interface ConfirmDialogButton {
	label: string;
	/** Value returned when this button is clicked */
	value: string;
	color?: 'warn' | 'primary' | 'accent';
}

/**
 * Data passed to the confirm dialog via MAT_DIALOG_DATA.
 */
export interface ConfirmDialogData {
	title: string;
	message: string;
	buttons: ConfirmDialogButton[];
}

/**
 * Generic confirmation dialog replacing the 4 custom ngx-toastr toast components.
 * Returns the clicked button's `value` string, or `undefined` if dismissed.
 */
@Component({
	selector: 'app-confirm-dialog',
	template: `
		<h2 mat-dialog-title>{{ data.title }}</h2>
		<mat-dialog-content>
			<p>{{ data.message }}</p>
		</mat-dialog-content>
		<mat-dialog-actions align="end">
			@for (btn of data.buttons; track btn.value) {
				@if (btn.color) {
					<button mat-flat-button [color]="btn.color" (click)="dialogRef.close(btn.value)">
						{{ btn.label }}
					</button>
				} @else {
					<button mat-button (click)="dialogRef.close(btn.value)">
						{{ btn.label }}
					</button>
				}
			}
		</mat-dialog-actions>
	`,
	changeDetection: ChangeDetectionStrategy.Eager,
	standalone: false
})
export class ConfirmDialogComponent {
	dialogRef = inject<MatDialogRef<ConfirmDialogComponent>>(MatDialogRef);
	data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}
