import { logger } from '../logging.js';

// A very simple, in-memory promise-based queue.
export class JobQueue {
	private queue: (() => Promise<unknown>)[] = [];
	private isProcessing = false;

	/**
   * Adds a task to the queue.
   * @param task A function that returns a Promise.
   */
	add(task: () => Promise<unknown>) {
		this.queue.push(task);
		void this.processNext();
	}

	private async processNext() {
		if (this.isProcessing || this.queue.length === 0) 
			return;
    
		this.isProcessing = true;
		const task = this.queue.shift(); // Get the next task
		if (!task) return;

		try {
			await task();
			logger.info('Job finished successfully.');
		} catch (error) {
			logger.error(`A job in the queue failed: ${String(error)}`);
		} finally {
			this.isProcessing = false;
			void this.processNext(); // Check for the next item in the queue
		}
	}
}