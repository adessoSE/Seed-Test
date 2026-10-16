/**
 * Integration tests for write paths that must survive races and partial retries — runs against the real services.
 *
 * The unit tests mock MongoDB entirely, so they never exercise:
 *   - Whether updateStory and updateScenarioList leave server-owned fields and scenario contents alone
 *   - Whether concurrent createScenario calls receive distinct scenario ids
 *   - Whether reorders keep stories and groups that were inserted or deleted concurrently
 *   - Whether deleteStory and deleteReport converge when an earlier attempt already removed part of the data
 *   - Whether the unique indexes from ensureIndexes reject duplicates and tolerate legacy duplicate data
 *
 * These tests seed real documents and then call the ACTUAL service functions,
 * with DbConnector mocked to point at the Testcontainers database.
 */
import { type Db, type MongoClient, ObjectId, type WithId } from 'mongodb';
import type { StartedMongoDBContainer } from '@testcontainers/mongodb';
import {
	tryCreateClient,
	closeClient,
	clearCollections,
	COLLECTIONS,
	seedUser,
	seedRepo,
	seedStory,
	seedGroup,
	SKIP_MESSAGE
} from './setup.js';
import type { Story } from '@seed-test/shared/models/Story.js';
import type { Scenario } from '@seed-test/shared/models/Scenario.js';
import type { Group } from '@seed-test/shared/models/Group.js';
import type { RepositoryDoc, StoryDoc } from '../types/mongo.types.js';
import { emptyScenario } from '../models/emptyScenario.js';
import * as storyService from '../services/story.service.js';
import * as repositoryService from '../services/repository.service.js';
import * as reportService from '../services/report.service.js';
import { ensureIndexes } from '../database/indexes.js';

let container: StartedMongoDBContainer | null = null;
let client: MongoClient | null = null;
let db: Db | null = null;
let _testDb: Db | null = null; // Module-level — DbConnector mock reads from this
let ownerId: string;
let repoId: string;
let skipTests = false;

// Mock DbConnector so that service calls resolve to the Testcontainers database
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
		COLLECTIONS.ReportData,
		COLLECTIONS.Reports,
		'GridFS.files',
		'GridFS.chunks'
	]);
	ownerId = await seedUser(db);
	const repo = await seedRepo(db, ownerId);
	repoId = repo._id.toHexString();
});

afterEach(() => {
	vi.restoreAllMocks();
});

afterAll(async () => {
	await closeClient(client, container);
});

function checkSkipped(): void {
	if (skipTests)
		throw new Error(SKIP_MESSAGE);
}

/** Builds a full scenario with the given id and name, using the same defaults the app uses. */
function makeScenario(id: number, name: string): Scenario {
	return { ...emptyScenario(), scenario_id: id, name };
}

/** Reads a story document straight from the database. Throws when it is missing. */
async function readStory(id: ObjectId): Promise<WithId<StoryDoc>> {
	const story = await db!.collection<StoryDoc>(COLLECTIONS.Stories).findOne({ _id: id });
	if (!story)
		throw new Error(`Story ${id.toHexString()} is missing`);
	return story;
}

/** Reads the seeded repository straight from the database. Throws when it is missing. */
async function readRepo(): Promise<WithId<RepositoryDoc>> {
	const repo = await db!.collection<RepositoryDoc>(COLLECTIONS.Repositories).findOne({ _id: new ObjectId(repoId) });
	if (!repo)
		throw new Error(`Repository ${repoId} is missing`);
	return repo;
}

function hexIds(ids: ObjectId[] | undefined): string[] {
	return (ids ?? []).map(id => id.toHexString());
}

/** Drops a collection (and its indexes) when it exists. Used by the index tests so their unique constraints do not leak. */
async function dropCollectionIfExists(name: string): Promise<void> {
	const existing = await db!.listCollections({ name }).toArray();
	if (existing.length > 0)
		await db!.collection(name).drop();
}

// ──────────────────────────────────────────────
// updateStory keeps server-owned fields
// ──────────────────────────────────────────────

