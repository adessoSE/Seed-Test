import { defineConfig, devices } from '@playwright/test';
import { BASE_URL, STORAGE_STATE_PATH } from './helpers/config';

// WHY: one worker and no full parallelism: all specs share one backend, one test user and one rate-limited API.
export default defineConfig({
	testDir: './specs',
	outputDir: './test-results',
	// Run specs that execute a Cucumber run against a real site override this with test.setTimeout(180_000)
	timeout: 60_000,
	expect: { timeout: 10_000 },
	fullyParallel: false,
	workers: 1,
	retries: 0,
	forbidOnly: !!process.env.CI,
	reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
	globalSetup: './global-setup.ts',
	use: {
		baseURL: BASE_URL,
		storageState: STORAGE_STATE_PATH,
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
