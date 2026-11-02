import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ExampleService } from './example.service';
import { onActionTrigger } from './action-trigger';

describe('ExampleService', () => {

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
			const service = TestBed.inject(ExampleService);
			expect(service).toBeTruthy();
		});
	});

	describe('action channels', () => {
		it('delivers every repeated new-example request to its consumer', () => {
			const service = TestBed.inject(ExampleService);
			const handler = vi.fn();
			TestBed.runInInjectionContext(() => onActionTrigger(service.newExampleTrigger, handler));

			service.newExampleEmit('value');
			service.newExampleEmit('value');
			TestBed.flushEffects();

			expect(handler.mock.calls).toEqual([['value'], ['value']]);
		});
	});
});
