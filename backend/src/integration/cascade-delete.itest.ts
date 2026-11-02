/**
 * Integration tests for cascade deletion behaviour — runs against the real services.
 *
 * The unit tests mock MongoDB entirely, so they never exercise:
 *   - Whether deleteStory removes the story ref from repository.stories[]
 *   - Whether deleteStory removes the story ref from all groups[].member_stories[]
 *   - Whether deleteRepository removes all stories, groups, custom blocks, and workgroups
 *   - Whether deleteRepository transfers ownership when members exist
 *   - Whether deleteGroup only removes the group — stories survive
 *
 * These tests seed real documents and then call the ACTUAL service functions,
 * with DbConnector mocked to point at the Testcontainers database.
 */
import { type Db, type MongoClient, ObjectId } from 'mongodb';
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
	seedAdditionalUser,
	SKIP_MESSAGE
} from './setup.js';
import type { ReportDoc } from '../types/report.types.js';

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
// deleteStory cascade
// ──────────────────────────────────────────────

it('deleteStory removes story ref from repository.stories[]', async () => {
	checkSkipped();
	const { deleteStory } = await import('../services/story.service.js');
	const story = await seedStory(db!, repoId);
	const storyId = story._id.toHexString();

	let repo = await db!.collection(COLLECTIONS.Repositories).findOne({ _id: new ObjectId(repoId) });
	expect(repo!.stories.map((s: ObjectId) => s.toHexString())).toContain(storyId);

	await deleteStory(repoId, storyId);

	repo = await db!.collection(COLLECTIONS.Repositories).findOne({ _id: new ObjectId(repoId) });
	expect(repo!.stories.map((s: ObjectId) => s.toHexString())).not.toContain(storyId);

	const gone = await db!.collection(COLLECTIONS.Stories).findOne({ _id: new ObjectId(storyId) });
	expect(gone).toBeNull();
});

it('deleteStory removes story ref from all groups[].member_stories[]', async () => {
	checkSkipped();
	const { deleteStory } = await import('../services/story.service.js');
	const storyA = await seedStory(db!, repoId);
	const storyB = await seedStory(db!, repoId);
	const groupId = await seedGroup(db!, repoId, [
		storyA._id.toHexString(),
		storyB._id.toHexString()
	]);

	const sidA = storyA._id.toHexString();
	await deleteStory(repoId, sidA);

	const repo = await db!.collection(COLLECTIONS.Repositories).findOne({ _id: new ObjectId(repoId) });
	const group = repo!.groups.find((g: any) => g._id.toHexString() === groupId.toHexString());
	const memberIds = group.member_stories.map((s: ObjectId) => s.toHexString());
	expect(memberIds).not.toContain(sidA);
	expect(memberIds).toContain(storyB._id.toHexString());
});

it('deleteStory does not remove other stories from the repo', async () => {
	checkSkipped();
	const { deleteStory } = await import('../services/story.service.js');
	const storyA = await seedStory(db!, repoId);
	const storyB = await seedStory(db!, repoId);

	const sidA = storyA._id.toHexString();
	await deleteStory(repoId, sidA);

	const repo = await db!.collection(COLLECTIONS.Repositories).findOne({ _id: new ObjectId(repoId) });
	const storyIds = repo!.stories.map((s: ObjectId) => s.toHexString());
	expect(storyIds).not.toContain(sidA);
	expect(storyIds).toContain(storyB._id.toHexString());
});

// ──────────────────────────────────────────────
// deleteRepository cascade
// ──────────────────────────────────────────────

it('deleteRepository removes stories, custom blocks, workgroup, and repo doc', async () => {
	checkSkipped();
	const { deleteRepository } = await import('../services/repository.service.js');
	await seedStory(db!, repoId);

	// Seed a custom block
	await db!.collection(COLLECTIONS.CustomBlocks).insertOne({
		name: 'Test Block',
		repositoryId: new ObjectId(repoId),
		owner: new ObjectId(ownerId)
	});

	// No workgroup → deleteRepository should skip the transfer branch
	const result = await deleteRepository(repoId, ownerId);

	expect(result.status).toBe('deleted');
	expect(await db!.collection(COLLECTIONS.Stories).countDocuments()).toBe(0);
	expect(await db!.collection(COLLECTIONS.CustomBlocks).countDocuments()).toBe(0);
	expect(await db!.collection(COLLECTIONS.Repositories).countDocuments()).toBe(0);
	expect(await db!.collection(COLLECTIONS.User).countDocuments()).toBe(1);
});

