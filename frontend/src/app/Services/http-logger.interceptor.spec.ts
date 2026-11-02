import { TestBed } from '@angular/core/testing';
import { HttpRequest, HttpErrorResponse, HttpStatusCode, type HttpHandler, type HttpEvent } from '@angular/common/http';
import { throwError, type Observable } from 'rxjs';
import { NGXLogger } from 'ngx-logger';
import { NotificationService } from './notification.service';
import { HttpLoggerInterceptor } from './http-logger.interceptor';

/**
 * Regression tests for the 401 handling in HttpLoggerInterceptor.
 *
 * The interceptor must bounce an expired/invalid session to /login — including on
 * the change-password endpoint — but must NOT bounce when that endpoint returns a
 * 401 for a *wrong current password* (that is surfaced as an inline form error).
 * The two 401s are told apart by response body:
 *   - wrong password     → { error: 'Current password is incorrect' }
 *   - missing/expired session → { error: 'Unauthorized: Please log in.' }
 */
describe('HttpLoggerInterceptor', () => {
	let interceptor: HttpLoggerInterceptor;

	// Original location so it can be restored after each test replaces it with a spy.
	const realLocation = window.location;

	/** Fake HttpHandler that immediately fails with the given error. */
	const failingHandler = (error: HttpErrorResponse): HttpHandler =>
		({ handle: (): Observable<HttpEvent<unknown>> => throwError(() => error) }) as HttpHandler;

	/** Capturable stand-in for window.location so redirects can be asserted without real navigation. */
	let mockLocation: { pathname: string; href: string };
	const redirectTo = (pathname: string) => {
		// Plain object — writes to .href are captured instead of triggering navigation
		mockLocation = { pathname, href: pathname };
		Object.defineProperty(window, 'location', { configurable: true, value: mockLocation });
	};
	const restoreLocation = () => {
		if (mockLocation)
			Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
		mockLocation = undefined as unknown as { pathname: string; href: string };
	};

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				HttpLoggerInterceptor,
				// NGXLogger is only used for request logging — a stub is sufficient here
				{ provide: NGXLogger, useValue: { log: vi.fn() } },
				// NotificationService only matters for the 429 branch; its MatSnackBar is irrelevant here
				{ provide: NotificationService, useValue: { warning: vi.fn() } }
			]
		});
		interceptor = TestBed.inject(HttpLoggerInterceptor);
		localStorage.removeItem('login');
	});

	afterEach(() => {
		restoreLocation();
		localStorage.removeItem('login');
	});

	/** Drives the interceptor to completion and returns the terminal error (if any). */
	const run = (req: HttpRequest<unknown>, error: HttpErrorResponse) =>
		new Promise<void>((resolve) => {
			interceptor.intercept(req, failingHandler(error)).subscribe({ error: () => resolve() });
		});

	const changePasswordReq = new HttpRequest('POST', '/api/user/update/user123', {
		currentPassword: 'wrong',
		newPassword: 'newPass123'
	});

	const anyOtherReq = new HttpRequest('GET', '/api/user/');

	const sessionExpiryError = new HttpErrorResponse({
		status: HttpStatusCode.Unauthorized,
		error: { error: 'Unauthorized: Please log in.' }
	});

	const wrongPasswordError = new HttpErrorResponse({
		status: HttpStatusCode.Unauthorized,
		error: { error: 'Current password is incorrect' }
	});

	it('stays on the page (no redirect) for a wrong current password on the change-password endpoint', async () => {
		redirectTo('/accountManagement');
		localStorage.setItem('login', 'session');

		await run(changePasswordReq, wrongPasswordError);

		// Wrong password is a form-level outcome, not a session expiry
		expect(mockLocation.href).toBe('/accountManagement');
		expect(mockLocation.pathname).toBe('/accountManagement');
		// Session data must NOT be cleared — the user is still logged in
		expect(localStorage.getItem('login')).toBe('session');
	});

	it('redirects to /login for an expired session even on the change-password endpoint', async () => {
		redirectTo('/accountManagement');
		localStorage.setItem('login', 'session');

		await run(changePasswordReq, sessionExpiryError);

		// Genuine session expiry must bounce to re-auth regardless of endpoint
		expect(mockLocation.href).toBe('/login');
		expect(localStorage.getItem('login')).toBeNull();
	});

	it('redirects to /login for an expired session on any other endpoint (unchanged behavior)', async () => {
		redirectTo('/somewhere');

		await run(anyOtherReq, sessionExpiryError);

		expect(mockLocation.href).toBe('/login');
	});
});
