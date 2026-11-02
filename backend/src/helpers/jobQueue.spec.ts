import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../logging', () => ({
	logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }
}));

import { JobQueue } from './jobQueue.js';
import { logger } from '../logging.js';

describe('JobQueue', () => {
	let queue: JobQueue;

	beforeEach(() => {
		vi.clearAllMocks();
		queue = new JobQueue();
	});

	it('should execute a single task', async () => {
		const task = vi.fn().mockResolvedValue('done');

		queue.add(task);

		// Wait for microtask queue to flush
		await new Promise(resolve => setTimeout(resolve, 10));

		expect(task).toHaveBeenCalledOnce();
		expect(logger.info).toHaveBeenCalledWith('Job finished successfully.');
	});

	it('should execute tasks sequentially', async () => {
		const order: number[] = [];

		queue.add(async () => {
			await new Promise(resolve => setTimeout(resolve, 20));
			order.push(1);
		});
		queue.add(async () => {
			order.push(2);
		});

		// Wait for both tasks
		await new Promise(resolve => setTimeout(resolve, 60));

		expect(order).toEqual([1, 2]);
	});

	it('should continue processing after a task fails', async () => {
		const secondTask = vi.fn().mockResolvedValue('ok');

		queue.add(async () => { throw new Error('boom'); });
		queue.add(secondTask);

		await new Promise(resolve => setTimeout(resolve, 30));

		expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('boom'));
		expect(secondTask).toHaveBeenCalledOnce();
	});

	it('should handle empty queue gracefully', async () => {
		// Adding and processing completes without error
		const task = vi.fn().mockResolvedValue(undefined);
		queue.add(task);

		await new Promise(resolve => setTimeout(resolve, 10));

		expect(task).toHaveBeenCalledOnce();
	});
});
