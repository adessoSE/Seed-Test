import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { LayoutModalComponent } from '../layout-modal/layout-modal.component';


describe('RepoSwichComponent', () => {

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [HttpClientTestingModule, MatSnackBarModule, LayoutModalComponent],
			schemas: [NO_ERRORS_SCHEMA]
		})
			.compileComponents();
	});

	it('should create', (() => {
		//
	}));
});
