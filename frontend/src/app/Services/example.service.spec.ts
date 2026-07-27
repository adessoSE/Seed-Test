import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NotificationService } from './notification.service';
import { ApiService } from './api.service';
import { ExampleService } from './example.service';

describe('ExampleService', () => {
	let _service: ExampleService;
	let _httpMock: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [HttpClientTestingModule, MatSnackBarModule]
		});
		_service = TestBed.inject(ExampleService);
		_httpMock = TestBed.inject(HttpTestingController);
		sessionStorage.setItem('url_backend', 'http://localhost:8080/api');
	});
	afterEach(() => {
		sessionStorage.removeItem('url_backend');
	});

	describe('create', () => {
		it('should be created', () => {
			const apiService = TestBed.inject(ApiService);
			const toast = TestBed.inject(NotificationService);
			const service: ExampleService = new ExampleService(apiService,toast);
			expect(service).toBeTruthy();
		});
	});
});
