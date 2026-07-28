import { TestBed } from '@angular/core/testing';
import { EditableComponent } from './editable.component';
import { NO_ERRORS_SCHEMA, TemplateRef } from '@angular/core';

describe('EditableComponent', () => {

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [EditableComponent],
			providers: [TemplateRef],
			schemas: [NO_ERRORS_SCHEMA]
		})
			.compileComponents();
	});

	it('should create', () => {
	});
});
