import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ScenarioService } from './scenario.service';
import { onActionTrigger } from './action-trigger';

describe('ScenarioService', () => {

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
			const service = TestBed.inject(ScenarioService);
			expect(service).toBeTruthy();
		});
	});

	describe('storyStatusChangeEmit', () => {
		it('queues the story status for connected consumers', () => {
			const service = TestBed.inject(ScenarioService);
			const received: unknown[] = [];
			TestBed.runInInjectionContext(() => onActionTrigger(service.storyStatusChangeTrigger, payload => received.push(payload)));

			service.storyStatusChangeEmit('a', false);
			TestBed.flushEffects();

			expect(received).toEqual([{ storyId: 'a', lastTestPassed: false }]);
		});
	});
});
