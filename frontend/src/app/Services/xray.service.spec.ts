import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { XrayService } from './xray.service';

describe('XrayService', () => {
	let service: XrayService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [HttpClientTestingModule, MatSnackBarModule]
		});
		service = TestBed.inject(XrayService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
