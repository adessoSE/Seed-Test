import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { config, firstValueFrom } from 'rxjs';
import { vi } from 'vitest';
import { ProjectService } from './project.service';
import { onActionTrigger } from './action-trigger';
import { RepositoryContainer } from '@seed-test/shared/models/RepositoryContainer';


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

	/**
     * Helper that kicks off the fetch and flushes the HTTP response,
     * returning the signal's final value.
     */
	function fetchAndFlush(repos: unknown[]): { signalValue: unknown[] } {
		service.getRepositories().subscribe();
		const req = httpController.expectOne('http://localhost:8080/api/repository/');
		req.flush(repos);
		return { signalValue: service.repositoriesSignal() };
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
			service.getRepositories().subscribe(r => results2.push(r)); // shares the in-flight request

			const req = httpController.expectOne('http://localhost:8080/api/repository/');
			expect(req.request.method).toBe('GET');

			const mockRepos = [{ _id: '1', repoName: 'RepoA' }];
			req.flush(mockRepos);

			// Regression: the second caller used to receive EMPTY and never saw the list.
			expect(results1).toEqual([mockRepos]);
			expect(results2).toEqual([mockRepos]);
		});

		it('should give a late caller the cached list via firstValueFrom without a second HTTP request', async () => {
			const mockRepos = [{ _id: '1', repoName: 'RepoA' }];
			service.getRepositories().subscribe();
			httpController.expectOne('http://localhost:8080/api/repository/').flush(mockRepos);

			// Regression: after a successful fetch, firstValueFrom(getRepositories()) threw EmptyError,
			// which made parent.component.ts clear stories and groups.
			const late = await firstValueFrom(service.getRepositories());

			expect(late).toEqual(mockRepos);
			httpController.expectNone('http://localhost:8080/api/repository/');
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
			const initial = fetchAndFlush([{ _id: '1', repoName: 'Old' }]);
			expect(initial.signalValue).toEqual([{ _id: '1', repoName: 'Old' }]);

			service.refreshRepositories();

			// subscribe() required — the Observable is cold and only issues the HTTP request when subscribed
			service.getRepositories().subscribe();
			const req2 = httpController.expectOne('http://localhost:8080/api/repository/');
			expect(req2.request.method).toBe('GET');
			req2.flush([{ _id: '2', repoName: 'New' }]);
		});

		it('should return fresh data to subscriber after refresh', () => {
			const initialValues = fetchAndFlush([{ _id: '1', repoName: 'Old' }]);
			expect(initialValues.signalValue).toEqual([{ _id: '1', repoName: 'Old' }]);

			service.refreshRepositories();

			const freshResults: unknown[] = [];
			service.getRepositories().subscribe(r => freshResults.push(r));
			const req2 = httpController.expectOne('http://localhost:8080/api/repository/');
			req2.flush([{ _id: '2', repoName: 'New' }]);
			// Only emits the fresh response — signal is updated inside switchMap but not part of the chain.
			expect(freshResults).toEqual([[{ _id: '2', repoName: 'New' }]]);
		});
	});

	describe('out-of-order responses (#049)', () => {

		it('should keep the newer list when an older response arrives after a refresh', () => {
			const older = [{ _id: '1', repoName: 'Before create' }];
			const newer = [{ _id: '1', repoName: 'Before create' }, { _id: '2', repoName: 'Just created' }];

			// Request A is started before the refresh (e.g. an in-flight list fetch during create).
			service.getRepositories().subscribe();
			const reqOld = httpController.expectOne('http://localhost:8080/api/repository/');

			// The refresh after create starts request B, which must win.
			service.updateRepositoryEmitter();
			const reqNew = httpController.expectOne('http://localhost:8080/api/repository/');

			reqNew.flush(newer);
			// Regression: the stale response used to overwrite repositoriesSignal with the old list.
			reqOld.flush(older);

			expect(service.repositoriesSignal()).toEqual(newer);
			expect(JSON.parse(sessionStorage.getItem('repositories')!)).toEqual(newer);
		});
	});

	describe('getRepositoriesEmitter + updateRepositoryEmitter', () => {

		it('should invalidate cache when getRepositoriesEmitter is called', () => {
			fetchAndFlush([{ _id: '1', repoName: 'A' }]);

			// Emit triggers refreshRepositories internally — then call getRepositories manually
			service.getRepositoriesEmitter();
			service.getRepositories();
			httpController.expectOne('http://localhost:8080/api/repository/').flush([{ _id: '2', repoName: 'B' }]);

			service.getRepositories().subscribe();
			httpController.expectNone('http://localhost:8080/api/repository/');
		});

		it('should invalidate cache when updateRepositoryEmitter is called', () => {
			fetchAndFlush([{ _id: '1', repoName: 'A' }]);

			// Emit triggers refreshRepositories internally — then call getRepositories manually
			service.updateRepositoryEmitter();
			service.getRepositories();
			httpController.expectOne('http://localhost:8080/api/repository/').flush([{ _id: '2', repoName: 'B' }]);

			service.getRepositories().subscribe();
			httpController.expectNone('http://localhost:8080/api/repository/');
		});
	});

	describe('addRepositoryToCache', () => {

		it('should insert a new repository into the signal so the list is fresh before any async refresh', () => {
			// Seed the signal via the HTTP response (the real way repos enter the signal)
			fetchAndFlush([{ _id: '1', repoName: 'Existing' }]);

			service.addRepositoryToCache({ _id: '2', repoName: 'NewProject', source: 'db' });

			expect(service.repositoriesSignal()).toEqual([
				{ _id: '1', repoName: 'Existing' },
				{ _id: '2', repoName: 'NewProject', source: 'db' }
			]);
		});

		it('should not duplicate a repository that is already present (by _id)', () => {
			fetchAndFlush([{ _id: '1', repoName: 'Existing' }]);

			service.addRepositoryToCache({ _id: '1', repoName: 'Existing', source: 'db' });

			expect(service.repositoriesSignal()).toEqual([{ _id: '1', repoName: 'Existing', source: 'db' }]);
		});

		it('should create a fresh list when signal is empty', () => {
			// Signal defaults to [] — just call addRepositoryToCache directly
			service.addRepositoryToCache({ _id: '9', repoName: 'FirstProject', source: 'db' });

			expect(service.repositoriesSignal()).toEqual([{ _id: '9', repoName: 'FirstProject', source: 'db' }]);
		});

		it('should keep sessionStorage in sync with the signal', () => {
			fetchAndFlush([{ _id: '1', repoName: 'Existing' }]);

			service.addRepositoryToCache({ _id: '2', repoName: 'NewProject', source: 'db' });

			const stored = JSON.parse(sessionStorage.getItem('repositories')!) as Array<{ _id: string }>;
			expect(stored).toEqual([
				{ _id: '1', repoName: 'Existing' },
				{ _id: '2', repoName: 'NewProject', source: 'db' }
			]);
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
	// Signal-based error retention (no more BehaviorSubject)
	// ----------------------------------------------------------------
	describe('signal retains last good value on HTTP error', () => {

		it('should retain signal value when getRepositories HTTP call fails (500)', () => {
			// Seed the signal with good data via a successful fetch
			service.getRepositories().subscribe();
			const req1 = httpController.expectOne('http://localhost:8080/api/repository/');
			req1.flush([{ _id: 'cached-1', repoName: 'CachedRepo' }]);

			// Now trigger a refresh — this clears the in-flight flag
			service.refreshRepositories();

			const results: unknown[] = [];
			service.getRepositories().subscribe({
				next: r => results.push(r),
				error: () => results.push('ERROR')
			});

			const req2 = httpController.expectOne('http://localhost:8080/api/repository/');
			req2.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

			// Transient error — signal retains the last good value from the first fetch
			expect(service.repositoriesSignal()).toEqual([{ _id: 'cached-1', repoName: 'CachedRepo' }]);
		});

		it('should emit empty array when signal is empty and HTTP call fails', () => {
			// Signal is [] by default (no prior fetch)
			const results: unknown[] = [];

			service.getRepositories().subscribe({
				next: r => results.push(r),
				error: () => results.push('ERROR')
			});

			const req = httpController.expectOne('http://localhost:8080/api/repository/');
			req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

			// Signal is empty (was never populated)
			expect(service.repositoriesSignal()).toEqual([]);
		});

	});

	// ----------------------------------------------------------------
	// Error classification: 401/403 cleared vs transient error retained
	// ----------------------------------------------------------------
	describe('getRepositories error classification', () => {

		it('should clear to empty on 401/403 (auth failure, no spinner hang)', () => {
			const results: unknown[] = [];

			service.getRepositories().subscribe({
				next: r => results.push(r),
				error: () => results.push('ERROR')
			});

			const req = httpController.expectOne('http://localhost:8080/api/repository/');
			req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

			// Signal was cleared on 401 — no cached value to retain
			expect(service.repositoriesSignal()).toEqual([]);
		});

		it('should clear to empty on 403 (auth failure)', () => {
			const results: unknown[] = [];

			service.getRepositories().subscribe({
				next: r => results.push(r),
				error: () => results.push('ERROR')
			});

			const req = httpController.expectOne('http://localhost:8080/api/repository/');
			req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });

			expect(service.repositoriesSignal()).toEqual([]);
		});

		it('should retain the last good value on a transient 500 and not clear the signal', () => {
			// Seed the signal with good data first
			service.getRepositories().subscribe();
			const req1 = httpController.expectOne('http://localhost:8080/api/repository/');
			req1.flush([{ _id: 'cached-1', repoName: 'CachedRepo' }]);
			expect(service.repositoriesSignal()).toEqual([{ _id: 'cached-1', repoName: 'CachedRepo' }]);

			// Refresh resets the flag so the second getRepositories() can fire
			service.refreshRepositories();

			const results: unknown[] = [];
			service.getRepositories().subscribe({
				next: r => results.push(r),
				error: () => results.push('ERROR')
			});

			const req2 = httpController.expectOne('http://localhost:8080/api/repository/');
			req2.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

			// Transient errors must NOT masquerade as an empty project — the signal retains the last good list
			expect(service.repositoriesSignal()).toEqual([{ _id: 'cached-1', repoName: 'CachedRepo' }]);
		});

		it('should retain the last good value on a network error (status 0)', () => {
			// Seed the signal with good data first
			service.getRepositories().subscribe();
			const req1 = httpController.expectOne('http://localhost:8080/api/repository/');
			req1.flush([{ _id: 'cached-1', repoName: 'CachedRepo' }]);
			expect(service.repositoriesSignal()).toEqual([{ _id: 'cached-1', repoName: 'CachedRepo' }]);

			// Refresh resets the flag so the second getRepositories() can fire
			service.refreshRepositories();

			const results: unknown[] = [];
			service.getRepositories().subscribe({
				next: r => results.push(r),
				error: () => results.push('ERROR')
			});

			const req2 = httpController.expectOne('http://localhost:8080/api/repository/');
			req2.error(new ProgressEvent('network error'));

			// Network failures (status 0) are transient — the signal retains the last good list
			expect(service.repositoriesSignal()).toEqual([{ _id: 'cached-1', repoName: 'CachedRepo' }]);
		});

		it('should emit the fresh list on success (unchanged behavior)', () => {
			const fresh = [{ _id: '2', repoName: 'FreshRepo' }];
			const old = [{ _id: '1', repoName: 'Stale' }];
			// Seed with old data
			service.getRepositories().subscribe();
			const req1 = httpController.expectOne('http://localhost:8080/api/repository/');
			req1.flush(old);
			expect(service.repositoriesSignal()).toEqual(old);

			// Refresh resets the flag so the second getRepositories() can fire
			service.refreshRepositories();

			const results: unknown[] = [];
			service.getRepositories().subscribe(r => results.push(r));

			const req2 = httpController.expectOne('http://localhost:8080/api/repository/');
			req2.flush(fresh);

			// A successful response overwrites the signal
			expect(service.repositoriesSignal()).toEqual(fresh);
			expect(JSON.parse(sessionStorage.getItem('repositories')!)).toEqual(fresh);
		});

	});

	describe('clearRepositories (logout / account switch in the same tab)', () => {
		const url = 'http://localhost:8080/api/repository/';

		it('should drop the previous user list so the next login fetches its own repositories', () => {
			fetchAndFlush([{ _id: '1', repoName: 'UserA' }]);

			service.clearRepositories();

			// Regression: the shareReplay cache survived logout and replayed user A's list to user B.
			expect(service.repositoriesSignal()).toEqual([]);
			expect(sessionStorage.getItem('repositories')).toBeNull();

			const results: unknown[][] = [];
			service.getRepositories().subscribe(r => results.push(r));
			httpController.expectOne(url).flush([{ _id: '2', repoName: 'UserB' }]);

			expect(results).toEqual([[{ _id: '2', repoName: 'UserB' }]]);
			expect(service.repositoriesSignal()).toEqual([{ _id: '2', repoName: 'UserB' }]);
		});

		it('should ignore a response that was still in flight for the previous session', () => {
			service.getRepositories().subscribe();
			const req = httpController.expectOne(url);

			service.clearRepositories();
			req.flush([{ _id: '1', repoName: 'UserA' }]);

			expect(service.repositoriesSignal()).toEqual([]);
			expect(sessionStorage.getItem('repositories')).toBeNull();
		});
	});

	describe('fire-and-forget emitters (background fetch error handling)', () => {
		const url = 'http://localhost:8080/api/repository/';

		it('should not raise an unhandled RxJS error when the updateRepositoryEmitter fetch fails', async () => {
			const onUnhandled = vi.fn();
			const previous = config.onUnhandledError;
			config.onUnhandledError = onUnhandled;
			try {
				service.updateRepositoryEmitter();
				httpController.expectOne(url).flush('boom', { status: 500, statusText: 'Server Error' });
				await new Promise(resolve => setTimeout(resolve, 0));
				expect(onUnhandled).not.toHaveBeenCalled();
			} finally {
				config.onUnhandledError = previous;
			}
		});

		it('should not raise an unhandled RxJS error when the getRepositoriesEmitter fetch fails', async () => {
			const onUnhandled = vi.fn();
			const previous = config.onUnhandledError;
			config.onUnhandledError = onUnhandled;
			try {
				service.getRepositoriesEmitter();
				httpController.expectOne(url).flush('boom', { status: 500, statusText: 'Server Error' });
				await new Promise(resolve => setTimeout(resolve, 0));
				expect(onUnhandled).not.toHaveBeenCalled();
			} finally {
				config.onUnhandledError = previous;
			}
		});
	});

	// Regression: the rename signal re-set the same mutated object, so a second rename in one modal session was dropped
	describe('renameProjectTrigger', () => {
		it('delivers every emit as a copy, so a re-emitted and mutated object is not dropped', () => {
			const received: RepositoryContainer[] = [];
			TestBed.runInInjectionContext(() => onActionTrigger(service.renameProjectTrigger, proj => { received.push(proj); }));
			const project: RepositoryContainer = { _id: '1', repoName: 'first', source: 'db', canEdit: true };

			service.renameProjectEmitter(project);
			project.repoName = 'second';
			service.renameProjectEmitter(project);
			TestBed.flushEffects();

			expect(received.map(p => p.repoName)).toEqual(['first', 'second']);
			expect(received[0]).not.toBe(project);
		});
	});

	// Regression: the create signal collapsed back-to-back creations into one handler run
	describe('createRepositoryTrigger', () => {
		it('delivers every creation request to connected consumers', () => {
			const received: string[] = [];
			TestBed.runInInjectionContext(() => onActionTrigger(service.createRepositoryTrigger, payload => { received.push(payload.name); }));
			const payload = { repositoryContainer: { _id: 'a', repoName: 'Proj', source: 'db' as const }, name: 'Proj' };

			service.createRepositoryEvent(payload);
			service.createRepositoryEvent(payload);
			TestBed.flushEffects();

			expect(received).toEqual(['Proj', 'Proj']);
		});
	});

});
