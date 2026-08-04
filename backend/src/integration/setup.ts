/**
 * Integration test helper — connects to the real MongoDB at INTEGRATION_DATABASE_URI
 * and provides per-file setup/teardown.
 *
 * SECURITY: Host-Whitelist-Guard — die URI wird vor dem Verbinden auf lokale Hosts
 * geprüft. Remote-Hosts (Produktion, Atlas, CI) werden HART abgelehnt, weil die
 * Suite Collections leert.
 *
 * Option A chosen (see report): tests create their own MongoClient and select
 * `Seed_itest` explicitly, bypassing DbConnector entirely. This is the least
 * invasive approach because:
 *   1. It requires zero changes to DbConnector.ts — no risk of breaking the
 *      689 existing unit tests that mock getConnection().
 *   2. DbConnector.establishConnection() is called by production code paths
 *      (import-export.service.ts) — adding an optional parameter there changes
 *      the mock surface for every existing test.
 *   3. Integration tests are inherently different from unit tests — they own
 *      their connection lifecycle and should not share state with the app's
 *      singleton connection.
 *
 * Each test file MUST:
 *   1. Call createClient() in its own beforeAll
 *   2. Register its own beforeEach to clear the collections it touches
 *   3. Call closeClient() in its own afterAll
 * File-level isolation (not module-level singletons) keeps suites order-agnostic.
 */
import { MongoClient, type Db, ObjectId } from 'mongodb';
import { type UserDoc, type RepositoryDoc, type StoryDoc } from '../types/mongo.types.js';
import type { Workgroup } from '../services/workgroup.service.js';
import type { ReportDoc } from '../types/report.types.js';

/** Allowed host patterns — nur lokale/adapter addresses sind sicher. */
const ALLOWED_HOSTS: ReadonlySet<string> = new Set([
	'localhost',
	'127.0.0.1',
	'::1',
	'[::1]',
	'mongodb',       // Docker-Compose-Servicename
	'seedmongodb',   // Docker-Compose-Servicename aus diesem Projekt
	'host.docker.internal'
]);

/**
 * Extrahiert den Host aus einer MongoDB-URI und prüft, ob er auf der Whitelist steht.
 * Unterstützt beide URI-Schemata: mongodb:// und mongodb+srv://.
 * Wirft einen Fehler VOR dem Verbindungsaufbau, wenn der Host nicht erlaubt ist.
 */
function assertLocalHost(uri: string): void {
	let host: string;
	if (uri.startsWith('mongodb+srv://')) {
		// mongodb+srv://user:pass@hostname.mongodb.net/...
		// Der Host ist der erste Teil nach dem @
		const atIndex = uri.indexOf('@');
		if (atIndex === -1) throw new Error(`Invalid mongodb+srv URI: no @ found in "${uri.slice(0, 50)}..."`);
		const afterAt = uri.slice(atIndex + 1);
		// Nächster Slash oder Fragezeichen beendet den Host
		const hostEnd = afterAt.search(/[?/]/);
		host = hostEnd === -1 ? afterAt : afterAt.slice(0, hostEnd);
	} else {
		// mongodb://user:pass@host:port/...
		// Extrahiere den Host-Teil der Authority
		const atIndex = uri.indexOf('@');
		const afterAt = atIndex === -1 ? uri.slice('mongodb://'.length) : uri.slice(atIndex + 1);
		const hostEnd = afterAt.search(/[:?/]/);
		host = hostEnd === -1 ? afterAt : afterAt.slice(0, hostEnd);
	}

	const isAllowed = ALLOWED_HOSTS.has(host)
		|| host.startsWith('localhost:')
		|| host.startsWith('127.0.0.1:')
		|| host.startsWith('[::1]:');

	if (!isAllowed)
		throw new Error(
			`Refusing to run integration tests against a non-local database: ${host}.\n`
			+ 'Integration tests write to and clear collections — they must never run\n'
			+ 'against a shared or production cluster.\n'
			+ '\n'
			+ 'Set INTEGRATION_DATABASE_URI to a local MongoDB, e.g.\n'
			+ '  mongodb://SeedAdmin:SeedTest@localhost:27017\n'
		);
}