it('updateStory keeps server-owned fields that the request does not send', async () => {
	checkSkipped();
	const story = await seedStory(db!, repoId, { title: 'Old', lastTestPassed: true, oneDriver: true, issue_number: 7 });

	await storyService.updateStory({ _id: story._id.toHexString(), title: 'New', body: 'b', scenarios: [] } as Story);

	const stored = await readStory(story._id);
	expect(stored.title).toBe('New');
	expect(stored.body).toBe('b');
	expect(stored.lastTestPassed).toBe(true);
	expect(stored.oneDriver).toBe(true);
	expect(stored.issue_number).toBe(7);
});

// ──────────────────────────────────────────────
// updateScenarioList only reorders
// ──────────────────────────────────────────────

it('updateScenarioList applies only the order, ignores client contents, keeps unlisted scenarios and drops unknown ids', async () => {
	checkSkipped();
	const story = await seedStory(db!, repoId, {
		scenarios: [makeScenario(1, 'one'), makeScenario(2, 'two'), makeScenario(3, 'three')]
	});

	// Scenario 2 is left out of the list, as if it had been added concurrently. Id 99 does not exist.
	await storyService.updateScenarioList(story._id.toHexString(), [
		makeScenario(3, 'renamed 3'),
		makeScenario(99, 'ghost'),
		makeScenario(1, 'renamed 1')
	]);

	const stored = await readStory(story._id);
	expect(stored.scenarios.map(s => s.scenario_id)).toEqual([3, 1, 2]);
	expect(stored.scenarios.map(s => s.name)).toEqual(['three', 'one', 'two']);
});

// ──────────────────────────────────────────────
// createScenario under concurrency
// ──────────────────────────────────────────────

it('createScenario gives concurrent creates distinct ids that match the stored scenarios', async () => {
	checkSkipped();
	const story = await seedStory(db!, repoId, { scenarios: [makeScenario(1, 'Scenario 1')] });
	const storyId = story._id.toHexString();

	const created = await Promise.all(
		Array.from({ length: 5 }, (_, i) => storyService.createScenario(storyId, `New ${i}`))
	);

	const returnedIds = created.map(s => s.scenario_id);
	const stored = await readStory(story._id);
	const storedIds = stored.scenarios.map(s => s.scenario_id);

	expect(new Set(returnedIds).size).toBe(5);
	expect([...storedIds].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6]);
	for (const id of returnedIds)
		expect(storedIds).toContain(id);
});

it('createScenario stores a name that starts with $ literally', async () => {
	checkSkipped();
	const story = await seedStory(db!, repoId, { scenarios: [makeScenario(1, 'Scenario 1')] });

	const created = await storyService.createScenario(story._id.toHexString(), '$title');

	const stored = await readStory(story._id);
	const storedScenario = stored.scenarios.find(s => s.scenario_id === created.scenario_id);
	expect(created.name).toBe('$title');
	expect(storedScenario?.name).toBe('$title');
});

// ──────────────────────────────────────────────
// updateStoriesArrayInRepo only reorders
// ──────────────────────────────────────────────

it('updateStoriesArrayInRepo applies only the order: a concurrent insert is kept and a concurrent delete is not revived', async () => {
	checkSkipped();
	const a = await seedStory(db!, repoId, { title: 'a' });
	const b = await seedStory(db!, repoId, { title: 'b' });
	const c = await seedStory(db!, repoId, { title: 'c' });

	// Simulates a concurrent create: the story document exists and is added to the repo by insertStoryIdIntoRepo
	const inserted = await db!.collection(COLLECTIONS.Stories).insertOne({ title: 'd', story_id: 4, storySource: 'db', scenarios: [] });
	const dId = inserted.insertedId.toHexString();
	await repositoryService.insertStoryIdIntoRepo(dId, repoId);

	// Simulates a concurrent delete: c is pulled from the repo's stories array
	await db!.collection(COLLECTIONS.Repositories).updateOne(
		{ _id: new ObjectId(repoId) },
		{ $pull: { stories: c._id } }
	);

	const aId = a._id.toHexString();
	const bId = b._id.toHexString();
	const cId = c._id.toHexString();
	await repositoryService.updateStoriesArrayInRepo(repoId, [cId, bId, aId]);

	const repo = await readRepo();
	expect(hexIds(repo.stories)).toEqual([bId, aId, dId]);
});

