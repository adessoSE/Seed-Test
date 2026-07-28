import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { LoginService } from './login.service';

describe('LoginService', () => {

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
			const service = TestBed.inject(LoginService);
			expect(service).toBeTruthy();
		});
	});
});
