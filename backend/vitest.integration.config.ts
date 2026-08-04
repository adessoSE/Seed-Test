import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import path from 'path';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');

	return {
		test: {
			globals: true,
			fileParallelism: false,
			include: ['src/**/*.itest.ts'],
			coverage: {
				provider: 'v8',
				reporter: ['text', 'json', 'html'],
			},
			env: {
				...env,
				NODE_ENV: 'test',
				INTEGRATION_DATABASE_URI: env.INTEGRATION_DATABASE_URI,
			},
			// Longer timeout because real MongoDB queries + teardown take more time
			testTimeout: 45_000,
		},
		resolve: {
			alias: {
				'@shared': path.resolve(import.meta.dirname, '../shared/src'),
			},
		},
	};
});
