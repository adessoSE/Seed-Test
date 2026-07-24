import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ToastrModule } from 'ngx-toastr';

import { HighlightInputService } from './highlight-input.service';

describe('HighlightInputService', () => {
	let service: HighlightInputService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [HttpClientTestingModule, ToastrModule.forRoot()]
		});
		service = TestBed.inject(HighlightInputService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
