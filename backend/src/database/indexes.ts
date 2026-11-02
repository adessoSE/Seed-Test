import { type Db, type CreateIndexesOptions, MongoServerError } from 'mongodb';
import { isDuplicateKeyError } from '../utils/mongo-errors.js';

/**
 * Creates a unique index, or warns and returns false when legacy data already violates it.
 * A failed unique build must not abort the whole setup: the app can still run without the constraint,
 * but the duplicates have to be cleaned up before the index can exist.
 * @param db The database instance.
 * @param collectionName The collection that receives the index.
 * @param keys The index key pattern.
 * @param options Index options; `unique: true` is added here.
 * @returns True when the unique index was created, false when duplicates blocked it.
 */
async function createUniqueIndex(
	db: Db,
	collectionName: string,
	keys: Record<string, 1>,
	options: CreateIndexesOptions
): Promise<boolean> {
	try {
		await db.collection(collectionName).createIndex(keys, { ...options, unique: true });
		return true;
	} catch (error) {
		if (!isDuplicateKeyError(error))
			throw error;
		// CASE 1: existing rows already share these values, so MongoDB refuses the unique build.
		console.warn(`\x1b[33m WARNING: unique index ${JSON.stringify(keys)} on collection ${collectionName} was NOT created: duplicate data exists. Remove the duplicates and rerun the database setup.\x1b[0m`);
		return false;
	}
}

/**
 * Creates indexes for common query patterns.
 * createIndex() is idempotent — safe to call on every setup run.
 * @param db The database instance.
 * @throws Any index error other than a duplicate-key violation of a new unique index.
 */
export async function ensureIndexes(db: Db): Promise<void> {
	console.log('\nCreating indexes...');

	// Stories — looked up by external story_id (numeric) and Jira issue_number
	await db.collection('Stories').createIndex({ story_id: 1 });
	// Non-unique on purpose: ADR-0001 rejected a unique index on issue_number
	await db.collection('Stories').createIndex({ issue_number: 1 });

	// Repositories — filtered by owner on every repo-list load; compound for name+type lookups
	await db.collection('Repositories').createIndex({ owner: 1 });
	await db.collection('Repositories').createIndex({ repoName: 1, repoType: 1 });
	// Repositories — the authorize middleware looks up the repository by story id on every story request (multikey)
	await db.collection('Repositories').createIndex({ stories: 1 });
	// Only custom (db) repositories are unique per owner. Jira and GitHub repositories are stored with owner ''
	// and may share names, so the partial filter keeps them out of the constraint (matches the createRepo check).
	await createUniqueIndex(db, 'Repositories', { owner: 1, repoName: 1 }, {
		name: 'owner_repoName_unique_db',
		partialFilterExpression: { owner: { $type: 'objectId' }, repoType: 'db' }
	});

	// Workgroups — looked up by linked repo; Members.email for membership checks
	await db.collection('Workgroups').createIndex({ Repo: 1 });
	await db.collection('Workgroups').createIndex({ 'Members.email': 1 });

	// ReportData — filtered by storyId on report loading; reportName for named lookups
	await db.collection('ReportData').createIndex({ storyId: 1 });
	await db.collection('ReportData').createIndex({ reportName: 1 });

	// CustomBlocks — filtered by repositoryId on block loading + cascade deletes
	await db.collection('CustomBlocks').createIndex({ repositoryId: 1 });

	// User — email lookups on every login, register, password reset
	// Unique so the database rejects a second account with the same e-mail, even when two registrations race past the app-level check.
	// Partial: GitHub-only stub users have email null and must not collide with each other.
	// Drop stale unique index from previous runs if options changed
	// A previous non-unique 'email_1' has the same key, so the unique build would conflict with it. Only drop when 'email_1'
	// is not already the unique partial index, so rerunning the setup never opens a window without the constraint.
	const emailIndex = (await db.collection('User').indexes().catch((error: unknown) => {
		// NamespaceNotFound (26): the collection does not exist yet, so there is nothing to drop
		if (error instanceof MongoServerError && error.code === 26)
			return [];
		throw error;
	})).find(i => i.name === 'email_1');
	if (emailIndex && !(emailIndex.unique && emailIndex.partialFilterExpression))
		await db.collection('User').dropIndex('email_1');
	const uniqueEmail = await createUniqueIndex(db, 'User', { email: 1 }, {
		partialFilterExpression: { email: { $type: 'string' } }
	});
	// Legacy duplicates block the unique build; fall back to the plain index so login lookups stay indexed
	if (!uniqueEmail)
		await db.collection('User').createIndex({ email: 1 });

	// PwResetRequests — looked up by uuid (reset link) and email (cleanup)
	await db.collection('PwResetRequests').createIndex({ uuid: 1 });
	await db.collection('PwResetRequests').createIndex({ email: 1 });

	// GridFS.files — file listing filtered by metadata.repoId
	await db.collection('GridFS.files').createIndex({ 'metadata.repoId': 1 });

	console.log('\x1b[32m Indexes ensured! \x1b[0m');
}
