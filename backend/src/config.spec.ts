import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Type aliases for config values — avoids `import()` in type positions
import type * as configModType from '../src/config.js';
type ConfigResult = ReturnType<typeof configModType.validateConfig>;

// Mock process.exit to prevent Vitest from wrapping it
const mockExit = vi.fn();
let originalExit: typeof process.exit;

function setupMocks(): void {
	mockExit.mockClear();
	originalExit = process.exit;
	Object.defineProperty(process, 'exit', {
		value: mockExit,
		writable: true,
		configurable: true
	});
}

function teardownMocks(): void {
	process.exit = originalExit;
}

describe('config', () => {
	beforeEach(() => {
		vi.resetModules();
		// Reset env for a clean slate
		process.env.DATABASE_URI = 'mongodb://localhost:27017/test';
		process.env.ENCRYPTION_SECRET = 'a'.repeat(64);
		process.env.JIRA_SECRET = 'jira-secret';
		process.env.JIRA_SALT = 'jira-salt';
		process.env.SESSION_SECRET = 'secret';
		process.env.NODE_ENV = 'test';
		// Remove optional vars that have non-default values in .env
		delete process.env.PORT;
		delete process.env.FRONTEND_URL;
		delete process.env.COOKIE_SAMESITE;
		delete process.env.COOKIE_SECURE;
		delete process.env.MAX_SAVED_REPORTS;
		delete process.env.REPORT_DELETION_TIME;
		delete process.env.GITHUB_CLIENT_ID;
		delete process.env.GITHUB_CLIENT_SECRET;
		delete process.env.EMAIL_AUTH;
		delete process.env.EMAIL_PW;
		delete process.env.EMAIL_HOST;
		delete process.env.EMAIL_PORT;
		delete process.env.TESTACCOUNT_REPO;
		delete process.env.TESTACCOUNT_NAME;
		delete process.env.TESTACCOUNT_TOKEN;
		setupMocks();
	});

	afterEach(() => {
		teardownMocks();
	});

	describe('validateConfig', () => {
		it('should return validated config when all required vars are present', async () => {
			const config = await import('../src/config.js');
			const result = config.validateConfig();
			expect(result.DATABASE_URI).toBe('mongodb://localhost:27017/test');
			expect(result.ENCRYPTION_SECRET).toBe('a'.repeat(64));
			expect(result.JIRA_SECRET).toBe('jira-secret');
			expect(result.JIRA_SALT).toBe('jira-salt');
			expect(mockExit).not.toHaveBeenCalled();
		});

		it('should call process.exit(1) for missing DATABASE_URI', async () => {
			delete process.env.DATABASE_URI;
			const config = await import('../src/config.js');
			config.validateConfig();
			expect(mockExit).toHaveBeenCalledWith(1);
		});

		it('should call process.exit(1) for missing ENCRYPTION_SECRET', async () => {
			delete process.env.ENCRYPTION_SECRET;
			const config = await import('../src/config.js');
			config.validateConfig();
			expect(mockExit).toHaveBeenCalledWith(1);
		});

		it('should call process.exit(1) for missing JIRA_SECRET', async () => {
			delete process.env.JIRA_SECRET;
			const config = await import('../src/config.js');
			config.validateConfig();
			expect(mockExit).toHaveBeenCalledWith(1);
		});

		it('should call process.exit(1) for missing JIRA_SALT', async () => {
			delete process.env.JIRA_SALT;
			const config = await import('../src/config.js');
			config.validateConfig();
			expect(mockExit).toHaveBeenCalledWith(1);
		});

		it('should call process.exit(1) for ENCRYPTION_SECRET that is too short', async () => {
			process.env.ENCRYPTION_SECRET = 'abc';
			const config = await import('../src/config.js');
			config.validateConfig();
			expect(mockExit).toHaveBeenCalledWith(1);
		});

		it('should call process.exit(1) for ENCRYPTION_SECRET with invalid hex chars', async () => {
			process.env.ENCRYPTION_SECRET = 'zzzz'.repeat(16);
			const config = await import('../src/config.js');
			config.validateConfig();
			expect(mockExit).toHaveBeenCalledWith(1);
		});

		it('should NOT call process.exit(1) for missing SESSION_SECRET in test mode', async () => {
			process.env.NODE_ENV = 'test';
			delete process.env.SESSION_SECRET;
			const config = await import('../src/config.js');
			const result = config.validateConfig();
			expect(result.SESSION_SECRET).toBeUndefined();
			expect(mockExit).not.toHaveBeenCalled();
		});

		it('should call process.exit(1) for missing SESSION_SECRET in production', async () => {
			process.env.NODE_ENV = 'production';
			delete process.env.SESSION_SECRET;
			const config = await import('../src/config.js');
			config.validateConfig();
			expect(mockExit).toHaveBeenCalledWith(1);
		});

		it('should NOT call process.exit(1) when SESSION_SECRET is set in production', async () => {
			process.env.NODE_ENV = 'production';
			process.env.SESSION_SECRET = 'prod-secret';
			const config = await import('../src/config.js');
			const result = config.validateConfig();
			expect(result.SESSION_SECRET).toBe('prod-secret');
			expect(mockExit).not.toHaveBeenCalled();
		});

		it('should call process.exit(1) for missing SESSION_SECRET when NODE_ENV is unset', async () => {
			delete process.env.NODE_ENV;
			delete process.env.SESSION_SECRET;
			const config = await import('../src/config.js');
			config.validateConfig();
			expect(mockExit).toHaveBeenCalledWith(1);
		});

		it('should parse COOKIE_SECURE=false as the plain-HTTP opt-out', async () => {
			process.env.COOKIE_SECURE = 'false';
			const config = await import('../src/config.js');
			expect(config.validateConfig().COOKIE_SECURE).toBe(false);
		});

		it('should NOT call process.exit(1) for missing SESSION_SECRET with the development opt-in', async () => {
			process.env.NODE_ENV = 'development';
			delete process.env.SESSION_SECRET;
			const config = await import('../src/config.js');
			config.validateConfig();
			expect(mockExit).not.toHaveBeenCalled();
		});

		it('should apply defaults for optional variables', async () => {
			const config = await import('../src/config.js');
			const result = config.validateConfig();
			expect(result.PORT).toBe(8080);
			expect(result.COOKIE_SAMESITE).toBe('lax');
			expect(result.MAX_SAVED_REPORTS).toBe(10);
			expect(result.REPORT_DELETION_TIME).toBe(5);
			expect(mockExit).not.toHaveBeenCalled();
		});

		it('should apply custom PORT from env', async () => {
			process.env.PORT = '3000';
			const config = await import('../src/config.js');
			const result = config.validateConfig();
			expect(result.PORT).toBe(3000);
		});

		it('should aggregate multiple errors in process.exit output', async () => {
			delete process.env.DATABASE_URI;
			delete process.env.JIRA_SECRET;
			process.env.ENCRYPTION_SECRET = 'short';
			const config = await import('../src/config.js');
			config.validateConfig();
			expect(mockExit).toHaveBeenCalledWith(1);
		});

		it('should return cached result on subsequent calls', async () => {
			const config = await import('../src/config.js');
			const result1 = config.validateConfig();
			const result2 = config.validateConfig();
			expect(result1).toBe(result2);
			expect(result1).toBe(config.validatedConfig.value);
		});

		it('should use custom MAX_SAVED_REPORTS when set', async () => {
			process.env.MAX_SAVED_REPORTS = '5';
			const config = await import('../src/config.js');
			const result = config.validateConfig();
			expect(result.MAX_SAVED_REPORTS).toBe(5);
		});
	});

	describe('validatedConfig getter', () => {
		it('should auto-trigger validation on first access if not yet validated', async () => {
			const config = await import('../src/config.js');
			// Access via getter triggers validateConfig() automatically
			const val = config.validatedConfig.value;
			expect(val).not.toBeNull();
			expect(val!.DATABASE_URI).toBe('mongodb://localhost:27017/test');
			expect(mockExit).not.toHaveBeenCalled();
		});

		it('should return cached value after validation', async () => {
			const config = await import('../src/config.js');
			config.validateConfig();
			expect(config.validatedConfig.value).not.toBeNull();
			expect(config.validatedConfig.value).toBe(config.validateConfig());
		});
	});

	describe('requireGithub', () => {
		// Load config dynamically after each beforeEach env reset
		let cfg: ConfigResult;
		// eslint-disable-next-line @typescript-eslint/consistent-type-imports
		let configMod: typeof import('../src/config.js');

		beforeEach(async () => {
			configMod = await import('../src/config.js');
			cfg = configMod.validateConfig();
		});

		it('should throw when GITHUB_CLIENT_ID is missing', async () => {
			expect(() => configMod.requireGithub({
				...cfg,
				GITHUB_CLIENT_ID: undefined as any
			})).toThrow('GitHub OAuth is not configured');
		});

		it('should throw when GITHUB_CLIENT_SECRET is missing', async () => {
			expect(() => configMod.requireGithub({
				...cfg,
				GITHUB_CLIENT_SECRET: undefined as any
			})).toThrow('GitHub OAuth is not configured');
		});

		it('should not throw when both vars are present', async () => {
			const fullCfg = configMod.validateConfig();
			const withGithub = { ...fullCfg, GITHUB_CLIENT_ID: 'client-id', GITHUB_CLIENT_SECRET: 'client-secret' } as ReturnType<typeof configMod.validateConfig>;
			expect(() => configMod.requireGithub(withGithub)).not.toThrow();
		});

		it('should throw when config is null', async () => {
			expect(() => configMod.requireGithub(null)).toThrow('GitHub OAuth is not configured');
		});
	});
});