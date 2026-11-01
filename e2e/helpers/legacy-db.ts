import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { Db, MongoClient as MongoClientType, ObjectId as ObjectIdType } from 'mongodb';
import { E2E_ROOT, FIXTURES_DATA_DIR } from './config';

// WHY: mongodb lives in the workspace root node_modules, not in e2e/; createRequire resolves it from there
const requireFromRoot = createRequire(path.resolve(E2E_ROOT, '..', 'package.json'));
const { MongoClient, ObjectId } = requireFromRoot('mongodb') as {
	MongoClient: typeof MongoClientType;
	ObjectId: typeof ObjectIdType;
};

/** Connection string of the local e2e Mongo replica set (Podman container seedtest-e2e-mongo). */
const LEGACY_DB_URI = 'mongodb://127.0.0.1:27017/?directConnection=true';

/** Database the backend writes to in the e2e stack. */
const LEGACY_DB_NAME = 'Seed';

/** Hosts this helper may connect to. */
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost']);

/** Story document as stored in the JSON fixture (Mongo Extended JSON for ids; other fields kept as-is). */
export type LegacyStoryDoc = Record<string, unknown> & { title: string };

/**
 * Throws unless the URI points at a local host. Called before every connection.
 * WHY: this helper inserts and edits raw documents, bypassing the backend's validation. It is test-only and must
 * never touch a real database (for example an Atlas cluster in backend/.env).
 * @param uri Connection string to check.
 */
function assertLocalUri(uri: string): void {
	const host = new URL(uri).hostname;
	if (!LOCAL_HOSTS.has(host))
		throw new Error(`legacy-db: refusing to connect to non-local host "${host}"`);
}

/**
 * Opens a client on the local e2e database.
 * @returns Connected client; the caller must close it.
 */
async function connect(): Promise<{ client: MongoClientType; db: Db }> {
	assertLocalUri(LEGACY_DB_URI);
	const client = await MongoClient.connect(LEGACY_DB_URI);
	return { client, db: client.db(LEGACY_DB_NAME) };
}

/**
 * Reads the legacy story fixture (documents written by older Seed-Test versions).
 * @returns All documents of seed-stories.json, unmodified.
 */
export function readLegacyStories(): LegacyStoryDoc[] {
	return JSON.parse(readFileSync(path.join(FIXTURES_DATA_DIR, 'seed-stories.json'), 'utf8')) as LegacyStoryDoc[];
}

/**
 * Returns the fixture document with the given title. Throws when the fixture has no such story.
 * @param title Story title as stored in the fixture.
 * @returns A fresh copy of the fixture document.
 */
export function legacyStory(title: string): LegacyStoryDoc {
	const doc = readLegacyStories().find(story => story.title === title);
	if (!doc) throw new Error(`legacy-db: no fixture story titled "${title}"`);
	return doc;
}

/**
 * Converts Mongo Extended JSON `{ $oid }` into fresh ObjectIds. Other values, including nulls, pass through unchanged.
 * WHY: the fixture ids would collide with earlier inserts; one map per call keeps repeated references consistent.
 * @param value Any JSON value from the fixture.
 * @param ids Map from fixture hex id to the fresh ObjectId.
 * @returns The value with every `$oid` replaced.
 */
function revive(value: unknown, ids: Map<string, ObjectIdType>): unknown {
	if (Array.isArray(value)) return value.map(item => revive(item, ids));
	if (value === null || typeof value !== 'object') return value;
	const record = value as Record<string, unknown>;
	if (typeof record.$oid === 'string') {
		const hex = record.$oid;
		if (!ids.has(hex)) ids.set(hex, new ObjectId());
		return ids.get(hex);
	}
	return Object.fromEntries(Object.entries(record).map(([key, item]) => [key, revive(item, ids)]));
}

/**
 * Inserts legacy story documents into a project, as an older Seed-Test version would have stored them.
 * Appends the new story ids to the repository's `stories` array (same shape as insertStoryIdIntoRepo).
 * Irreversible from the test's point of view: the stories stay until the project is deleted, because
 * deleteRepository removes every story listed in `stories`.
 * @param repoId Project (repository) id as a hex string.
 * @param docs Story documents to insert, usually taken from readLegacyStories().
 * @returns The ids of the inserted stories in insert order.
 */
export async function insertLegacyStories(repoId: string, docs: LegacyStoryDoc[]): Promise<string[]> {
	const { client, db } = await connect();
	try {
		const ids = new Map<string, ObjectIdType>();
		const revived = docs.map(doc => revive(doc, ids) as Record<string, unknown> & { _id: ObjectIdType });
		await db.collection('Stories').insertMany(revived);
		const storyIds = revived.map(doc => doc._id);
		// $addToSet like insertStoryIdIntoRepo, so a repeated insert never lists a story twice
		await db.collection('Repositories').updateOne(
			{ _id: new ObjectId(repoId) },
			{ $addToSet: { stories: { $each: storyIds } } }
		);
		return storyIds.map(id => id.toHexString());
	} finally {
		await client.close();
	}
}
