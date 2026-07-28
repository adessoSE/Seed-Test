import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ApiService } from './api.service';
import { MatSnackBarModule } from '@angular/material/snack-bar';


describe('ApiService', () => {

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
			const service = TestBed.inject(ApiService);
			expect(service).toBeTruthy();
		});
	});

});
