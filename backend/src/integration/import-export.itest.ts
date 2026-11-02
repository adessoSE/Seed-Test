/**
 * Integration tests for the import/export transaction paths.
 *
 * The unit tests mock every service and the MongoDB session entirely.
 * These tests run against a real Testcontainers mongo:8 container
 * configured as a ReplicaSet (rs0), which enables actual MongoDB
 * transactions — including rollback verification.
 *
 * ZIP archives are built in-memory using adm-zip (already a dependency)
 * so no fixture files are needed.
 */
import { type Db, type MongoClient, ObjectId } from 'mongodb';
import type { StartedMongoDBContainer } from '@testcontainers/mongodb';
import AdmZip from 'adm-zip';
import {
	tryCreateClient,
	closeClient,
	clearCollections,
	COLLECTIONS,
	seedUser,
	seedRepo,
	seedStory,
	SKIP_MESSAGE
} from './setup.js';
import type { StoryDoc, RepositoryDoc } from '../types/mongo.types.js';

let container: StartedMongoDBContainer | null = null;
let client: MongoClient | null = null;
let db: Db | null = null;
let _testDb: Db | null = null;
let ownerId: string;
let repoId: string;
let skipTests = false;

// Mock DbConnector so that getConnection() and establishConnection() both
// resolve to the Testcontainers database.
// establishConnection() must return the actual MongoClient because services
// call client.db('Seed') on it for transaction-scoped operations.
vi.mock('../database/DbConnector.js', () => ({
	getConnection: () => {
		if (!_testDb) throw new Error('Test DB not initialised');
		return _testDb;
	},
	establishConnection: vi.fn(async () => {
		if (!client) throw new Error('Test client not initialised');
		return client;
	}),
	closeConnection: vi.fn()
}));

beforeAll(async () => {
	const setup = await tryCreateClient();
	if (!setup) {
		skipTests = true;
		return;
	}
	container = setup.container;
	client = setup.client;
	db = setup.db;
	_testDb = db;
});

beforeEach(async () => {
	if (skipTests || !db)
		return;

	await clearCollections(db, [
		COLLECTIONS.User,
		COLLECTIONS.Repositories,
		COLLECTIONS.Stories,
		COLLECTIONS.CustomBlocks,
		COLLECTIONS.Workgroups,
		COLLECTIONS.ReportData,
		COLLECTIONS.Reports
	]);
	ownerId = await seedUser(db);
	const repo = await seedRepo(db, ownerId);
	repoId = repo._id.toHexString();
});

afterAll(async () => {
	await closeClient(client, container);
});

function checkSkipped(): void {
	if (skipTests)
		throw new Error(SKIP_MESSAGE);
}

// ──────────────────────────────────────────────
// ZIP builders
// ──────────────────────────────────────────────

/** Creates an import ZIP with the given repository, stories, blocks, groups. */
/** Shorthand — items from fixture functions always have a string _id. */
interface FixtureItem extends Record<string, unknown> {
	_id: string;
}

function buildZip(repo: Record<string, unknown>, stories: FixtureItem[], blocks: FixtureItem[], groups: FixtureItem[]): Buffer {
	const zip = new AdmZip();
	zip.addFile('repository.json', Buffer.from(JSON.stringify(repo)));
	for (const s of stories)
		zip.addFile(`stories/${s._id}.json`, Buffer.from(JSON.stringify(s)));
	for (const b of blocks)
		zip.addFile(`blocks/${b._id}.json`, Buffer.from(JSON.stringify(b)));
	for (const g of groups)
		zip.addFile(`groups/${g._id}.json`, Buffer.from(JSON.stringify(g)));
	return zip.toBuffer();
}

/** Builds a minimal repository fixture for ZIP contents.
 * Matches the shape the real exportProject produces — settings and aiConfig
 * are optional and may be absent or partial.
 */
function fixtureRepo(overrides: Record<string, unknown> = {}): FixtureItem {
	const obj: Record<string, unknown> = {
		_id: new ObjectId().toHexString(),
		owner: ownerId,
		repoName: 'ImportedProject',
		stories: [],
		repoType: 'db',
		groups: [],
		...overrides
	};
	return obj as FixtureItem;
}

/** Builds a minimal story fixture. */
function fixtureStory(title: string): FixtureItem {
	const obj: Record<string, unknown> = {
		_id: new ObjectId().toHexString(),
		title,
		body: 'As a user...',
		scenarios: [],
		story_id: Date.now(),
		storySource: 'db',
		oneDriver: false,
		lastTestPassed: false
	};
	return obj as FixtureItem;
}

/** Builds a minimal block fixture. */
function fixtureBlock(name: string): FixtureItem {
	const obj: Record<string, unknown> = {
		_id: new ObjectId().toHexString(),
		name,
		repositoryId: repoId,
		steps: []
	};
	return obj as FixtureItem;
}

