import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { ApiService } from './api.service';
import { BlockService } from './block.service';
import { StoryService } from './story.service';

describe('BlockService', () => {
	let _service: BlockService;
	let _httpMock: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [HttpClientTestingModule, MatSnackBarModule]
		});
		_service = TestBed.inject(BlockService);
		_httpMock = TestBed.inject(HttpTestingController);
		sessionStorage.setItem('url_backend', 'http://localhost:8080/api');
	});
	afterEach(() => {
		sessionStorage.removeItem('url_backend');
	});

	describe('create', () => {
		it('should be created', () => {
			const _http: HttpClient = TestBed.inject(HttpClient);
			const _apiService = TestBed.inject(ApiService);
			const _storyService = TestBed.inject(StoryService);
			const service = TestBed.inject(BlockService);
			expect(service).toBeTruthy();
		});
	});
});
