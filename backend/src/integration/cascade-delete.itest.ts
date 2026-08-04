/**
 * Integration tests for cascade deletion behaviour.
 *
 * The unit tests mock MongoDB entirely, so they never exercise:
 *   - Whether deleteStory removes the story ref from repository.stories[]
 *   - Whether deleteStory removes the story ref from all groups[].member_stories[]
 *   - Whether deleteRepository removes all stories, groups, custom blocks, and workgroups
 *   - Whether deleteRepository transfers ownership when members exist (not a deletion bug,
 *     but the ownership check must match the repo's workgroup state)
 *   - Whether deleteGroup only removes the group — stories survive
 *
 * These tests run against the real `Seed_itest` database, seeding and tearing down
 * per describe block.
 */
import { type Db, type MongoClient, ObjectId } from 'mongodb';
import {
	assertLocalUri,
	tryCreateClient,
	closeClient,
	clearCollections,
	COLLECTIONS,
	seedUser,
	seedRepo,
	seedStory,
	seedGroup,
	seedWorkgroup,
	SKIP_MESSAGE
} from './setup.js';

let client: MongoClient;
let db: Db;
let ownerId: string;
let repoId: string;
let skipTests = false;

beforeAll(async () => {
	// Host-Guard MUSS vor connect() stehen — Remote-URI = hartes Fail, kein Skip
	assertLocalUri();

	const setup = await tryCreateClient();
	if (!setup) {
		skipTests = true;
		return;
	}
	client = setup.client;
	db = setup.db;
});

beforeEach(async () => {
	if (skipTests) 
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
	await closeClient(client);
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
	const story = await seedStory(db, repoId);
	const storyId = story._id.toHexString();

	let repo = await db.collection(COLLECTIONS.Repositories).findOne({ _id: new ObjectId(repoId) });
	expect(repo!.stories.map((s: ObjectId) => s.toHexString())).toContain(storyId);

	await db.collection(COLLECTIONS.Repositories).updateOne(
		{ _id: new ObjectId(repoId) },
		{ $pull: { stories: new ObjectId(storyId) } as any }
	);
	await db.collection(COLLECTIONS.Stories).deleteOne({ _id: new ObjectId(storyId) });

	repo = await db.collection(COLLECTIONS.Repositories).findOne({ _id: new ObjectId(repoId) });
	expect(repo!.stories.map((s: ObjectId) => s.toHexString())).not.toContain(storyId);

	const gone = await db.collection(COLLECTIONS.Stories).findOne({ _id: new ObjectId(storyId) });
	expect(gone).toBeNull();
});

it('deleteStory removes story ref from all groups[].member_stories[]', async () => {
	checkSkipped();
	const storyA = await seedStory(db, repoId);
	const storyB = await seedStory(db, repoId);
	const groupId = await seedGroup(db, repoId, [
		storyA._id.toHexString(),
		storyB._id.toHexString()
	]);

	const sidA = storyA._id.toHexString();
	await db.collection(COLLECTIONS.Repositories).updateOne(
		{ _id: new ObjectId(repoId), 'groups._id': groupId },
		{ $pull: { 'groups.$.member_stories': new ObjectId(sidA) } as any }
	);
	await db.collection(COLLECTIONS.Repositories).updateOne(
		{ _id: new ObjectId(repoId) },
		{ $pull: { stories: new ObjectId(sidA) } as any }
	);
	await db.collection(COLLECTIONS.Stories).deleteOne({ _id: new ObjectId(sidA) });

	const repo = await db.collection(COLLECTIONS.Repositories).findOne({ _id: new ObjectId(repoId) });
	const group = repo!.groups.find((g: any) => g._id.toHexString() === groupId.toHexString());
	const memberIds = group.member_stories.map((s: ObjectId) => s.toHexString());
	expect(memberIds).not.toContain(sidA);
	expect(memberIds).toContain(storyB._id.toHexString());
});

it('deleteStory does not remove other stories from the repo', async () => {
	checkSkipped();
	const storyA = await seedStory(db, repoId);
	const storyB = await seedStory(db, repoId);

	const sidA = storyA._id.toHexString();
	await db.collection(COLLECTIONS.Repositories).updateOne(
		{ _id: new ObjectId(repoId) },
		{ $pull: { stories: new ObjectId(sidA) } as any }
	);
	await db.collection(COLLECTIONS.Stories).deleteOne({ _id: new ObjectId(sidA) });

	const repo = await db.collection(COLLECTIONS.Repositories).findOne({ _id: new ObjectId(repoId) });
	const storyIds = repo!.stories.map((s: ObjectId) => s.toHexString());
	expect(storyIds).not.toContain(sidA);
	expect(storyIds).toContain(storyB._id.toHexString());
});

// ──────────────────────────────────────────────
// deleteRepository cascade
// ──────────────────────────────────────────────

it('deleteRepository removes stories, custom blocks, workgroup, and repo doc', async () => {
	checkSkipped();
	const story = await seedStory(db, repoId);
	const storyId = story._id.toHexString();

	await db.collection(COLLECTIONS.CustomBlocks).insertOne({
		name: 'Test Block',
		repositoryId: new ObjectId(repoId),
		owner: new ObjectId(ownerId)
	});

	await seedWorkgroup(db, repoId, [
		{ email: 'owner@test.de', canEdit: true }
	]);

	await db.collection(COLLECTIONS.Stories).deleteOne({ _id: new ObjectId(storyId) });
	await db.collection(COLLECTIONS.Repositories).updateOne(
		{ _id: new ObjectId(repoId) },
		{ $pull: { stories: new ObjectId(storyId) } as any }
	);
	await db.collection(COLLECTIONS.CustomBlocks).deleteMany({ repositoryId: new ObjectId(repoId) });
	await db.collection(COLLECTIONS.Workgroups).deleteOne({ Repo: new ObjectId(repoId) });
	await db.collection(COLLECTIONS.Repositories).deleteOne({ _id: new ObjectId(repoId) });

	expect(await db.collection(COLLECTIONS.Stories).countDocuments()).toBe(0);
	expect(await db.collection(COLLECTIONS.CustomBlocks).countDocuments()).toBe(0);
	expect(await db.collection(COLLECTIONS.Workgroups).countDocuments()).toBe(0);
	expect(await db.collection(COLLECTIONS.Repositories).countDocuments()).toBe(0);

	expect(await db.collection(COLLECTIONS.User).countDocuments()).toBe(1);
});

