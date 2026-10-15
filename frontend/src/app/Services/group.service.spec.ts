import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { GroupService } from './group.service';
import { onActionTrigger } from './action-trigger';

describe('GroupService', () => {

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
			const service = TestBed.inject(GroupService);
			expect(service).toBeTruthy();
		});
	});

	describe('action channels', () => {
		it('delivers every repeated delete-group request to its consumer', () => {
			const service = TestBed.inject(GroupService);
			const handler = vi.fn();
			TestBed.runInInjectionContext(() => onActionTrigger(service.deleteGroupTrigger, handler));
			const values = { repo_id: 'r1', group_id: 'g1' };

			service.deleteGroupEvent(values);
			service.deleteGroupEvent(values);
			TestBed.flushEffects();

			expect(handler.mock.calls).toEqual([[values], [values]]);
		});
	});
});
