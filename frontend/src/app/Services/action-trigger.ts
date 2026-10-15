import { DestroyRef, EffectRef, Signal, effect, inject, signal, untracked } from '@angular/core';

/**
 * Typed action channel from a service to its consumers.
 *
 * emit() queues the payload for every consumer connected at that moment. Each queued payload is
 * handled exactly once: repeated identical requests and back-to-back requests are neither merged nor
 * dropped, and a consumer created later never sees an earlier request (no replay).
 */
export class ActionTrigger<T> {
	private readonly consumers = new Set<(payload: T) => void>();

	/** Queues the payload for all connected consumers; their handlers run later, inside their effect */
	emit(payload: T): void {
		for (const enqueue of [...this.consumers]) enqueue(payload);
	}

	/**
	 * Connects a queue callback. Returns the disconnect function.
	 * Consumers call this through onActionTrigger; the callback is not meant to be used directly.
	 */
	connect(enqueue: (payload: T) => void): () => void {
		this.consumers.add(enqueue);
		return () => {
			this.consumers.delete(enqueue);
		};
	}
}

/**
 * Runs `handler` once for every payload emitted on `trigger` after this call.
 *
 * Must be called in an injection context (constructor or field initializer). The subscription ends
 * when the owning injector or component is destroyed. The handler runs untracked, so signals it
 * reads do not re-trigger it.
 * @param trigger action channel to listen to
 * @param handler called with each payload, in emission order
 * @returns the underlying effect reference
 */
export function onActionTrigger<T>(trigger: ActionTrigger<T>, handler: (payload: T) => void): EffectRef {
	const queue: T[] = [];
	const pending = signal(0);
	// Connected at registration, so only emissions made after this point are queued (no replay)
	const disconnect = trigger.connect(payload => {
		queue.push(payload);
		pending.update(n => n + 1);
	});
	inject(DestroyRef).onDestroy(disconnect);

	return effect(() => {
		// Only the queue counter is tracked; the payloads themselves are read untracked
		pending();
		untracked(() => {
			// Drains one payload at a time: a handler that emits again queues for the next pass, and a
			// throwing handler must not drop the payloads behind it. The first error is rethrown after the drain
			// so Angular's error handling still sees it.
			let failure: unknown;
			let failed = false;
			while (queue.length)
				try {
					handler(queue.shift()!);
				} catch (error) {
					if (!failed) failure = error;
					failed = true;
				}
			if (failed) throw failure;
		});
	});
}

/**
 * Runs `handler` once per bump of a legacy `signal(0)` counter, with the payload read from a
 * companion signal. Used for ApiService's run/save and copy-step actions, which are not yet
 * ActionTrigger instances.
 *
 * Unlike onActionTrigger, emissions made within one change-detection pass collapse into a single
 * call with the latest payload. Only use it where each user action emits once.
 * @param counter the action's trigger counter
 * @param readPayload reads the action's payload signal (called untracked)
 * @param handler called with the latest payload on each new counter value
 * @returns the underlying effect reference
 */
export function onCounterAction<T>(counter: Signal<number>, readPayload: () => T, handler: (payload: T) => void): EffectRef {
	// Baseline at registration: a counter value that existed before this consumer is never replayed
	let handled = untracked(() => counter());
	return effect(() => {
		const count = counter();
		if (count === handled) return;
		handled = count;
		untracked(() => handler(readPayload()));
	});
}