/**
 * Shared collection names — import these so file-level beforeEach
 * calls use exactly the same strings the services use.
 */
export const COLLECTIONS = {
	User: 'User',
	Repositories: 'Repositories',
	Stories: 'Stories',
	CustomBlocks: 'CustomBlocks',
	Workgroups: 'Workgroups',
	ReportData: 'ReportData',
	Reports: 'Reports',
	PwResetRequests: 'PwResetRequests'
} as const;

/**
 * Creates a MongoClient connected to the test database.
 * Liest INTEGRATION_DATABASE_URI (nicht DATABASE_URI), um zu verhindern,
 * dass versehentlich die Produktionsdatenbank aus .env getroffen wird.
 * Führt den Host-Whitelist-Guard AUS vor MongoClient.connect().
 * Uses a 3-second serverSelectionTimeout for fast skip when no MongoDB is reachable.
 * Throws on failure — caller should use tryCreateClient() for safe skips.
 */
export async function createClient(): Promise<{ client: MongoClient; db: Db }> {
	// INTEGRATION_DATABASE_URI — nie DATABASE_URI, damit .env nicht die Produktion trifft
	const uri = process.env.INTEGRATION_DATABASE_URI ?? 'mongodb://SeedAdmin:SeedTest@localhost:27017';

	// Host-Guard MUSS vor connect() stehen
	assertLocalHost(uri);

	const client = await MongoClient.connect(uri, {
		serverSelectionTimeoutMS: 3000,
		maxPoolSize: 5
	});

	const db = client.db('Seed_itest');

	await db.admin().ping();

	return { client, db };
}

/**
 * Tries to create a client, returning null if the database is unreachable.
 * Falls der Host-Guard greift (Remote-URI), wird der Fehler NICHT abgefangen —
 * Remote-Hosts müssen HART failen, nicht skippen.
 * Call this from beforeAll — if null, skip all tests with a clear message.
 */
/**
 * Tries to create a client, returning null only if the database is UNREACHABLE.
 * Wenn der Host-Guard greift (Remote-URI per INTEGRATION_DATABASE_URI), wird der
 * Fehler NICHT abgefangen — die Test-Datei muss dann hart failen.
 * Call this from beforeAll — if null, skip all tests with a clear message.
 */
export async function tryCreateClient(): Promise<{ client: MongoClient; db: Db } | null> {
	try {
		return await createClient();
	} catch {
		return null;
	}
}

/**
 * Assert-funktion für Test-Dateien: prüft, ob der Host-Guard gegriffen hätte.
 * Wird vor tryCreateClient() aufgerufen, damit Remote-URI nicht im Catch
 * verschwinden, sondern hart failen.
 * Wirft sofort, wenn INTEGRATION_DATABASE_URI auf einen Remote-Host zeigt.
 */
export function assertLocalUri(): void {
	const uri = process.env.INTEGRATION_DATABASE_URI ?? 'mongodb://SeedAdmin:SeedTest@localhost:27017';
	assertLocalHost(uri);
}

/** Message printed when no MongoDB is reachable. */
export const SKIP_MESSAGE = 'Integration tests require a running MongoDB — run \'docker compose up -d seedmongodb\'';

/**
 * Closes the client connection. Safe to call multiple times.
 */
export async function closeClient(client: MongoClient | null): Promise<void> {
	if (client) 
		await client.close();
	
}

/**
 * Clears specified collections — call from beforeEach.
 * @param db The test database handle.
 * @param names Collection names to clear. Empty array = clear everything.
 */
export async function clearCollections(db: Db, names: string[]): Promise<void> {
	for (const name of names) 
		await db.collection(name).deleteMany({});
	
}

/**
 * Seeds a user document and returns its _id as a string.
 */
export async function seedUser(db: Db, overrides: Partial<UserDoc> = {}): Promise<string> {
	const doc: UserDoc = {
		email: 'owner@test.de',
		password: '$2b$10$dummyhash',
		...overrides
	};
	const result = await db.collection<UserDoc>(COLLECTIONS.User).insertOne(doc);
	return result.insertedId.toHexString();
}

/**
 * Seeds a repository owned by the given userId.
 * Returns the raw doc so callers can inspect _id, owner, stories, groups.
 */
