import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ProjectService } from './project.service';


describe('ProjectService', () => {

	let service: ProjectService;
	let httpController: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [HttpClientTestingModule, MatSnackBarModule]
		});
		service = TestBed.inject(ProjectService);
		httpController = TestBed.inject(HttpTestingController);
		sessionStorage.setItem('url_backend', 'http://localhost:8080/api');
	});
	afterEach(() => {
		sessionStorage.removeItem('url_backend');
		httpController.verify();
	});

	function fetchAndFlush(repos: unknown[]): void {
		service.getRepositories().subscribe();
		httpController.expectOne('http://localhost:8080/api/repository/').flush(repos);
	}

	describe('create', () => {
		it('should be created', () => {
			expect(service).toBeTruthy();
		});
	});

	describe('getRepositories caching', () => {

		it('should fire exactly one HTTP request when multiple subscribers call getRepositories() at the same time', () => {
			const results1: unknown[] = [];
			const results2: unknown[] = [];

			service.getRepositories().subscribe(r => results1.push(r));
			service.getRepositories().subscribe(r => results2.push(r));

			const req = httpController.expectOne('http://localhost:8080/api/repository/');
			expect(req.request.method).toBe('GET');

			const mockRepos = [{ _id: '1', repoName: 'RepoA' }];
			req.flush(mockRepos);

			expect(results1).toEqual([mockRepos]);
			expect(results2).toEqual([mockRepos]);
		});

		it('should return cached data to late subscribers without a second HTTP request', () => {
			const earlyResults: unknown[] = [];

			service.getRepositories().subscribe(r => earlyResults.push(r));

			const req = httpController.expectOne('http://localhost:8080/api/repository/');
			const mockRepos = [{ _id: '1', repoName: 'RepoA' }];
			req.flush(mockRepos);

			const lateResults: unknown[] = [];
			service.getRepositories().subscribe(r => lateResults.push(r));

			httpController.expectNone('http://localhost:8080/api/repository/');
			expect(lateResults).toEqual([mockRepos]);
		});

		it('should write response to sessionStorage', () => {
			service.getRepositories().subscribe();

			const req = httpController.expectOne('http://localhost:8080/api/repository/');
			const mockRepos = [{ _id: '1', repoName: 'RepoA' }];
			req.flush(mockRepos);

			expect(JSON.parse(sessionStorage.getItem('repositories')!)).toEqual(mockRepos);
		});
	});

	describe('refreshRepositories', () => {

		it('should fire a new HTTP request after refresh', () => {
			fetchAndFlush([{ _id: '1', repoName: 'Old' }]);

			service.refreshRepositories();

			service.getRepositories().subscribe();
			const req2 = httpController.expectOne('http://localhost:8080/api/repository/');
			expect(req2.request.method).toBe('GET');
			req2.flush([{ _id: '2', repoName: 'New' }]);
		});

		it('should return fresh data to subscribers after refresh', () => {
			const initialResults: unknown[] = [];
			service.getRepositories().subscribe(r => initialResults.push(r));
			const req1 = httpController.expectOne('http://localhost:8080/api/repository/');
			req1.flush([{ _id: '1', repoName: 'Old' }]);
			expect(initialResults).toEqual([[{ _id: '1', repoName: 'Old' }]]);

			service.refreshRepositories();

			const freshResults: unknown[] = [];
			service.getRepositories().subscribe(r => freshResults.push(r));
			const req2 = httpController.expectOne('http://localhost:8080/api/repository/');
			req2.flush([{ _id: '2', repoName: 'New' }]);
			expect(freshResults).toEqual([[{ _id: '2', repoName: 'New' }]]);
		});
	});

	describe('getRepositoriesEmitter + updateRepositoryEmitter', () => {

		it('should invalidate cache when getRepositoriesEmitter is called', () => {
			fetchAndFlush([{ _id: '1', repoName: 'A' }]);

			// Emit triggers refreshRepositories internally — flush the auto-triggered fetch
			service.getRepositoriesEmitter();
			httpController.expectOne('http://localhost:8080/api/repository/').flush([{ _id: '2', repoName: 'B' }]);

			service.getRepositories().subscribe();
			httpController.expectNone('http://localhost:8080/api/repository/');
		});

		it('should invalidate cache when updateRepositoryEmitter is called', () => {
			fetchAndFlush([{ _id: '1', repoName: 'A' }]);

			// Emit triggers refreshRepositories internally — flush the auto-triggered fetch
			service.updateRepositoryEmitter();
			httpController.expectOne('http://localhost:8080/api/repository/').flush([{ _id: '2', repoName: 'B' }]);

			service.getRepositories().subscribe();
			httpController.expectNone('http://localhost:8080/api/repository/');
		});
	});

	describe('addRepositoryToCache', () => {

		it('should insert a new repository into sessionStorage so the list is fresh before any async refresh', () => {
			// Seed sessionStorage with the pre-create list, as getRepositories would have done
			sessionStorage.setItem('repositories', JSON.stringify([{ _id: '1', repoName: 'Existing' }]));

			service.addRepositoryToCache({ _id: '2', repoName: 'NewProject', source: 'db' });

			const stored = JSON.parse(sessionStorage.getItem('repositories')!) as Array<{ _id: string }>;
			expect(stored).toEqual([
				{ _id: '1', repoName: 'Existing' },
				{ _id: '2', repoName: 'NewProject', source: 'db' }
			]);
		});

		it('should not duplicate a repository that is already present (by _id)', () => {
			sessionStorage.setItem('repositories', JSON.stringify([{ _id: '1', repoName: 'Existing' }]));

			service.addRepositoryToCache({ _id: '1', repoName: 'Existing', source: 'db' });

			const stored = JSON.parse(sessionStorage.getItem('repositories')!) as Array<{ _id: string }>;
			expect(stored).toEqual([{ _id: '1', repoName: 'Existing', source: 'db' }]);
		});

		it('should create a fresh list when sessionStorage is empty', () => {
			sessionStorage.removeItem('repositories');

			service.addRepositoryToCache({ _id: '9', repoName: 'FirstProject', source: 'db' });

			const stored = JSON.parse(sessionStorage.getItem('repositories')!) as Array<{ _id: string }>;
			expect(stored).toEqual([{ _id: '9', repoName: 'FirstProject', source: 'db' }]);
		});
	});

	describe('effect cycle prevention', () => {

		it('should NOT call updateRepositoryEmitter from within getRepositories response tap', () => {
			const initialTriggerValue = service.updateRepositoryTrigger();

			service.getRepositories().subscribe();
			const req = httpController.expectOne('http://localhost:8080/api/repository/');
			req.flush([{ _id: '1', repoName: 'NoTrigger' }]);

			expect(service.updateRepositoryTrigger()).toBe(initialTriggerValue);
		});
	});

	// ----------------------------------------------------------------
	// sessionStorage fallback on HTTP error
	// ----------------------------------------------------------------
	describe('sessionStorage fallback on HTTP error', () => {

		beforeEach(() => {
			service.refreshRepositories();
		});

		it('should fall back to sessionStorage when getRepositories HTTP call fails', () => {
			const cachedRepos = [{ _id: 'cached-1', repoName: 'CachedRepo' }];
			sessionStorage.setItem('repositories', JSON.stringify(cachedRepos));

			const results: unknown[] = [];

			service.getRepositories().subscribe({
				next: r => results.push(r),
				error: () => results.push('ERROR')
			});

			const req = httpController.expectOne('http://localhost:8080/api/repository/');
			req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

			// The error handler reads from sessionStorage and emits the cached value
			expect(results).toEqual([cachedRepos]);
		});

		it('should emit empty array when sessionStorage is empty and HTTP call fails', () => {
			sessionStorage.removeItem('repositories');

			const results: unknown[] = [];

			service.getRepositories().subscribe({
				next: r => results.push(r),
				error: () => results.push('ERROR')
			});

			const req = httpController.expectOne('http://localhost:8080/api/repository/');
			req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

			// The error handler falls back to sessionStorage (empty) and emits []
			expect(results).toEqual([[]]);
		});

	});

	// ----------------------------------------------------------------
	// Error classification: 401/403 cleared vs transient error retained
	// ----------------------------------------------------------------
	describe('getRepositories error classification', () => {

		it('should clear to empty on 401/403 (auth failure, no spinner hang)', () => {
			// Prior good data exists so we can prove it is NOT retained on auth failure
			sessionStorage.setItem('repositories', JSON.stringify([{ _id: '1', repoName: 'CachedRepo' }]));

			const results: unknown[] = [];

			service.getRepositories().subscribe({
				next: r => results.push(r),
				error: () => results.push('ERROR')
			});

			const req = httpController.expectOne('http://localhost:8080/api/repository/');
			req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

			// 401/403 are treated as legitimately empty — the stale cache must NOT be served
			expect(results).toEqual([[]]);
		});

		it('should clear to empty on 403 (auth failure)', () => {
			sessionStorage.setItem('repositories', JSON.stringify([{ _id: '1', repoName: 'CachedRepo' }]));

			const results: unknown[] = [];

			service.getRepositories().subscribe({
				next: r => results.push(r),
				error: () => results.push('ERROR')
			});

			const req = httpController.expectOne('http://localhost:8080/api/repository/');
			req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });

			expect(results).toEqual([[]]);
		});

		it('should retain the last good cached list on a transient 500 and not emit an error', () => {
			const cachedRepos = [{ _id: 'cached-1', repoName: 'CachedRepo' }];
			sessionStorage.setItem('repositories', JSON.stringify(cachedRepos));

			const results: unknown[] = [];

			service.getRepositories().subscribe({
				next: r => results.push(r),
				error: () => results.push('ERROR')
			});

			const req = httpController.expectOne('http://localhost:8080/api/repository/');
			req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

			// Transient errors must NOT masquerade as an empty project — the last good list is retained
			expect(results).toEqual([cachedRepos]);
		});

		it('should retain the last good cached list on a network error (status 0)', () => {
			const cachedRepos = [{ _id: 'cached-1', repoName: 'CachedRepo' }];
			sessionStorage.setItem('repositories', JSON.stringify(cachedRepos));

			const results: unknown[] = [];

			service.getRepositories().subscribe({
				next: r => results.push(r),
				error: () => results.push('ERROR')
			});

			const req = httpController.expectOne('http://localhost:8080/api/repository/');
			req.error(new ProgressEvent('network error'));

			// Network failures (status 0) are transient — the cached list is retained
			expect(results).toEqual([cachedRepos]);
		});

		it('should emit the fresh list on success (unchanged behavior)', () => {
			const fresh = [{ _id: '2', repoName: 'FreshRepo' }];
			sessionStorage.setItem('repositories', JSON.stringify([{ _id: '1', repoName: 'Stale' }]));

			const results: unknown[] = [];

			service.getRepositories().subscribe(r => results.push(r));

			const req = httpController.expectOne('http://localhost:8080/api/repository/');
			req.flush(fresh);

			// A successful response overwrites any cached value
			expect(results).toEqual([fresh]);
			expect(JSON.parse(sessionStorage.getItem('repositories')!)).toEqual(fresh);
		});

	});


});

