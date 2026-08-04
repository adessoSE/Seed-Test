import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
	test: {
		globals: true,
		fileParallelism: false,
		include: ['src/**/*.itest.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
		},
		env: {
			NODE_ENV: 'test',
		},
		// Extra time for Testcontainers to pull the mongo:8 image on first run
		testTimeout: 120_000,
		hookTimeout: 120_000,
	},
	resolve: {
		alias: {
			'@shared': path.resolve(import.meta.dirname, '../shared/src'),
		},
	},
});
