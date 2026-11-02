import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogConfig } from '@angular/material/dialog';

/**
 * Default MatDialog config for the template-based modals (formerly NgbModal).
 * `autoFocus: 'dialog'` keeps the NgbModal behaviour of focusing the window instead of the close button.
 */
export const MODAL_CONFIG: MatDialogConfig = {
	width: '800px',
	maxWidth: '95vw',
	autoFocus: 'dialog',
	panelClass: 'st-modal'
};

@Component({
	selector: 'app-layout-modal',
	templateUrl: './layout-modal.component.html',
	styleUrls: ['./layout-modal.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class LayoutModalComponent {
	constructor() {
	}
}