it('insertStoryIdIntoRepo lists a story once when it is inserted twice', async () => {
	checkSkipped();
	const storyId = new ObjectId().toHexString();

	await repositoryService.insertStoryIdIntoRepo(storyId, repoId);
	await repositoryService.insertStoryIdIntoRepo(storyId, repoId);

	const repo = await readRepo();
	expect(hexIds(repo.stories).filter(id => id === storyId)).toHaveLength(1);
});

// ──────────────────────────────────────────────
// updateStoryGroup is positional
// ──────────────────────────────────────────────

it('updateStoryGroup writes only its own group, so a member added to another group survives', async () => {
	checkSkipped();
	const a = await seedStory(db!, repoId, { title: 'a' });
	const b = await seedStory(db!, repoId, { title: 'b' });
	const g1 = await seedGroup(db!, repoId, [a._id.toHexString()], 'G1');
	const g2 = await seedGroup(db!, repoId, [], 'G2');
	const g1Id = g1.toHexString();
	const g2Id = g2.toHexString();
	const aId = a._id.toHexString();
	const bId = b._id.toHexString();

	await repositoryService.addToStoryGroup(repoId, g2Id, bId);
	await repositoryService.addToStoryGroup(repoId, g2Id, bId);

	let repo = await readRepo();
	expect(hexIds(repo.groups.find(g => g._id?.toHexString() === g2Id)?.member_stories)).toEqual([bId]);

	const renamed: Group = { name: 'renamed', member_stories: [aId], isSequential: false };
	await repositoryService.updateStoryGroup(repoId, g1Id, renamed);

	repo = await readRepo();
	const storedG1 = repo.groups.find(g => g._id?.toHexString() === g1Id);
	const storedG2 = repo.groups.find(g => g._id?.toHexString() === g2Id);
	expect(storedG1?.name).toBe('renamed');
	expect(hexIds(storedG1?.member_stories)).toEqual([aId]);
	expect(hexIds(storedG2?.member_stories)).toEqual([bId]);
});

it('updateStoryGroup rejects with 404 for a group id that is not in the repository', async () => {
	checkSkipped();
	const unknownGroup: Group = { name: 'x', member_stories: [], isSequential: false };

	await expect(
		repositoryService.updateStoryGroup(repoId, new ObjectId().toHexString(), unknownGroup)
	).rejects.toMatchObject({ statusCode: 404 });
});

// ──────────────────────────────────────────────
// deleteStory retry converges
// ──────────────────────────────────────────────

it('deleteStory converges on retry after an earlier attempt already deleted the story document', async () => {
	checkSkipped();
	const story = await seedStory(db!, repoId);
	const storyId = story._id.toHexString();
	const smallReport = await db!.collection(COLLECTIONS.Reports).insertOne({ payload: 'small' });
	await db!.collection(COLLECTIONS.ReportData).insertOne({
		reportName: 'retry-report',
		reportTime: Date.now(),
		mode: 1,
		status: true,
		storyId: story._id,
		smallReport: smallReport.insertedId
	});
	// Simulates an earlier attempt that deleted the story document and then failed before the cleanup finished
	await db!.collection(COLLECTIONS.Stories).deleteOne({ _id: story._id });

	await expect(storyService.deleteStory(repoId, storyId)).resolves.toBeNull();

	const repo = await readRepo();
	expect(hexIds(repo.stories)).not.toContain(storyId);
	expect(await db!.collection(COLLECTIONS.ReportData).countDocuments({ storyId: story._id })).toBe(0);
	expect(await db!.collection(COLLECTIONS.Reports).findOne({ _id: smallReport.insertedId })).toBeNull();
});

// ──────────────────────────────────────────────
// deleteReport with a missing GridFS blob
// ──────────────────────────────────────────────

