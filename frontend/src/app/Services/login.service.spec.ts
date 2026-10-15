import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { LoginService } from './login.service';

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
});