/** Builds a minimal group fixture referencing story IDs. */
function fixtureGroup(name: string, storyIds: string[]): FixtureItem {
	const obj: Record<string, unknown> = {
		_id: new ObjectId().toHexString(),
		name,
		member_stories: storyIds,
		isSequential: false,
		xrayTestSet: false
	};
	return obj as FixtureItem;
}

// ──────────────────────────────────────────────
// Import into existing project
// ──────────────────────────────────────────────

describe('import into existing project', () => {
	it('imports stories, blocks, and groups from a valid ZIP', async () => {
		checkSkipped();
		const { importProject } = await import('../services/import-export.service.js');

		const story1 = fixtureStory('Test Story');
		const story2 = fixtureStory('Another Story');
		const block = fixtureBlock('Shared Block');
		const group = fixtureGroup('My Group', [story1._id]);
		const repo = fixtureRepo();

		const zipBuffer = buildZip(repo, [story1, story2], [block], [group]);

		const result = await importProject(
			{ buffer: zipBuffer },
			repoId,
			undefined,
			true,
			ownerId
		);

		expect(result).toEqual({ success: true });

		// Stories should be persisted
		const storyCount = await db!.collection(COLLECTIONS.Stories).countDocuments();
		expect(storyCount).toBeGreaterThanOrEqual(2);

		// Both stories were created via createStory + insertStoryIdIntoRepo
		const persistedRepo = await db!.collection<RepositoryDoc>(COLLECTIONS.Repositories).findOne(
			{ _id: new ObjectId(repoId) }
		);
		expect(persistedRepo!.stories).toHaveLength(2);
	});

	it('uses rename mode when names conflict', async () => {
		checkSkipped();
		const { importProject } = await import('../services/import-export.service.js');

		// Seed an existing story with the same title
		await seedStory(db!, repoId, { title: 'Login Story' });

		const story1 = fixtureStory('Login Story'); // duplicate title
		const repo = fixtureRepo();
		const zipBuffer = buildZip(repo, [story1], [], []);

		const result = await importProject(
			{ buffer: zipBuffer },
			repoId,
			undefined,
			true,  // rename mode
			ownerId
		);

		expect(result).toEqual({ success: true });

		// Should have renamed the imported story
		const stories = await db!.collection<StoryDoc>(COLLECTIONS.Stories).find().toArray();
		const titles = stories.map(s => s.title);
		expect(titles).toContain('Login Story');        // original
		expect(titles).toContain('Login Story_1');       // renamed import
	});
});

// ──────────────────────────────────────────────
// Import as new project
// ──────────────────────────────────────────────

describe('import as new project', () => {
	it('creates repository and imports content', async () => {
		checkSkipped();
		const { importProject } = await import('../services/import-export.service.js');

		const story1 = fixtureStory('Fresh Story');
		const repo = fixtureRepo({ owner: ownerId, repoName: 'FreshProject' });
		const zipBuffer = buildZip(repo, [story1], [], []);

		const result = await importProject(
			{ buffer: zipBuffer },
			undefined,
			'FreshProject',
			true,
			ownerId
		);

		expect(result).toEqual({ success: true });

		// A new repository should exist with the given name
		const repos = await db!.collection<RepositoryDoc>(COLLECTIONS.Repositories).find().toArray();
		const projectRepo = repos.find(r => r.repoName === 'FreshProject');
		expect(projectRepo).toBeDefined();

		// Stories should be linked to the new repo
		const storyCount = await db!.collection(COLLECTIONS.Stories).countDocuments();
		expect(storyCount).toBeGreaterThanOrEqual(1);
	});

	it('rejects import without project name', async () => {
		checkSkipped();
		const { importProject, AppError } = await import('../services/import-export.service.js');

		const repo = fixtureRepo();
		const zipBuffer = buildZip(repo, [], [], []);

		await expect(
			importProject(
				{ buffer: zipBuffer },
				undefined,
				undefined,  // no project name
				true,
				ownerId
			)
		).rejects.toThrow(AppError);
	});
});

// ──────────────────────────────────────────────
// Transaction rollback
// ──────────────────────────────────────────────

describe('transaction rollback', () => {
	it('does not persist anything when import fails mid-transaction (corrupt JSON)', async () => {
		checkSkipped();
		const { importProject } = await import('../services/import-export.service.js');

		const story1 = fixtureStory('Good Story');
		// Corrupt JSON in one entry — JSON.parse throws after the first story
		// has already been created inside the transaction.
		const zip = new AdmZip();
		zip.addFile('repository.json', Buffer.from(JSON.stringify(fixtureRepo())));
		zip.addFile('stories/good.json', Buffer.from(JSON.stringify(story1)));
		zip.addFile('stories/bad.json', Buffer.from('not valid json {{{'));
		const zipBuffer = zip.toBuffer();

		await expect(
			importProject(
				{ buffer: zipBuffer },
				repoId,
				undefined,
				true,
				ownerId
			)
		).rejects.toThrow();

		// Nothing should have been persisted — the transaction was rolled back
		const storyCount = await db!.collection(COLLECTIONS.Stories).countDocuments();
		expect(storyCount).toBe(0);
	});
});
