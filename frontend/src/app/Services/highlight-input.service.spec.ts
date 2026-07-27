import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { HighlightInputService } from './highlight-input.service';

describe('HighlightInputService', () => {
	let service: HighlightInputService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [HttpClientTestingModule, MatSnackBarModule]
		});
		service = TestBed.inject(HighlightInputService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
