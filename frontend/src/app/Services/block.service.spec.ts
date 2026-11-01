import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BlockService } from './block.service';
import { onActionTrigger } from './action-trigger';
import { Block } from '@seed-test/shared/models/Block';
import { StepType } from '@seed-test/shared/models/StepType';
import { Story } from '@seed-test/shared/models/Story';
import { Scenario } from '@seed-test/shared/models/Scenario';
import { StoryService } from './story.service';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';

describe('BlockService', () => {

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [HttpClientTestingModule, MatSnackBarModule]
		});
		sessionStorage.setItem('url_backend', 'http://localhost:8080/api');
	});
	afterEach(() => {
		sessionStorage.removeItem('url_backend');
	});

	describe('updateReferenceStories', () => {
		const scenarioA = { scenario_id: 1, name: 'A' } as Scenario;
		const scenarioB = { scenario_id: 2, name: 'B' } as Scenario;

		it('sends one PUT per story and writes the returned version back', async () => {
			const service = TestBed.inject(BlockService);
			const storyService = TestBed.inject(StoryService);
			const story = { _id: 's1', version: 2, scenarios: [scenarioA, scenarioB] } as Story;
			const updateSpy = vi.spyOn(storyService, 'updateStory').mockReturnValue(of({ ...story, version: 3 }));
			service.referenceStories = [story];
			service.scenariosToUpdate = [scenarioA, scenarioB];

			service.updateReferenceStories();
			await new Promise(resolve => setTimeout(resolve));

			// Two PUTs with the same version would 409 the second one
			expect(updateSpy).toHaveBeenCalledTimes(1);
			expect(story.version).toBe(3);
		});

		it('shows the conflict message when a story was changed in the meantime', async () => {
			const service = TestBed.inject(BlockService);
			const storyService = TestBed.inject(StoryService);
			const story = { _id: 's1', version: 2, scenarios: [scenarioA] } as Story;
			vi.spyOn(storyService, 'updateStory').mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
			const errorSpy = vi.spyOn(service.notify, 'error').mockImplementation(() => undefined);
			service.referenceStories = [story];
			service.scenariosToUpdate = [scenarioA];

			service.updateReferenceStories();
			await new Promise(resolve => setTimeout(resolve));

			expect(errorSpy).toHaveBeenCalledWith('Story was changed in the meantime. Reload it before saving.');
			expect(story.version).toBe(2);
		});
	});

	describe('create', () => {
		it('should be created', () => {
			const service = TestBed.inject(BlockService);
			expect(service).toBeTruthy();
		});
	});

	describe('action channels', () => {
		it('delivers each add-block request with its full payload, in order', () => {
			const service = TestBed.inject(BlockService);
			const handler = vi.fn();
			TestBed.runInInjectionContext(() => onActionTrigger(service.addBlockToScenarioTrigger, handler));
			const block = { _id: 'b1', name: 'Login' } as Block;

			service.addBlockToScenario(block, 'scenario', 'When', false);
			service.addBlockToScenario(block, 'scenario', 'When', false);
			TestBed.flushEffects();

			expect(handler.mock.calls).toEqual([
				[['scenario', block, 'When', false]],
				[['scenario', block, 'When', false]]
			]);
		});

		it('delivers an unpack request with the block and its step reference', () => {
			const service = TestBed.inject(BlockService);
			const handler = vi.fn();
			TestBed.runInInjectionContext(() => onActionTrigger(service.unpackBlockTrigger, handler));
			const payload = { block: { _id: 'b1', name: 'Login' } as Block, stepReference: { stepType: 'when', id: 1 } as StepType };

			service.unpackBlockEmitter(payload);
			TestBed.flushEffects();

			expect(handler).toHaveBeenCalledWith(payload);
		});
	});
});
