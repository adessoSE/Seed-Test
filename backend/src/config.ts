import { z } from 'zod';
import { AppError } from './helpers/AppError.js';

/**
 * Validation results for a single environment variable.
 * Used to report field-level errors before throwing the aggregated error.
 */
interface ValidationError {
	name: string;
	message: string;
}

/**
 * Zod schema for all Seed-Test backend configuration.
 * Required variables are enforced at runtime by validateConfig().
 * Optional variables receive sensible defaults.
 */
const envSchema = z.object({
	DATABASE_URI: z.string().min(1, 'DATABASE_URI is required'),
	ENCRYPTION_SECRET: z.string().regex(/^[0-9a-f]{64}$/i,
		'ENCRYPTION_SECRET must be a 64-character hex string'),
	JIRA_SECRET: z.string().min(1, 'JIRA_SECRET is required'),
	JIRA_SALT: z.string().min(1, 'JIRA_SALT is required'),
	SESSION_SECRET: z.string().min(1, 'SESSION_SECRET is required in production').optional(),
	PORT: z.coerce.number().default(8080),
	FRONTEND_URL: z.string().optional(),
	COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
	MAX_SAVED_REPORTS: z.coerce.number().default(10),
	REPORT_DELETION_TIME: z.coerce.number().default(5),
	GITHUB_CLIENT_ID: z.string().optional(),
	GITHUB_CLIENT_SECRET: z.string().optional(),
	EMAIL_AUTH: z.string().optional(),
	EMAIL_PW: z.string().optional(),
	EMAIL_HOST: z.string().optional(),
	EMAIL_PORT: z.coerce.number().optional(),
	TESTACCOUNT_REPO: z.string().optional(),
	TESTACCOUNT_NAME: z.string().optional(),
	TESTACCOUNT_TOKEN: z.string().optional()
}).refine((data) => {
	// SESSION_SECRET is only required in production
	// NODE_ENV is set to 'test' in vitest, 'production' on deployed instances
	if (process.env.NODE_ENV === 'production' && !data.SESSION_SECRET)
		return false;
	return true;
}, { message: 'SESSION_SECRET is required in production' });

/**
 * Cached validated config. Set the first time validateConfig() is called.
 * Configured via lazy getter so reading it triggers validation automatically
 * if validateConfig() hasn't been called yet.
 * Exported for dependent modules to access validated values.
 */
export const validatedConfig = {
	get value(): z.infer<typeof envSchema> | null {
		// Auto-trigger validation on first access — ensures validateConfig()
		// was called before this getter is used, but falls through gracefully
		// if validation has already populated the cache.
		if (_cached === null)
			validateConfig();
		return _cached;
	},
	set value(v: z.infer<typeof envSchema> | null) {
		_cached = v;
	}
};

let _cached: z.infer<typeof envSchema> | null = null;

/**
 * Reads and validates all Seed-Test environment variables against the schema.
 * Returns the validated config object or exits with an aggregated error
 * listing every missing/invalid variable at once — never just the first.
 * Must be called explicitly at startup (from startServer in server.ts).
 * Safe to call multiple times — returns the cached result on subsequent calls.
 */
export function validateConfig(): z.infer<typeof envSchema> {
	if (_cached) return _cached;

	const raw: Record<string, unknown> = {};
	const allKeys = new Set([
		'DATABASE_URI', 'ENCRYPTION_SECRET', 'JIRA_SECRET', 'JIRA_SALT',
		'SESSION_SECRET', 'PORT', 'FRONTEND_URL', 'COOKIE_SAMESITE',
		'MAX_SAVED_REPORTS', 'REPORT_DELETION_TIME',
		'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET',
		'EMAIL_AUTH', 'EMAIL_PW', 'EMAIL_HOST', 'EMAIL_PORT',
		'TESTACCOUNT_REPO', 'TESTACCOUNT_NAME', 'TESTACCOUNT_TOKEN'
	]);

	for (const key of allKeys)
		raw[key] = process.env[key];

	const result = envSchema.safeParse(raw);

	if (result.success) {
		_cached = result.data;
		console.log('[config] Configuration validated successfully');
		return result.data;
	}

	// Aggregate ALL validation errors for a single clear startup message
	const errors: ValidationError[] = [];
	for (const issue of result.error.issues) {
		const path = issue.path.join('.');
		const message = issue.message;
		if (path)
			errors.push({ name: path, message });
		else
			errors.push({ name: '_global', message });
	}

	// Collect all environment variable names that are currently set (non-empty)
	const presentVars: string[] = [];
	for (const key of allKeys) {
		const val = process.env[key];
		if (val) presentVars.push(key);
	}

	const lines: string[] = [
		'FATAL: Invalid configuration. The following issues must be fixed:',
		'',
		'  Errors:',
		...errors.map((e) => `    - ${e.name}: ${e.message}`),
		...presentVars.length ? [
			'',
			'  Set variables (present):',
			...presentVars.map((v) => `    - ${v}=<set>`)
		] : [
			'',
			'  Set variables: none'
		],
		'',
		'  Required: DATABASE_URI, ENCRYPTION_SECRET (64-char hex), JIRA_SECRET, JIRA_SALT',
		'  Production only: SESSION_SECRET',
		'',
		'Fix these issues and restart the server.'
	];

	const message = lines.join('\n');

	console.error(message);
	process.exit(1);
}

/**
 * Throws AppError notImplemented if GitHub OAuth is not configured.
 * Checks the validated config object directly — no process.env access.
 * Use this in controllers that depend on GitHub OAuth credentials.
 * @param config - The validated config object from validateConfig(), or null if not yet validated.
 * @throws AppError with status 501 when GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET
 *         is missing from the validated config.
 */
export function requireGithub(config: z.infer<typeof envSchema> | null): void {
	if (!config?.GITHUB_CLIENT_ID || !config.GITHUB_CLIENT_SECRET)
		throw AppError.notImplemented(
			'GitHub OAuth is not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.');
}

