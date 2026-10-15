import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BlockService } from './block.service';
import { onActionTrigger } from './action-trigger';
import { Block } from '@seed-test/shared/models/Block';
import { StepType } from '@seed-test/shared/models/StepType';

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
