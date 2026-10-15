import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { StoryService } from './story.service';
import { onActionTrigger } from './action-trigger';

describe('StoryService', () => {

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
			const service = TestBed.inject(StoryService);
			expect(service).toBeTruthy();
		});
	});

	describe('action channels', () => {
		it('delivers every repeated rename request to its consumer', () => {
			const service = TestBed.inject(StoryService);
			const handler = vi.fn();
			TestBed.runInInjectionContext(() => onActionTrigger(service.renameStoryTrigger, handler));

			service.renameStoryEmit('Title', 'Body');
			service.renameStoryEmit('Title', 'Body');
			TestBed.flushEffects();

			expect(handler.mock.calls).toEqual([[{ newStoryTitle: 'Title', newStoryDescription: 'Body' }], [{ newStoryTitle: 'Title', newStoryDescription: 'Body' }]]);
		});
	});
});
