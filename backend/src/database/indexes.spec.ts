// src/database/indexes.spec.ts

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { MongoServerError, type Db } from 'mongodb';
import { ensureIndexes } from './indexes.js';

// --- Mock Db: createIndex/dropIndex/indexes mocks per collection name, created on first access (no indexes by default) ---

const { collections, mockDb } = vi.hoisted(() => {
	const collections = new Map<string, { createIndex: ReturnType<typeof vi.fn>; dropIndex: ReturnType<typeof vi.fn>; indexes: ReturnType<typeof vi.fn> }>();
	const mockDb = {
		collection: vi.fn((name: string) => {
			if (!collections.has(name))
				collections.set(name, { createIndex: vi.fn().mockResolvedValue('ok'), dropIndex: vi.fn().mockResolvedValue({}), indexes: vi.fn().mockResolvedValue([]) });
			return collections.get(name)!;
		})
	};
	return { collections, mockDb };
});

/** Returns the createIndex/dropIndex mocks for one collection. */
function indexesOf(name: string): { createIndex: Mock; dropIndex: Mock; indexes: Mock } {
	return mockDb.collection(name) as unknown as { createIndex: Mock; dropIndex: Mock; indexes: Mock };
}

/** Makes every unique index build on the collection fail the way MongoDB does when legacy rows already collide. */
function failUniqueBuilds(name: string) {
	indexesOf(name).createIndex.mockImplementation(async (_keys: unknown, options?: { unique?: boolean }) => {
		if (options?.unique)
			throw new MongoServerError({ message: 'E11000 duplicate key error collection', code: 11000 });
		return 'ok';
	});
}

const UNIQUE_EMAIL_OPTIONS = { unique: true, partialFilterExpression: { email: { $type: 'string' } } };

describe('ensureIndexes', () => {
	let warn: Mock;

	beforeEach(() => {
		collections.clear();
		vi.clearAllMocks();
		vi.spyOn(console, 'log').mockImplementation(() => undefined);
		warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Repositories', () => {
		it('creates a multikey index on stories for the per-request story lookup in the authorize middleware', async () => {
			await ensureIndexes(mockDb as unknown as Db);

			expect(indexesOf('Repositories').createIndex).toHaveBeenCalledWith({ stories: 1 });
		});

		it('creates a unique owner+repoName index limited to custom (db) repositories', async () => {
			await ensureIndexes(mockDb as unknown as Db);

			expect(indexesOf('Repositories').createIndex).toHaveBeenCalledWith(
				{ owner: 1, repoName: 1 },
				{
					name: 'owner_repoName_unique_db',
					unique: true,
					partialFilterExpression: { owner: { $type: 'objectId' }, repoType: 'db' }
				}
			);
		});

		it('warns and keeps setting up when legacy data already violates the repository unique index', async () => {
			failUniqueBuilds('Repositories');

			await expect(ensureIndexes(mockDb as unknown as Db)).resolves.toBeUndefined();

			expect(warn).toHaveBeenCalledWith(expect.stringContaining('Repositories'));
			// The User indexes after it must still be created
			expect(indexesOf('User').createIndex).toHaveBeenCalled();
		});
	});

	describe('User.email', () => {
		it('drops the old non-unique email index before creating the unique one', async () => {
			indexesOf('User').indexes.mockResolvedValue([{ name: 'email_1', key: { email: 1 } }]);

			await ensureIndexes(mockDb as unknown as Db);

			const user = indexesOf('User');
			expect(user.dropIndex).toHaveBeenCalledWith('email_1');
			expect(user.dropIndex.mock.invocationCallOrder[0]).toBeLessThan(user.createIndex.mock.invocationCallOrder[0]);
		});

		it('keeps an existing unique partial email index, so a rerun never leaves e-mails unprotected', async () => {
			indexesOf('User').indexes.mockResolvedValue([{ name: 'email_1', key: { email: 1 }, ...UNIQUE_EMAIL_OPTIONS }]);

			await ensureIndexes(mockDb as unknown as Db);

			expect(indexesOf('User').dropIndex).not.toHaveBeenCalled();
		});

		it('does not drop anything when there is no email index yet', async () => {
			await ensureIndexes(mockDb as unknown as Db);

			expect(indexesOf('User').dropIndex).not.toHaveBeenCalled();
		});

		it('creates a unique email index that ignores GitHub-only stubs with a null email', async () => {
			await ensureIndexes(mockDb as unknown as Db);

			expect(indexesOf('User').createIndex).toHaveBeenCalledWith({ email: 1 }, UNIQUE_EMAIL_OPTIONS);
		});

		it('falls back to a non-unique email index when legacy duplicates block the unique build, and warns', async () => {
			failUniqueBuilds('User');

			await ensureIndexes(mockDb as unknown as Db);

			expect(indexesOf('User').createIndex).toHaveBeenLastCalledWith({ email: 1 });
			expect(warn).toHaveBeenCalledWith(expect.stringContaining('User'));
		});

		it('rethrows non-duplicate index errors instead of falling back', async () => {
			indexesOf('User').createIndex.mockRejectedValue(new Error('not authorized'));

			await expect(ensureIndexes(mockDb as unknown as Db)).rejects.toThrow('not authorized');
			expect(warn).not.toHaveBeenCalled();
		});
	});

	describe('Stories', () => {
		it('keeps issue_number non-unique (ADR-0001 rejected a unique index there)', async () => {
			await ensureIndexes(mockDb as unknown as Db);

			expect(indexesOf('Stories').createIndex).toHaveBeenCalledWith({ issue_number: 1 });
			const uniqueCalls = indexesOf('Stories').createIndex.mock.calls.filter(([, options]) => options?.unique);
			expect(uniqueCalls).toHaveLength(0);
		});
	});
});