it('deleteReport removes the metadata when the GridFS blob is already missing', async () => {
	checkSkipped();
	const report = await db!.collection(COLLECTIONS.ReportData).insertOne({
		reportName: 'big-report',
		reportTime: Date.now(),
		mode: 1,
		status: true,
		bigReport: new ObjectId()
	});

	await expect(reportService.deleteReport(report.insertedId.toHexString())).resolves.toMatchObject({ deletedCount: 1 });

	expect(await db!.collection(COLLECTIONS.ReportData).findOne({ _id: report.insertedId })).toBeNull();
});

// ──────────────────────────────────────────────
// ensureIndexes and unique constraints
// ──────────────────────────────────────────────

describe('ensureIndexes and unique constraints', () => {
	afterEach(async () => {
		if (skipTests || !db)
			return;
		// Dropped so the unique indexes built here do not reject data written by the other tests in this file
		await dropCollectionIfExists(COLLECTIONS.User);
		await dropCollectionIfExists(COLLECTIONS.Repositories);
	});

	it('ensureIndexes can run twice without throwing', async () => {
		checkSkipped();
		await ensureIndexes(db!);
		await expect(ensureIndexes(db!)).resolves.toBeUndefined();
	});

	it('rejects duplicate db repos and duplicate emails, but allows github/jira repos with owner "" and users with null email', async () => {
		checkSkipped();
		await ensureIndexes(db!);
		const repos = db!.collection(COLLECTIONS.Repositories);
		const owner = new ObjectId();

		await repos.insertOne({ owner, repoName: 'x', repoType: 'db', stories: [], groups: [] });
		await expect(
			repos.insertOne({ owner, repoName: 'x', repoType: 'db', stories: [], groups: [] })
		).rejects.toMatchObject({ code: 11000 });

		await repos.insertOne({ owner: '', repoName: 'gh', repoType: 'github', stories: [], groups: [] });
		await expect(
			repos.insertOne({ owner: '', repoName: 'gh', repoType: 'github', stories: [], groups: [] })
		).resolves.toBeDefined();

		const users = db!.collection(COLLECTIONS.User);
		await users.insertOne({ email: 'dup@test.de', password: 'x' });
		await expect(
			users.insertOne({ email: 'dup@test.de', password: 'x' })
		).rejects.toMatchObject({ code: 11000 });
		await expect(users.insertOne({ email: null, password: 'x' })).resolves.toBeDefined();
		await expect(users.insertOne({ email: null, password: 'x' })).resolves.toBeDefined();

		expect(await repos.indexes()).toContainEqual(expect.objectContaining({ key: { stories: 1 } }));
	});

	it('createRepo racing with the same name gives one success and one 409', async () => {
		checkSkipped();
		await ensureIndexes(db!);

		const results = await Promise.allSettled([
			repositoryService.createRepo(ownerId, 'dup'),
			repositoryService.createRepo(ownerId, 'dup')
		]);

		const fulfilled = results.filter(r => r.status === 'fulfilled');
		const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
		expect(fulfilled).toHaveLength(1);
		expect(rejected).toHaveLength(1);
		expect(rejected[0].reason).toMatchObject({ statusCode: 409 });
		expect(await db!.collection(COLLECTIONS.Repositories).countDocuments({ repoName: 'dup' })).toBe(1);
	});

	it('ensureIndexes does not throw on legacy duplicate users and falls back to a non-unique email index', async () => {
		checkSkipped();
		await dropCollectionIfExists(COLLECTIONS.User);
		const users = db!.collection(COLLECTIONS.User);
		// Legacy data written before the unique index existed
		await users.insertOne({ email: 'legacy@test.de', password: 'x' });
		await users.insertOne({ email: 'legacy@test.de', password: 'x' });
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

		await expect(ensureIndexes(db!)).resolves.toBeUndefined();

		expect(warn).toHaveBeenCalled();
		const emailIndex = (await users.indexes()).find(i => i.name === 'email_1');
		expect(emailIndex).toBeDefined();
		expect(emailIndex?.unique).toBeFalsy();
	});
});