export async function seedRepo(
	db: Db,
	ownerId: string,
	overrides: Partial<RepositoryDoc> = {}
): Promise<RepositoryDoc & { _id: ObjectId }> {
	const doc: RepositoryDoc = {
		owner: new ObjectId(ownerId),
		repoName: 'Integration Test Repo',
		stories: [],
		repoType: 'db',
		groups: [],
		...overrides
	};
	const result = await db.collection<RepositoryDoc>(COLLECTIONS.Repositories).insertOne(doc);
	return { ...doc, _id: result.insertedId };
}

/**
 * Seeds a story document and returns the full doc with its _id.
 */
export async function seedStory(
	db: Db,
	repoId: string,
	overrides: Partial<StoryDoc> = {}
): Promise<StoryDoc & { _id: ObjectId }> {
	const doc: StoryDoc = {
		title: 'Integration Test Story',
		description: 'Auto-seeded for integration tests',
		scenarios: [],
		story_id: 1,
		storySource: 'db',
		oneDriver: false,
		lastTestPassed: false,
		...overrides
	};
	const result = await db.collection<StoryDoc>(COLLECTIONS.Stories).insertOne(doc);

	// Also push the story ref into the repo's stories array (simulates what the controller does)
	await db.collection<RepositoryDoc>(COLLECTIONS.Repositories).updateOne(
		{ _id: new ObjectId(repoId) },
		{ $push: { stories: result.insertedId } }
	);

	return { ...doc, _id: result.insertedId };
}

/**
 * Seeds a group inside a repository's groups array.
 * Returns the ObjectId assigned to the new group.
 */
export async function seedGroup(
	db: Db,
	repoId: string,
	memberStoryIds: string[],
	name = 'Test Group'
): Promise<ObjectId> {
	const groupId = new ObjectId();
	await db.collection<RepositoryDoc>(COLLECTIONS.Repositories).updateOne(
		{ _id: new ObjectId(repoId) },
		{
			$push: {
				groups: {
					_id: groupId,
					name,
					member_stories: memberStoryIds.map(id => new ObjectId(id)),
					isSequential: false,
					xrayTestSet: false
				}
			}
		}
	);
	return groupId;
}

/**
 * Seeds a workgroup for a given repo, with the specified members.
 */
export async function seedWorkgroup(
	db: Db,
	repoId: string,
	members: { email: string; canEdit: boolean }[]
): Promise<void> {
	const { ObjectId } = await import('mongodb');
	await db.collection<Workgroup>(COLLECTIONS.Workgroups).insertOne({
		name: 'ITest WG',
		owner: members[0]?.email ?? 'owner@test.de',
		Repo: new ObjectId(repoId),
		Members: members
	});
}

/**
 * Seeds a user who is NOT the owner, for membership tests.
 */
export async function seedAdditionalUser(db: Db, email: string): Promise<string> {
	const result = await db.collection<UserDoc>(COLLECTIONS.User).insertOne({
		email,
		password: '$2b$10$dummyhash'
	});
	return result.insertedId.toHexString();
}

/**
 * Seeds a report document linked to a story.
 * Returns the full report with _id.
 */
export async function seedReport(
	db: Db,
	storyId: string,
	overrides: Partial<ReportDoc> = {}
): Promise<ReportDoc & { _id: ObjectId }> {
	const doc: ReportDoc = {
		reportName: `test-report-${Date.now()}`,
		reportTime: Date.now(),
		mode: 1 as unknown as ReportDoc['mode'], // STORY mode
		status: true,
		featureId: storyId,
		// smallReport must be a string per shared model, but the type accepts ObjectId | string
		...overrides
	};
	const result = await db.collection<ReportDoc>(COLLECTIONS.ReportData).insertOne(doc);
	return { ...doc, _id: result.insertedId };
}

/**
 * Seeds the border group if not already set up — this sets up the
 * `border` collection if needed (some tests use it).
 * Returns the number of seeded items.
 */
export async function getCollectionCounts(db: Db): Promise<Record<string, number>> {
	const counts: Record<string, number> = {};
	for (const [key, name] of Object.entries(COLLECTIONS)) 
		counts[key] = await db.collection(name).countDocuments();
	
	return counts;
}
