import { TestBed } from '@angular/core/testing';
import { createEnvironmentInjector, EnvironmentInjector, signal } from '@angular/core';
import { ActionTrigger, onActionTrigger } from './action-trigger';

describe('action-trigger', () => {

	describe('onActionTrigger', () => {
		it('runs the handler once per emission, even for an identical repeated payload', () => {
			const trigger = new ActionTrigger<string>();
			const handler = vi.fn();
			TestBed.runInInjectionContext(() => onActionTrigger(trigger, handler));

			trigger.emit('same');
			TestBed.flushEffects();
			trigger.emit('same');
			TestBed.flushEffects();

			// Regression: a null-reset payload signal dropped repeated requests; a counter that is never
			// reset re-fired on every later change. One emission must mean exactly one handler call.
			expect(handler).toHaveBeenCalledTimes(2);
			expect(handler).toHaveBeenNthCalledWith(1, 'same');
			expect(handler).toHaveBeenNthCalledWith(2, 'same');
		});

		it('does not replay emissions made before the consumer was registered', () => {
			const trigger = new ActionTrigger<string>();
			trigger.emit('earlier request');

			const handler = vi.fn();
			TestBed.runInInjectionContext(() => onActionTrigger(trigger, handler));
			TestBed.flushEffects();

			// Regression: a re-created editor replayed the last request because the payload stayed set.
			expect(handler).not.toHaveBeenCalled();
		});

		it('delivers every emission of a synchronous burst, in order', () => {
			const trigger = new ActionTrigger<number>();
			const handler = vi.fn();
			TestBed.runInInjectionContext(() => onActionTrigger(trigger, handler));

			// Regression: a status loop emitted several changes in one tick; a single payload slot kept only the last.
			trigger.emit(1);
			trigger.emit(2);
			trigger.emit(3);
			TestBed.flushEffects();

			expect(handler.mock.calls.map(call => call[0])).toEqual([1, 2, 3]);
		});

		it('delivers each emission to every registered consumer', () => {
			const trigger = new ActionTrigger<string>();
			const first = vi.fn();
			const second = vi.fn();
			TestBed.runInInjectionContext(() => {
				onActionTrigger(trigger, first);
				onActionTrigger(trigger, second);
			});

			trigger.emit('a');
			TestBed.flushEffects();

			expect(first).toHaveBeenCalledWith('a');
			expect(second).toHaveBeenCalledWith('a');
		});

		it('stops delivering to a consumer once its owner is destroyed', () => {
			const trigger = new ActionTrigger<string>();
			const handler = vi.fn();
			const owner = createEnvironmentInjector([], TestBed.inject(EnvironmentInjector));
			owner.runInContext(() => onActionTrigger(trigger, handler));

			owner.destroy();
			trigger.emit('after destroy');
			TestBed.flushEffects();

			expect(handler).not.toHaveBeenCalled();
		});

		it('reads signals inside the handler untracked, so a selection change does not re-run it', () => {
			const trigger = new ActionTrigger<string>();
			const selection = signal('first');
			const seen: string[] = [];
			TestBed.runInInjectionContext(() => onActionTrigger(trigger, () => seen.push(selection())));

			trigger.emit('request');
			TestBed.flushEffects();
			selection.set('second');
			TestBed.flushEffects();

			// Regression: reading the selection inside the effect re-applied the old option on every selection change.
			expect(seen).toEqual(['first']);
		});
	});

	describe('onActionTrigger error isolation', () => {
		it('still delivers the rest of a batch when one handler call throws', () => {
			const trigger = new ActionTrigger<number>();
			const handler = vi.fn((payload: number) => {
				if (payload === 1) throw new Error('handler failed');
			});
			TestBed.runInInjectionContext(() => onActionTrigger(trigger, handler));

			trigger.emit(1);
			trigger.emit(2);
			trigger.emit(3);
			try {
				TestBed.flushEffects();
			} catch {
				// The failure is surfaced to Angular's error handling; the assertion below checks delivery
			}

			// Regression: splice(0) took the whole batch first, so a throw dropped payloads 2 and 3.
			expect(handler.mock.calls.map(call => call[0])).toEqual([1, 2, 3]);
		});
	});
});
