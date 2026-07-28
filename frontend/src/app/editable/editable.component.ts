import { Component, ElementRef, ChangeDetectionStrategy, inject, output, contentChild, signal } from '@angular/core';
import { ViewModeDirective } from '../directives/view-mode.directive';
import { EditModeDirective } from '../directives/edit-mode.directive';
import { NgTemplateOutlet } from '@angular/common';

/**
 * Component to enable editable cells in the example table.
 * Switches between view and edit mode via double-click / click-outside.
 */
@Component({
	selector: 'editable',
	templateUrl: './editable.component.html',
	styleUrls: ['./editable.component.css'],
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [NgTemplateOutlet],
	host: {
		'(dblclick)': 'onDblClick()',
		'(document:click)': 'onDocumentClick($event)'
	}
})

export class EditableComponent {
	private elementRef = inject(ElementRef);

	readonly viewModeTpl = contentChild.required(ViewModeDirective);
	readonly editModeTpl = contentChild.required(EditModeDirective);
	readonly update = output();

	/** Current editing mode — 'view' shows read-only, 'edit' shows input */
	readonly mode = signal<'view' | 'edit'>('view');

	/**
	 * Switches to edit mode on double-click
	 */
	onDblClick() {
		this.mode.set('edit');
	}

	/**
	 * Returns to view mode when clicking outside the component while editing
	 */
	onDocumentClick(event: MouseEvent) {
		if (this.mode() === 'edit' && !this.element.contains(event.target as Node))
			this.toViewMode();
	}

	/**
	 * Changes to the view mode
	 */
	toViewMode() {
		this.update.emit();
		this.mode.set('view');
	}

	/**
	 * Gets the native element
	 */
	private get element() {
		return this.elementRef.nativeElement;
	}

	/**
	 * Gets the current mode
	 */
	get currentView() {
		return this.mode() === 'view' ? this.viewModeTpl().tpl : this.editModeTpl().tpl;
	}
}
