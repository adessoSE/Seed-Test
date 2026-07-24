import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ToastrModule} from 'ngx-toastr';
import { HttpClient } from '@angular/common/http';
import { BackgroundService } from './background.service';
import { ApiService } from './api.service';

describe('BackgroundService', () => {
	let _service: BackgroundService;
	let _httpMock: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [HttpClientTestingModule, ToastrModule.forRoot()]
		});
		_service = TestBed.inject(BackgroundService);
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
			const service: BackgroundService = new BackgroundService(apiService,http);
			expect(service).toBeTruthy();
		});
	});
});
