import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { onActionTrigger } from './action-trigger';
import { NotificationService } from './notification.service';
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

	describe('getBackendInfo', () => {
		it('reports a failed playwright emulator fetch to the user', async () => {
			// Regression: the emulator-list request was subscribed without an error handler, so a failure
			// only surfaced as an unhandled RxJS error and the user received no feedback.
			const notify = TestBed.inject(NotificationService);
			const notifyErrorSpy = vi.spyOn(notify, 'error');
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
			// getBackendInfo() only fetches /backendInfo when the emulator keys are missing from localStorage
			localStorage.removeItem('playwright_emulators');

			const promise = service.getBackendInfo();
			httpMock.expectOne(window.location.origin + '/backendInfo').flush({
				url: 'http://localhost:8080/api',
				clientId: 'client',
				version: '2.0.0',
				gecko_enabled: 'true',
				chromium_enabled: 'true',
				edge_enabled: 'true',
				webkit_enabled: 'true',
				gecko_emulators: 'g',
				chromium_emulators: 'c',
				edge_emulators: 'e'
			});
			// The emulator request is issued inside the .then() that resolves this promise
			await promise;

			httpMock.expectOne('http://localhost:8080/api/playwright/device-names')
				.flush('boom', { status: 500, statusText: 'Internal Server Error' });

			expect(notifyErrorSpy).toHaveBeenCalledTimes(1);
			consoleErrorSpy.mockRestore();
		});
	});

	describe('initializeBackendInfo', () => {
		/** Forces the first-run path: without a cached backend URL the guard does not short-circuit. */
		const resetToFirstRun = () => {
			service.urlReceived = false;
			localStorage.removeItem('url_backend');
		};

		it('falls back to the default backend URL when /backendInfo returns HTML', async () => {
			// Regression: `ng serve` has no server.js, so GET /backendInfo answers index.html.
			// The JSON parse failure rejected APP_INITIALIZER and a fresh user could not start the app.
			resetToFirstRun();
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

			const promise = service.initializeBackendInfo();
			httpMock.expectOne(window.location.origin + '/backendInfo')
				.flush('<!doctype html><html></html>');

			await expect(promise).resolves.toBeUndefined();
			expect(service.apiServer).toBe('http://localhost:8080/api');
			// urlReceived stays false so the next load or call retries /backendInfo instead of pinning the default
			expect(service.urlReceived).toBe(false);
			expect(warnSpy).toHaveBeenCalledTimes(1);
			warnSpy.mockRestore();
		});

		it('falls back to the default backend URL when /backendInfo fails with HTTP 500', async () => {
			resetToFirstRun();
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

			const promise = service.initializeBackendInfo();
			httpMock.expectOne(window.location.origin + '/backendInfo')
				.flush('boom', { status: 500, statusText: 'Internal Server Error' });

			await expect(promise).resolves.toBeUndefined();
			expect(service.apiServer).toBe('http://localhost:8080/api');
			// Regression: the fallback persisted the default URL, so every later load skipped /backendInfo
			expect(localStorage.getItem('url_backend')).toBeNull();
			warnSpy.mockRestore();
		});

		it('retries /backendInfo on the next initializeBackendInfo call after a fallback', async () => {
			// Regression: the fallback set urlReceived and stored url_backend, so the second call returned early
			// and a transient proxy error or HTML catch-all pinned the browser to the default URL.
			resetToFirstRun();
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

			const first = service.initializeBackendInfo();
			httpMock.expectOne(window.location.origin + '/backendInfo')
				.flush('boom', { status: 500, statusText: 'Internal Server Error' });
			await first;

			const second = service.initializeBackendInfo();
			httpMock.expectOne(window.location.origin + '/backendInfo').flush({
				url: 'http://custom:9090/api',
				clientId: 'client',
				version: '2.0.0',
				gecko_enabled: 'false',
				chromium_enabled: 'true',
				edge_enabled: 'false',
				webkit_enabled: 'false',
				gecko_emulators: 'g',
				chromium_emulators: 'c',
				edge_emulators: 'e'
			});
			await second;
			httpMock.expectOne('http://custom:9090/api/playwright/device-names').flush(['Pixel 5']);

			expect(localStorage.getItem('url_backend')).toBe('http://custom:9090/api');
			warnSpy.mockRestore();
		});

		it('sends API calls to the default backend URL after a fallback', async () => {
			// Guards the in-memory apiServer: the service methods used to re-read url_backend from localStorage,
			// which is null after a fallback and would build request URLs starting with "null/".
			resetToFirstRun();
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

			const init = service.initializeBackendInfo();
			httpMock.expectOne(window.location.origin + '/backendInfo').flush('<!doctype html><html></html>');
			await init;

			const promise = firstValueFrom(service.resolveSpecialCommand('@@Day,1@@format:x'));
			httpMock.expectOne('http://localhost:8080/api/story/specialCommands/resolve').flush({ resolved: 'Monday' });
			await expect(promise).resolves.toBe('Monday');
			warnSpy.mockRestore();
		});

		it('uses the URL from a valid /backendInfo response', async () => {
			resetToFirstRun();

			const promise = service.initializeBackendInfo();
			httpMock.expectOne(window.location.origin + '/backendInfo').flush({
				url: 'http://custom:9090/api',
				clientId: 'client',
				version: '2.0.0',
				gecko_enabled: 'false',
				chromium_enabled: 'true',
				edge_enabled: 'false',
				webkit_enabled: 'false',
				gecko_emulators: 'g',
				chromium_emulators: 'c',
				edge_emulators: 'e'
			});
			// The emulator request is issued inside the .then() that resolves the promise, so await first
			await promise;
			httpMock.expectOne('http://custom:9090/api/playwright/device-names').flush(['Pixel 5']);

			await expect(promise).resolves.toBeUndefined();
			expect(localStorage.getItem('url_backend')).toBe('http://custom:9090/api');
			expect(localStorage.getItem('log_url')).toBe('http://custom:9090/api');
			// Regression: the in-memory apiServer was never updated on success, so API calls used the old URL
			expect(service.apiServer).toBe('http://custom:9090/api');
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
