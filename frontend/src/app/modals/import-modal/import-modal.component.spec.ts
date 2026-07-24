import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ImportModalComponent } from './import-modal.component';

describe('ImportModalComponent', () => {
	let component: ImportModalComponent;
	let fixture: ComponentFixture<ImportModalComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [ ImportModalComponent ],
			imports: [ FormsModule, ReactiveFormsModule, MatSlideToggleModule, NoopAnimationsModule ],
			providers: [
				{ provide: MatDialogRef, useValue: { close: jest.fn() } },
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
