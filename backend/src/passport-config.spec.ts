import { describe, it, expect, vi } from 'vitest';
import bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';
import type { PassportStatic } from 'passport';
import type { User } from '@seed-test/shared/models/User.js';
import initialize from './passport-config.js';

// Captures the verify callback that initialize() hands to passport-local
const { captured } = vi.hoisted(() => ({
	captured: { verify: undefined as undefined | ((email: string, password: string, done: (...args: unknown[]) => void) => void) }
}));

vi.mock('passport-local', () => ({
	Strategy: class {
		constructor(_options: unknown, verify: (email: string, password: string, done: (...args: unknown[]) => void) => void) {
			captured.verify = verify;
		}
	}
}));

const sha256Hex = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

/**
 * Runs the local strategy against a stored user and a submitted password.
 * Returns the done() spy once passport has been answered.
 */
async function runLocalStrategy(storedUser: Partial<User> | null, submitted: string) {
	const passport = { use: vi.fn(), serializeUser: vi.fn(), deserializeUser: vi.fn() };
	initialize(passport as unknown as PassportStatic, vi.fn().mockResolvedValue(storedUser), vi.fn());

	const verify = captured.verify;
	if (!verify) throw new Error('passport-local strategy was not registered');

	const done = vi.fn();
	verify('user@example.com', submitted, done);
	await vi.waitFor(() => expect(done).toHaveBeenCalled());
	return done;
}

describe('passport local strategy', () => {
	// Regression-relevant: the client sends a SHA-256 digest; a legacy account stores bcrypt(plaintext), so the
	// digest can never match. The strategy must say so, otherwise the client cannot tell legacy from wrong password.
	it('flags a legacy account (no hashVersion) when the digest does not match', async () => {
		const stored = await bcrypt.hash('legacyPassword', 4);

		const done = await runLocalStrategy({ _id: 'u1', password: stored, transitioned: false }, sha256Hex('legacyPassword'));

		expect(done).toHaveBeenCalledWith(null, false, { message: 'Password incorrect', code: 'LEGACY_PASSWORD' });
	});

	// Regression: transitioned === true is not proof of the digest format. An account migrated by the old login
	// code has transitioned: true but still stores bcrypt(plaintext), so only hashVersion 2 may skip the legacy flag.
	it('flags an old-migrated account (transitioned true, no hashVersion) as legacy', async () => {
		const stored = await bcrypt.hash('legacyPassword', 4);

		const done = await runLocalStrategy({ _id: 'u1', password: stored, transitioned: true }, sha256Hex('legacyPassword'));

		expect(done).toHaveBeenCalledWith(null, false, { message: 'Password incorrect', code: 'LEGACY_PASSWORD' });
	});

	it('does not flag a hashVersion 2 account on a wrong password', async () => {
		const stored = await bcrypt.hash(sha256Hex('rightPassword'), 4);

		const done = await runLocalStrategy({ _id: 'u1', password: stored, transitioned: true, hashVersion: 2 }, sha256Hex('wrongPassword'));

		expect(done).toHaveBeenCalledWith(null, false, { message: 'Password incorrect' });
	});

	it('accepts the plaintext password of a legacy account (fallback request)', async () => {
		const stored = await bcrypt.hash('legacyPassword', 4);
		const storedUser = { _id: 'u1', password: stored, transitioned: false } as Partial<User>;

		const done = await runLocalStrategy(storedUser, 'legacyPassword');

		expect(done).toHaveBeenCalledWith(null, storedUser);
	});
});