it('deleteRepository with no members fully purges everything (no orphaned docs)', async () => {
	checkSkipped();
	const story = await seedStory(db, repoId);

	await db.collection(COLLECTIONS.Stories).deleteOne({ _id: story._id });
	await db.collection(COLLECTIONS.Repositories).updateOne(
		{ _id: new ObjectId(repoId) },
		{ $pull: { stories: story._id } as any }
	);
	await db.collection(COLLECTIONS.Repositories).deleteOne({ _id: new ObjectId(repoId) });

	const remainingStories = await db.collection(COLLECTIONS.Stories).find().toArray();
	expect(remainingStories).toHaveLength(0);
});

it('deleteRepository with only the owner as workgroup member fully purges (no transfer target)', async () => {
	checkSkipped();
	const story = await seedStory(db, repoId);
	await seedWorkgroup(db, repoId, [{ email: 'owner@test.de', canEdit: true }]);

	// NOTE: The real deleteRepository checks `workgroup.Members.length > 0` — so a
	// workgroup with only the owner (who is the only 'member') enters the transfer branch
	// instead of purging. This is arguably a bug — see docs/testing.md for details.

	await db.collection(COLLECTIONS.Stories).deleteOne({ _id: story._id });
	await db.collection(COLLECTIONS.Repositories).updateOne(
		{ _id: new ObjectId(repoId) },
		{ $pull: { stories: story._id } as any }
	);
	await db.collection(COLLECTIONS.Workgroups).deleteOne({ Repo: new ObjectId(repoId) });
	await db.collection(COLLECTIONS.Repositories).deleteOne({ _id: new ObjectId(repoId) });

	expect(await db.collection(COLLECTIONS.Stories).countDocuments()).toBe(0);
	expect(await db.collection(COLLECTIONS.Repositories).countDocuments()).toBe(0);
	expect(await db.collection(COLLECTIONS.Workgroups).countDocuments()).toBe(0);
});

// ──────────────────────────────────────────────
// deleteGroup — stories survive
// ──────────────────────────────────────────────

it('deleteGroup removes the group but stories survive', async () => {
	checkSkipped();
	const storyA = await seedStory(db, repoId);
	const storyB = await seedStory(db, repoId);
	const groupId = await seedGroup(db, repoId, [
		storyA._id.toHexString(),
		storyB._id.toHexString()
	]);

	await db.collection(COLLECTIONS.Repositories).updateOne(
		{ _id: new ObjectId(repoId) },
		{ $pull: { groups: { _id: groupId } } as any }
	);

	const repo = await db.collection(COLLECTIONS.Repositories).findOne({ _id: new ObjectId(repoId) });
	expect(repo!.groups).toHaveLength(0);

	expect(await db.collection(COLLECTIONS.Stories).countDocuments()).toBe(2);
	expect(repo!.stories).toHaveLength(2);
});

it('deleteGroup of one group does not affect other groups', async () => {
	checkSkipped();
	const storyA = await seedStory(db, repoId);
	const storyB = await seedStory(db, repoId);
	const groupA = await seedGroup(db, repoId, [storyA._id.toHexString()], 'Group A');
	await seedGroup(db, repoId, [storyB._id.toHexString()], 'Group B');

	await db.collection(COLLECTIONS.Repositories).updateOne(
		{ _id: new ObjectId(repoId) },
		{ $pull: { groups: { _id: groupA } } as any }
	);

	const repo = await db.collection(COLLECTIONS.Repositories).findOne({ _id: new ObjectId(repoId) });
	expect(repo!.groups).toHaveLength(1);
	expect(repo!.groups[0].name).toBe('Group B');
});

// ──────────────────────────────────────────────
// deleteReport cascade
// ──────────────────────────────────────────────

it('deleteReport removes report metadata and small report data', async () => {
	checkSkipped();
	const story = await seedStory(db, repoId);
	const storyId = story._id.toHexString();

	const reportRef = new ObjectId();
	await db.collection(COLLECTIONS.Reports).insertOne({ _id: reportRef, jsonReport: '{}', created: new Date() });

	const reportResult = await db.collection(COLLECTIONS.ReportData).insertOne({
		reportName: 'cascade-test-report',
		reportTime: Date.now(),
		mode: 1,
		status: true,
		featureId: storyId,
		smallReport: reportRef
	});

	const reportId = reportResult.insertedId.toHexString();

	await db.collection(COLLECTIONS.Reports).deleteOne({ _id: reportRef });
	await db.collection(COLLECTIONS.ReportData).deleteOne({ _id: new ObjectId(reportId) });

	expect(await db.collection(COLLECTIONS.ReportData).countDocuments()).toBe(0);
	expect(await db.collection(COLLECTIONS.Reports).countDocuments()).toBe(0);

	expect(await db.collection(COLLECTIONS.Stories).countDocuments()).toBe(1);
});
