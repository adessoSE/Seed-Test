/**
 * Integration test helper — starts an isolated MongoDB container via Testcontainers
 * and provides per-file setup/teardown.
 *
 * SECURITY: No host guard needed. Testcontainers starts a fresh container on a random
 * host port, so there is zero risk of touching production or shared databases.
 *
 * The container runs as a ReplicaSet (rs0), enabling MongoDB transactions.
 * Authentication is enabled with a fixed test credential.
 * Uses database 'Seed' — this is the isolated Testcontainers instance, not the
 * production database. The container is ephemeral and runs on a random port.
 *
 * Each test file MUST:
 *   1. Call createClient() or tryCreateClient() in its own beforeAll
 *   2. Register its own beforeEach to clear the collections it touches
 *   3. Call closeClient() in its own afterAll
 * File-level isolation (not module-level singletons) keeps suites order-agnostic.
 */
import { MongoDBContainer, type StartedMongoDBContainer } from '@testcontainers/mongodb';
import { MongoClient, type Db, ObjectId } from 'mongodb';
import { type UserDoc, type RepositoryDoc, type StoryDoc } from '../types/mongo.types.js';
import type { Workgroup } from '../services/workgroup.service.js';
import type { ReportDoc } from '../types/report.types.js';

/** Test credentials embedded in the container. */
const TEST_USER = 'itest';
const TEST_PASSWORD = 'itest123';

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
 * Creates a MongoClient connected to a fresh Testcontainers MongoDB instance.
 * The container runs as a ReplicaSet (rs0), so transactions are supported.
 * Throws on failure — caller should use tryCreateClient() for safe skips.
 * Timeout is high (120 s) to allow for the initial Docker image pull.
 */
export async function createClient(): Promise<{
	client: MongoClient;
	db: Db;
	container: StartedMongoDBContainer;
}> {
	// Start a MongoDB 8 container with auth + ReplicaSet
	const container = await new MongoDBContainer('mongo:8')
		.withUsername(TEST_USER)
		.withPassword(TEST_PASSWORD)
		.withStartupTimeout(120_000)
		.start();

	// directConnection=true forces the Node driver to connect to the single
	// host:port that Testcontainers exposes (container.getMappedPort()).
	// Without it the driver would attempt SRV-style discovery which fails
	// on a random mapped port.
	const baseUri = container.getConnectionString();
	const uri = `${baseUri}&directConnection=true`;

	const client = await MongoClient.connect(uri, {
		serverSelectionTimeoutMS: 10_000,
		maxPoolSize: 5
	});

	// Uses 'Seed' because all services hardcode client.db('Seed') when inside
	// transactions (createStory, createRepo, saveBlock, etc.). Since Testcontainers
	// creates an isolated container on a random port, there is zero risk of touching
	// the production or development database — the container is ephemeral and local.
	const db = client.db('Seed');

	await db.admin().ping();

	return { client, db, container };
}

/**
 * Tries to create a client + container, returning null if the database is unreachable
 * (e.g. Docker is not running or the image cannot be pulled).
 * Call this from beforeAll — if null, skip all tests with a clear message.
 */
export async function tryCreateClient(): Promise<{
	client: MongoClient;
	db: Db;
	container: StartedMongoDBContainer;
} | null> {
	try {
		return await createClient();
	} catch {
		return null;
	}
}

/** Message printed when no MongoDB is reachable. */
export const SKIP_MESSAGE = 'Integration tests require Docker (Testcontainers) — ensure Docker Desktop or Podman Desktop (with Docker API) is running';

/**
 * Closes the client connection and stops the container.
 * Safe to call multiple times passing null values.
 */
export async function closeClient(
	client: MongoClient | null,
	container: StartedMongoDBContainer | null | undefined
): Promise<void> {
	if (client)
		await client.close();

	if (container)
		await container.stop();
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
