import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ManagementService } from '../Services/management.service';

describe('ManagementService', () => {

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [HttpClientTestingModule, MatSnackBarModule]
		});
		sessionStorage.setItem('url_backend', 'http://localhost:8080/api');
	});
	afterEach(() => {
		sessionStorage.removeItem('url_backend');
	});

	describe('create', () => {
		it('should be created', () => {
			const service = TestBed.inject(ManagementService);
			expect(service).toBeTruthy();
		});
	});
});
