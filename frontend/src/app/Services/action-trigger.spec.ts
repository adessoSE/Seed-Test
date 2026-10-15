import { TestBed } from '@angular/core/testing';
import { createEnvironmentInjector, EnvironmentInjector, signal } from '@angular/core';
import { ActionTrigger, onActionTrigger, onCounterAction } from './action-trigger';

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

	describe('onCounterAction', () => {
		it('runs the handler once per counter bump with the current payload', () => {
			const counter = signal(0);
			const payload = signal<string | null>(null);
			const handler = vi.fn();
			TestBed.runInInjectionContext(() => onCounterAction(counter, () => payload(), handler));

			payload.set('saveScenario');
			counter.update(n => n + 1);
			TestBed.flushEffects();

			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler).toHaveBeenCalledWith('saveScenario');
		});

		it('does not replay a counter bump that happened before registration', () => {
			const counter = signal(3);
			const payload = signal<string | null>('stale');
			const handler = vi.fn();
			TestBed.runInInjectionContext(() => onCounterAction(counter, () => payload(), handler));
			TestBed.flushEffects();

			expect(handler).not.toHaveBeenCalled();
		});

		it('does not run the handler when only the payload changes without a counter bump', () => {
			const counter = signal(0);
			const payload = signal<string | null>(null);
			const handler = vi.fn();
			TestBed.runInInjectionContext(() => onCounterAction(counter, () => payload(), handler));

			payload.set('changed');
			TestBed.flushEffects();

			expect(handler).not.toHaveBeenCalled();
		});
	});
});
