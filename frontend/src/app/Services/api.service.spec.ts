import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { onActionTrigger } from './action-trigger';
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

	describe('resolveSpecialCommand', () => {
		it('should unwrap the backend { resolved } body so callers receive the plain string', async () => {
			// Regression: the backend answers { resolved: string }; the raw body was typed and used as a string.
			const promise = firstValueFrom(service.resolveSpecialCommand('@@Day,1@@format:x€€'));

			const req = httpMock.expectOne('http://localhost:8080/api/story/specialCommands/resolve');
			expect(req.request.body).toEqual({ command: '@@Day,1@@format:x€€' });
			req.flush({ resolved: 'Monday' });

			await expect(promise).resolves.toBe('Monday');
		});
	});

	describe('action triggers', () => {
		it('handles each runSaveOption request once, even when two identical requests arrive back-to-back', () => {
			const handler = vi.fn();
			TestBed.runInInjectionContext(() => onActionTrigger(service.runSaveOptionTrigger, handler));

			// Regression: the signal(0) counter merged requests emitted within one change-detection pass
			service.runSaveOption('run');
			service.runSaveOption('run');
			TestBed.flushEffects();

			expect(handler.mock.calls).toEqual([['run'], ['run']]);
		});

		it('handles each copyStepWithExampleOption request once, in emission order', () => {
			const handler = vi.fn();
			TestBed.runInInjectionContext(() => onActionTrigger(service.copyStepWithExampleTrigger, handler));

			service.copyStepWithExampleOption('copy');
			service.copyStepWithExampleOption('dontCopy');
			TestBed.flushEffects();

			expect(handler.mock.calls).toEqual([['copy'], ['dontCopy']]);
		});
	});

});