it('deleteRepository with no members fully purges everything (no orphaned docs)', async () => {
	checkSkipped();
	const { deleteRepository } = await import('../services/repository.service.js');
	await seedStory(db!, repoId);

	const result = await deleteRepository(repoId, ownerId);

	expect(result.status).toBe('deleted');
	const remainingStories = await db!.collection(COLLECTIONS.Stories).find().toArray();
	expect(remainingStories).toHaveLength(0);
});

it('deleteRepository with real members transfers ownership', async () => {
	checkSkipped();
	const { deleteRepository } = await import('../services/repository.service.js');
	const { addMember } = await import('../services/workgroup.service.js');
	await seedStory(db!, repoId);

	// Add a real second member (not the owner)
	const memberEmail = 'member@test.de';
	await seedAdditionalUser(db!, memberEmail);
	await addMember(repoId, { email: memberEmail, canEdit: true });

	const result = await deleteRepository(repoId, ownerId);

	// Should transfer, not delete
	expect(result.status).toBe('ownership_transferred');
	expect(result.newOwner).toBe(memberEmail);

	// Stories and repo should survive
	expect(await db!.collection(COLLECTIONS.Stories).countDocuments()).toBe(1);
	expect(await db!.collection(COLLECTIONS.Repositories).countDocuments()).toBe(1);
});

// ──────────────────────────────────────────────
// deleteGroup — stories survive
// ──────────────────────────────────────────────

it('deleteGroup removes the group but stories survive', async () => {
	checkSkipped();
	const { deleteStoryGroup } = await import('../services/repository.service.js');
	const storyA = await seedStory(db!, repoId);
	const storyB = await seedStory(db!, repoId);
	const groupId = await seedGroup(db!, repoId, [
		storyA._id.toHexString(),
		storyB._id.toHexString()
	]);

	await deleteStoryGroup(repoId, groupId.toHexString());

	const repo = await db!.collection(COLLECTIONS.Repositories).findOne({ _id: new ObjectId(repoId) });
	expect(repo!.groups).toHaveLength(0);

	expect(await db!.collection(COLLECTIONS.Stories).countDocuments()).toBe(2);
	expect(repo!.stories).toHaveLength(2);
});

it('deleteGroup of one group does not affect other groups', async () => {
	checkSkipped();
	const { deleteStoryGroup } = await import('../services/repository.service.js');
	const storyA = await seedStory(db!, repoId);
	const storyB = await seedStory(db!, repoId);
	const groupA = await seedGroup(db!, repoId, [storyA._id.toHexString()], 'Group A');
	await seedGroup(db!, repoId, [storyB._id.toHexString()], 'Group B');

	await deleteStoryGroup(repoId, groupA.toHexString());

	const repo = await db!.collection(COLLECTIONS.Repositories).findOne({ _id: new ObjectId(repoId) });
	expect(repo!.groups).toHaveLength(1);
	expect(repo!.groups[0].name).toBe('Group B');
});

// ──────────────────────────────────────────────
// deleteReport cascade
// ──────────────────────────────────────────────

it('deleteReport removes report metadata and small report data', async () => {
	checkSkipped();
	const { deleteReport } = await import('../services/report.service.js');
	const story = await seedStory(db!, repoId);
	const storyId = story._id.toHexString();

	const reportRef = new ObjectId();
	await db!.collection(COLLECTIONS.Reports).insertOne({ _id: reportRef, jsonReport: '{}', created: new Date() });

	const reportResult = await db!.collection<ReportDoc>(COLLECTIONS.ReportData).insertOne({
		reportName: 'cascade-test-report',
		reportTime: Date.now(),
		mode: 1 as unknown as ReportDoc['mode'],
		status: true,
		featureId: storyId,
		smallReport: reportRef
	});

	const reportId = reportResult.insertedId.toHexString();

	await deleteReport(reportId);

	expect(await db!.collection(COLLECTIONS.ReportData).countDocuments()).toBe(0);
	expect(await db!.collection(COLLECTIONS.Reports).countDocuments()).toBe(0);

	expect(await db!.collection(COLLECTIONS.Stories).countDocuments()).toBe(1);
});
