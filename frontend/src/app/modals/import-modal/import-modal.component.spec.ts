import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ImportModalComponent } from './import-modal.component';

describe('ImportModalComponent', () => {
	let component: ImportModalComponent;
	let fixture: ComponentFixture<ImportModalComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [FormsModule, ReactiveFormsModule, MatFormFieldModule, MatSelectModule, MatSlideToggleModule, NoopAnimationsModule, ImportModalComponent],
			providers: [
				{ provide: MatDialogRef, useValue: { close: vi.fn() } },
				{ provide: MAT_DIALOG_DATA, useValue: { repoList: [] } }
			],
			schemas: [NO_ERRORS_SCHEMA]
		})
			.compileComponents();

		fixture = TestBed.createComponent(ImportModalComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
