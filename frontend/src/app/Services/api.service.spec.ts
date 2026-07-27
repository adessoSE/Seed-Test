import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ApiService } from './api.service';
import { HttpClient } from '@angular/common/http';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NotificationService } from './notification.service';


describe('ApiService', () => {
	let _service: ApiService;
	let _httpMock: HttpTestingController;
	let _toast: NotificationService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [HttpClientTestingModule, MatSnackBarModule]
		});
		_service = TestBed.inject(ApiService);
		_httpMock = TestBed.inject(HttpTestingController);
		_toast = TestBed.inject(NotificationService);
		sessionStorage.setItem('url_backend', 'http://localhost:8080/api');
	});

	afterEach(() => {
		sessionStorage.removeItem('url_backend');
	});

	describe('create', () => {
		it('should be created', () => {
			const http: HttpClient = TestBed.inject(HttpClient);
			const service: ApiService = new ApiService(http);
			expect(service).toBeTruthy();
		});
	});

});