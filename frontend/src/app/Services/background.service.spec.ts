import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BackgroundService } from './background.service';
import { onActionTrigger } from './action-trigger';

describe('BackgroundService', () => {

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [HttpClientTestingModule, MatSnackBarModule]
		});
		sessionStorage.setItem('url_backend', 'http://localhost:8080/api');
	});
	afterEach(() => {
		sessionStorage.removeItem('url_backend');
	});


	describe('create', () => {
		it('should be created', () => {
			const service = TestBed.inject(BackgroundService);
			expect(service).toBeTruthy();
		});
	});

	describe('action channels', () => {
		it('delivers every repeated apply-changes request to its consumer', () => {
			const service = TestBed.inject(BackgroundService);
			const handler = vi.fn();
			TestBed.runInInjectionContext(() => onActionTrigger(service.applyChangesBackgroundTrigger, handler));

			service.applyBackgroundChanges('centrally');
			TestBed.flushEffects();
			service.applyBackgroundChanges('centrally');
			TestBed.flushEffects();

			expect(handler.mock.calls).toEqual([['centrally'], ['centrally']]);
		});
	});
});
