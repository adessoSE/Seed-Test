import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { ApiService } from './api.service';
import { ScenarioService } from './scenario.service';

describe('ScenarioService', () => {
	let _service: ScenarioService;
	let _httpMock: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [HttpClientTestingModule, MatSnackBarModule]

		});
		_service = TestBed.inject(ScenarioService);
		_httpMock = TestBed.inject(HttpTestingController);
		sessionStorage.setItem('url_backend', 'http://localhost:8080/api');
	});
	afterEach(() => {
		sessionStorage.removeItem('url_backend');
	});

	describe('create', () => {
		it('should be created', () => {
			const http: HttpClient = TestBed.inject(HttpClient);
			const apiService = TestBed.inject(ApiService);
			const service = TestBed.inject(ScenarioService);
			expect(service).toBeTruthy();
		});
	});
});
