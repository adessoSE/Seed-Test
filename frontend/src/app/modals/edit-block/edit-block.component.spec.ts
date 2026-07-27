import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { EditBlockComponent } from './edit-block.component';

describe('EditBlockComponent', () => {
	let component: EditBlockComponent;
	let fixture: ComponentFixture<EditBlockComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [ EditBlockComponent ],
			imports: [ HttpClientTestingModule, MatSnackBarModule ],
			// Suppress errors for child components (app-layout-modal, app-base-editor)
			schemas: [ NO_ERRORS_SCHEMA ]
		})
			.compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(EditBlockComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
