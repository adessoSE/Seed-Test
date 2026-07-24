import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ToastrModule } from 'ngx-toastr';

import { XrayService } from './xray.service';

describe('XrayService', () => {
	let service: XrayService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [HttpClientTestingModule, ToastrModule.forRoot()]
		});
		service = TestBed.inject(XrayService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
