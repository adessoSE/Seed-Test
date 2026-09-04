import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { MatSnackBarModule } from '@angular/material/snack-bar';


describe('ApiService', () => {

	let httpMock: HttpTestingController;
	let service: ApiService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [HttpClientTestingModule, MatSnackBarModule]
		});
		service = TestBed.inject(ApiService);
		httpMock = TestBed.inject(HttpTestingController);
		sessionStorage.setItem('url_backend', 'http://localhost:8080/api');
		localStorage.setItem('url_backend', 'http://localhost:8080/api');
	});

	afterEach(() => {
		sessionStorage.removeItem('url_backend');
		localStorage.removeItem('url_backend');
		httpMock.verify();
	});

	describe('create', () => {
		it('should be created', () => {
			expect(service).toBeTruthy();
		});
	});

	describe('updateUser', () => {
		it('should propagate a 401 (wrong current password) as an error, NOT swallow it into success', async () => {
			const promise = firstValueFrom(service.updateUser('user123', {
				currentPassword: 'wrong',
				newPassword: 'correct'
			}));

			// updateUser SHA-256-hashes both passwords (WebCrypto, async) before the
			// POST is dispatched, so poll until the HTTP request has actually been
			// issued before flushing the mocked 401 response.
			let testReq: import('@angular/common/http/testing').TestRequest | undefined;
			for (let i = 0; i < 100 && !testReq; i++) {
				const match = httpMock.match('http://localhost:8080/api/user/update/user123');
				if (match.length) testReq = match[0];
				else await new Promise(r => setTimeout(r, 10));
			}
			expect(testReq).toBeTruthy();
			expect(testReq!.request.method).toBe('POST');
			// withCredentials is required for cross-origin session cookie
			expect(testReq!.request.withCredentials).toBe(true);
			testReq!.flush({ message: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });

			// Regression: a wrong current password must reject so the component can
			// render an inline error — it must NOT resolve with an empty "success".
			await expect(promise).rejects.toMatchObject({ status: 401 });
		});
	});

});
