import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { LoginService } from './login.service';

/** Body the backend sends with a 401 when the account still has a legacy (plaintext-bcrypt) password */
const LEGACY_REJECTION = { error: 'Password incorrect', data: { code: 'LEGACY_PASSWORD' } };

describe('LoginService', () => {

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [HttpClientTestingModule, MatSnackBarModule]
		});
		sessionStorage.setItem('url_backend', 'http://localhost:8080/api');
	});
	afterEach(() => {
		sessionStorage.removeItem('url_backend');
		localStorage.removeItem('JiraSession');
		localStorage.removeItem('clientId');
	});

	describe('create', () => {
		it('should be created', () => {
			const service = TestBed.inject(LoginService);
			expect(service).toBeTruthy();
		});
	});

	describe('jiraLogin', () => {
		it('should not store the Jira session in localStorage', () => {
			const service = TestBed.inject(LoginService);
			const httpController = TestBed.inject(HttpTestingController);

			service.jiraLogin('jiraUser', 'secret', 'https://jira.example.com').subscribe();
			httpController.expectOne('http://localhost:8080/api/jira/login').flush({ session: 'cookie-value' });

			// Regression: the response was stored as resp.toString() ("[object Object]") and nothing read it.
			// A session credential in localStorage is readable by any script on the page.
			expect(localStorage.getItem('JiraSession')).toBeNull();
			httpController.verify();
		});
	});

	// GitHub OAuth: the backend accepts a callback only with the state it issued to this browser session
	describe('GitHub login state', () => {
		it('fetches the state with the session cookie, then redirects to GitHub with that state', () => {
			localStorage.setItem('clientId', 'client-123');
			const service = TestBed.inject(LoginService);
			const httpController = TestBed.inject(HttpTestingController);
			const redirectSpy = vi.spyOn(service as unknown as { redirectTo: (url: string) => void }, 'redirectTo').mockImplementation(() => {});

			service.githubLogin().subscribe();
			const req = httpController.expectOne('http://localhost:8080/api/user/github/state');
			expect(req.request.method).toBe('GET');
			expect(req.request.withCredentials).toBe(true);
			expect(redirectSpy).not.toHaveBeenCalled();

			req.flush({ state: 'nonce-1' });

			expect(redirectSpy).toHaveBeenCalledTimes(1);
			const url = redirectSpy.mock.calls[0][0];
			expect(url).toContain('https://github.com/login/oauth/authorize?');
			expect(url).toContain('client_id=client-123');
			expect(url).toContain('state=nonce-1');
			httpController.verify();
		});

		it('does not redirect to GitHub when the state cannot be fetched', () => {
			const service = TestBed.inject(LoginService);
			const httpController = TestBed.inject(HttpTestingController);
			const redirectSpy = vi.spyOn(service as unknown as { redirectTo: (url: string) => void }, 'redirectTo').mockImplementation(() => {});
			const onError = vi.fn();

			service.githubLogin().subscribe({ error: onError });
			httpController.expectOne('http://localhost:8080/api/user/github/state').flush('boom', { status: 500, statusText: 'Server Error' });

			expect(redirectSpy).not.toHaveBeenCalled();
			expect(onError).toHaveBeenCalled();
		});

		it('URL-encodes the state when building the authorize URL', () => {
			localStorage.setItem('clientId', 'client-123');
			const service = TestBed.inject(LoginService);

			const url = service.buildGithubAuthorizeUrl('a b&c');

			expect(url).toContain('scope=repo');
			expect(url).toContain('state=a%20b%26c');
		});

		it('forwards code and state to the backend callback as query parameters, with the session cookie', () => {
			const service = TestBed.inject(LoginService);
			const httpController = TestBed.inject(HttpTestingController);

			service.githubCallback('code-1', 'state-1').subscribe();
			const req = httpController.expectOne(r => r.url === 'http://localhost:8080/api/user/callback');

			expect(req.request.params.get('code')).toBe('code-1');
			expect(req.request.params.get('state')).toBe('state-1');
			expect(req.request.withCredentials).toBe(true);
			req.flush({ login: 'ghuser', id: 42 });
		});
	});

	// Regression: the frontend sent a client-chosen userId that the backend ignored, so the register-from-GitHub
	// flow silently created a second account. Registration now sends only the credentials.
	describe('registerUser', () => {
		it('sends only the e-mail and the hashed password, never a userId', async () => {
			const service = TestBed.inject(LoginService);
			const httpController = TestBed.inject(HttpTestingController);

			service.registerUser('new@example.com', 'password123').subscribe();
			// The password is hashed before the request is sent, so wait until it is issued
			const req = await vi.waitFor(() => httpController.expectOne('http://localhost:8080/api/user/register'));

			expect(Object.keys(req.request.body).sort()).toEqual(['email', 'password']);
			expect(req.request.body.password).not.toBe('password123');
			req.flush({ insertedId: 'x' });
		});
	});

	describe('loginUser', () => {
		// Regression: loginUser swallowed a rejected login as of(null), so callers could not tell a failure
		// from an empty success and navigated silently. A rejected login must reach the caller's error handler.
		it('errors instead of emitting null when the hashed and the legacy login are both rejected', async () => {
			// Force the secure-context path: hashed login first, legacy login as the fallback
			const originalSecure = window.isSecureContext;
			Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
			try {
				const service = TestBed.inject(LoginService);
				const httpController = TestBed.inject(HttpTestingController);
				const next = vi.fn();
				const error = vi.fn();

				service.loginUser({ email: 'a@example.com', password: 'wrong' }).subscribe({ next, error });
				const hashed = await vi.waitFor(() => httpController.expectOne('http://localhost:8080/api/user/login'));
				hashed.flush(LEGACY_REJECTION, { status: 401, statusText: 'Unauthorized' });
				const legacy = await vi.waitFor(() => httpController.expectOne('http://localhost:8080/api/user/login'));
				legacy.flush({ message: 'Wrong Username Or Password' }, { status: 401, statusText: 'Unauthorized' });

				expect(next).not.toHaveBeenCalled();
				expect(error).toHaveBeenCalledTimes(1);
			} finally {
				Object.defineProperty(window, 'isSecureContext', { value: originalSecure, configurable: true });
			}
		});

		// Regression: any failure of the hashed login (wrong password, 429, 500) resent the plaintext password.
		// The plaintext fallback may only run when the backend marks the account as legacy (data.code LEGACY_PASSWORD).
		describe('plaintext fallback', () => {
			const LOGIN_URL = 'http://localhost:8080/api/user/login';
			let originalSecure: boolean;

			beforeEach(() => {
				originalSecure = window.isSecureContext;
				Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
			});
			afterEach(() => {
				Object.defineProperty(window, 'isSecureContext', { value: originalSecure, configurable: true });
			});

			it('does not resend the plaintext password when the hashed login gets a plain 401', async () => {
				const service = TestBed.inject(LoginService);
				const httpController = TestBed.inject(HttpTestingController);
				const error = vi.fn();

				service.loginUser({ email: 'a@example.com', password: 'wrong' }).subscribe({ error });
				const hashed = await vi.waitFor(() => httpController.expectOne(LOGIN_URL));
				hashed.flush({ error: 'Password incorrect' }, { status: 401, statusText: 'Unauthorized' });

				expect(error).toHaveBeenCalledTimes(1);
				httpController.verify(); // fails if a second (plaintext) request was issued
			});

			it('does not resend the plaintext password on a 429 rate limit', async () => {
				const service = TestBed.inject(LoginService);
				const httpController = TestBed.inject(HttpTestingController);
				const error = vi.fn();

				service.loginUser({ email: 'a@example.com', password: 'wrong' }).subscribe({ error });
				const hashed = await vi.waitFor(() => httpController.expectOne(LOGIN_URL));
				hashed.flush({ error: 'Too many requests' }, { status: 429, statusText: 'Too Many Requests' });

				expect(error).toHaveBeenCalledTimes(1);
				httpController.verify();
			});

			it('sends the plaintext request once the backend flags a legacy account', async () => {
				const service = TestBed.inject(LoginService);
				const httpController = TestBed.inject(HttpTestingController);
				const next = vi.fn();

				service.loginUser({ email: 'a@example.com', password: 'legacyPw' }).subscribe({ next });
				const hashed = await vi.waitFor(() => httpController.expectOne(LOGIN_URL));
				hashed.flush(LEGACY_REJECTION, { status: 401, statusText: 'Unauthorized' });
				const legacy = await vi.waitFor(() => httpController.expectOne(LOGIN_URL));
				expect(legacy.request.body.password).toBe('legacyPw');
				expect(legacy.request.body.legacyPassword).toBe(true);
				legacy.flush({ _id: 'u1' });

				expect(next).toHaveBeenCalledWith({ _id: 'u1' });
			});

			// Regression: over http (non-secure context) the plaintext was sent straight to the legacy login, so
			// digest-stored accounts could never sign in. The digest must be sent first in both contexts.
			it('sends the SHA-256 digest first, without legacyPassword, when the page is not a secure context', async () => {
				Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true });
				const service = TestBed.inject(LoginService);
				const httpController = TestBed.inject(HttpTestingController);
				const next = vi.fn();

				service.loginUser({ email: 'a@example.com', password: 'legacyPw' }).subscribe({ next });
				const hashed = await vi.waitFor(() => httpController.expectOne(LOGIN_URL));
				expect(hashed.request.body.password).toMatch(/^[0-9a-f]{64}$/);
				expect(hashed.request.body.password).not.toBe('legacyPw');
				expect(hashed.request.body.legacyPassword).toBeUndefined();
				hashed.flush({ _id: 'u1' });

				expect(next).toHaveBeenCalledWith({ _id: 'u1' });
			});

			it('retries with legacyPassword: true and the plaintext when the page is not a secure context', async () => {
				Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true });
				const service = TestBed.inject(LoginService);
				const httpController = TestBed.inject(HttpTestingController);
				const next = vi.fn();

				service.loginUser({ email: 'a@example.com', password: 'legacyPw' }).subscribe({ next });
				const hashed = await vi.waitFor(() => httpController.expectOne(LOGIN_URL));
				hashed.flush(LEGACY_REJECTION, { status: 401, statusText: 'Unauthorized' });
				const legacy = await vi.waitFor(() => httpController.expectOne(LOGIN_URL));
				expect(legacy.request.body).toEqual({ email: 'a@example.com', password: 'legacyPw', legacyPassword: true });
				legacy.flush({ _id: 'u1' });

				expect(next).toHaveBeenCalledWith({ _id: 'u1' });
			});
		});
	});
});
