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



});

