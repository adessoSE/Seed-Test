import { logger } from '../logging';

// A very simple, in-memory promise-based queue.
export class JobQueue {
	private queue: (() => Promise<any>)[] = [];
	private isProcessing = false;

	/**
   * Adds a task to the queue.
   * @param task A function that returns a Promise.
   */
	add(task: () => Promise<any>) {
		this.queue.push(task);
		this.processNext();
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
			logger.error(`A job in the queue failed: ${error}`);
		} finally {
			this.isProcessing = false;
			this.processNext(); // Check for the next item in the queue
		}
	}
}