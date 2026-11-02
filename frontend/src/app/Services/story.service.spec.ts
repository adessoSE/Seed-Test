import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Story } from '@seed-test/shared/models/Story';
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

	describe('updateStory', () => {
		it('sends version 0 for a legacy story loaded without a version, so the backend still checks it', () => {
			const service = TestBed.inject(StoryService);
			const http = TestBed.inject(HttpTestingController);
			service.updateStory({ _id: 's1', title: 'T' } as Story).subscribe();
			expect(http.expectOne(req => req.method === 'PUT').request.body.version).toBe(0);
		});
	});

	describe('storyUnique', () => {
		let button: HTMLButtonElement;

		beforeEach(() => {
			button = document.createElement('button');
			button.id = 'submitStoryUniqueTest';
			button.disabled = true;
			document.body.appendChild(button);
		});
		afterEach(() => {
			button.remove();
		});

		it('keeps the button disabled for a whitespace-only title', () => {
			const service = TestBed.inject(StoryService);

			service.storyUnique('submitStoryUniqueTest', '   ', []);

			expect(button.disabled).toBe(true);
		});

		it('enables the button for a unique non-blank title', () => {
			const service = TestBed.inject(StoryService);

			service.storyUnique('submitStoryUniqueTest', 'Unique title', []);

			expect(button.disabled).toBe(false);
		});
	});
});
