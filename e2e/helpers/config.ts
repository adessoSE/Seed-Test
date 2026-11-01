import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Frontend origin the browser tests navigate to. Override with E2E_BASE_URL for a non-default stack. */
export const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:4200';

/** Backend API root (including /api). Override with E2E_API_URL. */
export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:8080/api';

/** Root of the e2e package (the directory that holds playwright.config.ts). */
export const E2E_ROOT = path.resolve(here, '..');

/** Git-ignored directory for the saved session and the test account. */
export const AUTH_DIR = path.join(E2E_ROOT, '.auth');

/** Session written by global-setup and loaded as storageState by every test. */
export const STORAGE_STATE_PATH = path.join(AUTH_DIR, 'user.json');

/** Test account (plaintext password, git-ignored) written by global-setup. */
export const ACCOUNT_PATH = path.join(AUTH_DIR, 'account.json');

/** Versioned sample data used by import specs. */
export const FIXTURES_DATA_DIR = path.join(E2E_ROOT, 'fixtures-data');

/**
 * Origins whose console errors count as runtime errors: the frontend and the backend it calls.
 * WHY: a failed API call logs its console error under the API origin, so the backend origin must count too.
 */
export const APP_ORIGINS: ReadonlySet<string> = new Set([new URL(BASE_URL).origin, new URL(API_URL).origin]);

/** Version of the backend under test, read from backend/package.json so the reported version cannot drift. */
const BACKEND_VERSION = (JSON.parse(readFileSync(path.join(E2E_ROOT, '..', 'backend', 'package.json'), 'utf8')) as { version: string }).version;

/** Backend and client keys the frontend reads from localStorage; under ng serve there is no /backendInfo route. */
export const BACKEND_INFO: Record<string, string> = {
	url_backend: API_URL,
	clientId: 'e2e',
	version: BACKEND_VERSION,
	gecko_enabled: 'false',
	chromium_enabled: 'true',
	edge_enabled: 'false',
	webkit_enabled: 'false',
	gecko_emulators: '[]',
	chromium_emulators: '[]',
	edge_emulators: '[]',
	playwright_emulators: '[]',
};
