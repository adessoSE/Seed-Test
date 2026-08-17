/**
 * Integration tests for the authorization middleware against real MongoDB documents.
 *
 * The unit tests in middleware/authorize.spec.ts mock every service call.
 * These tests seed real repository / story / workgroup / report documents
 * and verify that each guard returns the correct HTTP status code for
 * owner, workgroup member (with/without canEdit), non-member, and
 * non-existent document scenarios.
 *
 * Connection strategy: vi.mock DbConnector before any service imports
 * so that getConnection() returns the Testcontainers database handle.
 * The middleware's service calls (repositoryService, workgroupService,
 * reportService, storyService) all use getConnection() internally —
 * this redirects them to the real test database without changing production code.
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
	seedWorkgroup,
	seedReport,
	seedAdditionalUser as seedAdditionalUserHelper,
	SKIP_MESSAGE
} from './setup.js';
import type { User } from '@seed-test/shared/models/User.js';

let container: StartedMongoDBContainer | null = null;
let client: MongoClient | null = null;
let db: Db | null = null;

let ownerId: string | null = null;
let ownerUser: User | null = null;
let repoId: string | null = null;
let storyId: string | null = null;

// Module-level variable the mocked DbConnector reads from
let _testDb: Db | null = null;

vi.mock('../database/DbConnector.js', () => ({
	getConnection: () => {
		if (!_testDb) throw new Error('Test DB not initialized');
		return _testDb;
	},
	establishConnection: vi.fn(),
	closeConnection: vi.fn()
}));

/** Minimal mock for Express Response — tracks status and body sent. */
function mockRes(): { statusCode: number; body: unknown; status: (code: number) => unknown; json: (data: unknown) => unknown } {
	let statusCode = 200;
	let body: unknown = {};
	return {
		status(code: number) { statusCode = code; return this; },
		json(data: unknown) { body = data; return this; },
		get statusCode() { return statusCode; },
		get body() { return body; }
	};
}

beforeAll(async () => {
	const setup = await tryCreateClient();
	if (!setup) return;
	container = setup.container;
	client = setup.client;
	db = setup.db;
	_testDb = db;
});

beforeEach(async () => {
	if (!client || !db) 
		return;
	
	await clearCollections(db, [
		COLLECTIONS.User,
		COLLECTIONS.Repositories,
		COLLECTIONS.Stories,
		COLLECTIONS.Workgroups,
		COLLECTIONS.ReportData,
		COLLECTIONS.Reports
	]);

	ownerId = await seedUser(db);
	ownerUser = { _id: ownerId, email: 'owner@test.de' };
	const repo = await seedRepo(db, ownerId);
	repoId = repo._id.toHexString();
	const story = await seedStory(db, repoId);
	storyId = story._id.toHexString();
});

afterAll(async () => {
	await closeClient(client, container);
});

async function seedAdditionalUser(email: string): Promise<User> {
	const uid = await seedAdditionalUserHelper(db!, email);
	return { _id: uid, email };
}

function checkDb(): Db {
	if (!db) throw new Error(SKIP_MESSAGE);
	return db;
}

// ──────────────────────────────────────────────
// authorizeRepo
// ──────────────────────────────────────────────

describe('authorizeRepo', () => {
	it('allows the owner (no options)', async () => {
		checkDb();
		const { authorizeRepo } = await import('../middleware/authorize.js');
		const middleware = authorizeRepo('repoId');
		const req = { params: { repoId }, user: ownerUser } as any;
		const res = mockRes() as any;
		const next = vi.fn();

		await middleware(req, res, next);

		expect(next).toHaveBeenCalled();
	});

	it('allows the owner with requireEdit: true', async () => {
		checkDb();
		const { authorizeRepo } = await import('../middleware/authorize.js');
		const middleware = authorizeRepo('repoId', { requireEdit: true });
		const req = { params: { repoId }, user: ownerUser } as any;
		const res = mockRes() as any;
		const next = vi.fn();

		await middleware(req, res, next);

		expect(next).toHaveBeenCalled();
	});

	it('allows the owner with ownerOnly: true', async () => {
		checkDb();
		const { authorizeRepo } = await import('../middleware/authorize.js');
		const middleware = authorizeRepo('repoId', { ownerOnly: true });
		const req = { params: { repoId }, user: ownerUser } as any;
		const res = mockRes() as any;
		const next = vi.fn();

		await middleware(req, res, next);

		expect(next).toHaveBeenCalled();
	});

	it('allows workgroup member with canEdit', async () => {
		const _db = checkDb();
		const memberUser = await seedAdditionalUser('member@test.de');
		await seedWorkgroup(_db, repoId!, [
			{ email: 'member@test.de', canEdit: true }
		]);

		const { authorizeRepo } = await import('../middleware/authorize.js');
		const middleware = authorizeRepo('repoId', { requireEdit: true });
		const req = { params: { repoId }, user: memberUser } as any;
		const res = mockRes() as any;
		const next = vi.fn();

		await middleware(req, res, next);

		expect(next).toHaveBeenCalled();
	});

	it('returns 403 for member without canEdit when requireEdit: true', async () => {
		const _db = checkDb();
		const memberUser = await seedAdditionalUser('readonly@test.de');
		await seedWorkgroup(_db, repoId!, [
			{ email: 'readonly@test.de', canEdit: false }
		]);

		const { authorizeRepo } = await import('../middleware/authorize.js');
		const middleware = authorizeRepo('repoId', { requireEdit: true });
		const req = { params: { repoId }, user: memberUser } as any;
		const res = mockRes() as any;
		const next = vi.fn();

		await middleware(req, res, next);

		expect(res.statusCode).toBe(403);
		expect((res.body).error).toContain('edit permissions');
		expect(next).not.toHaveBeenCalled();
	});

	it('allows member without canEdit when requireEdit not set', async () => {
		const _db = checkDb();
		const memberUser = await seedAdditionalUser('readonly2@test.de');
		await seedWorkgroup(_db, repoId!, [
			{ email: 'readonly2@test.de', canEdit: false }
		]);

		const { authorizeRepo } = await import('../middleware/authorize.js');
		const middleware = authorizeRepo('repoId');
		const req = { params: { repoId }, user: memberUser } as any;
		const res = mockRes() as any;
		const next = vi.fn();

		await middleware(req, res, next);

		expect(next).toHaveBeenCalled();
	});

	it('returns 403 for non-member', async () => {
		checkDb();
		const { authorizeRepo } = await import('../middleware/authorize.js');
		const middleware = authorizeRepo('repoId');
		const stranger = { _id: new ObjectId().toHexString(), email: 'stranger@test.de' } as User;
		const req = { params: { repoId }, user: stranger } as any;
		const res = mockRes() as any;
		const next = vi.fn();

		await middleware(req, res, next);

		expect(res.statusCode).toBe(403);
		expect(next).not.toHaveBeenCalled();
	});

	it('returns 404 for non-existent repository', async () => {
		checkDb();
		const { authorizeRepo } = await import('../middleware/authorize.js');
		const fakeId = new ObjectId().toHexString();
		const middleware = authorizeRepo('repoId');
		const req = { params: { repoId: fakeId }, user: ownerUser } as any;
		const res = mockRes() as any;
		const next = vi.fn();

		await middleware(req, res, next);

		expect(res.statusCode).toBe(404);
		expect(next).not.toHaveBeenCalled();
	});

	it('returns 400 for invalid ObjectId', async () => {
		checkDb();
		const { authorizeRepo } = await import('../middleware/authorize.js');
		const middleware = authorizeRepo('repoId');
		const req = { params: { repoId: 'not-an-objectid' }, user: ownerUser } as any;
		const res = mockRes() as any;
		const next = vi.fn();

		await middleware(req, res, next);

		expect(res.statusCode).toBe(400);
		expect(next).not.toHaveBeenCalled();
	});

	it('returns 401 when no user on request', async () => {
		checkDb();
		const { authorizeRepo } = await import('../middleware/authorize.js');
		const middleware = authorizeRepo('repoId');
		const req = { params: { repoId }, body: {} } as any;
		const res = mockRes() as any;
		const next = vi.fn();

		await middleware(req, res, next);

		expect(res.statusCode).toBe(401);
		expect(next).not.toHaveBeenCalled();
	});
});

// ──────────────────────────────────────────────
// authorizeByStory
// ──────────────────────────────────────────────

describe('authorizeByStory', () => {
	it('allows the owner via story lookup', async () => {
		checkDb();
		const { authorizeByStory } = await import('../middleware/authorize.js');
		const middleware = authorizeByStory('storyId');
		const req = { params: { storyId }, user: ownerUser } as any;
		const res = mockRes() as any;
		const next = vi.fn();

		await middleware(req, res, next);

		expect(next).toHaveBeenCalled();
	});

	it('returns 404 when story does not exist in any repository', async () => {
		checkDb();
		const { authorizeByStory } = await import('../middleware/authorize.js');
		const fakeId = new ObjectId().toHexString();
		const middleware = authorizeByStory('storyId');
		const req = { params: { storyId: fakeId }, user: ownerUser } as any;
		const res = mockRes() as any;
		const next = vi.fn();

		await middleware(req, res, next);

		expect(res.statusCode).toBe(404);
		expect(next).not.toHaveBeenCalled();
	});

	it('returns 403 for non-member via story lookup', async () => {
		checkDb();
		const { authorizeByStory } = await import('../middleware/authorize.js');
		const middleware = authorizeByStory('storyId');
		const stranger = { _id: new ObjectId().toHexString(), email: 'stranger_s@test.de' } as User;
		const req = { params: { storyId }, user: stranger } as any;
		const res = mockRes() as any;
		const next = vi.fn();

		await middleware(req, res, next);

		expect(res.statusCode).toBe(403);
		expect(next).not.toHaveBeenCalled();
	});

	it('allows workgroup member with canEdit via story lookup', async () => {
		const _db = checkDb();
		const memberUser = await seedAdditionalUser('editor_s@test.de');
		await seedWorkgroup(_db, repoId!, [
			{ email: 'editor_s@test.de', canEdit: true }
		]);

		const { authorizeByStory } = await import('../middleware/authorize.js');
		const middleware = authorizeByStory('storyId', { requireEdit: true });
		const req = { params: { storyId }, user: memberUser } as any;
		const res = mockRes() as any;
		const next = vi.fn();

		await middleware(req, res, next);

		expect(next).toHaveBeenCalled();
	});

	it('returns 403 for member without canEdit when requireEdit: true via story', async () => {
		const _db = checkDb();
		const memberUser = await seedAdditionalUser('readonly_s@test.de');
		await seedWorkgroup(_db, repoId!, [
			{ email: 'readonly_s@test.de', canEdit: false }
		]);

		const { authorizeByStory } = await import('../middleware/authorize.js');
		const middleware = authorizeByStory('storyId', { requireEdit: true });
		const req = { params: { storyId }, user: memberUser } as any;
		const res = mockRes() as any;
		const next = vi.fn();

		await middleware(req, res, next);

		expect(res.statusCode).toBe(403);
		expect(next).not.toHaveBeenCalled();
	});

	it('returns 400 for invalid story ObjectId', async () => {
		checkDb();
		const { authorizeByStory } = await import('../middleware/authorize.js');
		const middleware = authorizeByStory('storyId');
		const req = { params: { storyId: 'bad-id' }, user: ownerUser } as any;
		const res = mockRes() as any;
		const next = vi.fn();

		await middleware(req, res, next);

		expect(res.statusCode).toBe(400);
		expect(next).not.toHaveBeenCalled();
	});
});

// ──────────────────────────────────────────────
// authorizeByReport
// ──────────────────────────────────────────────

describe('authorizeByReport', () => {
	it('allows the owner via report lookup (by ID)', async () => {
		const _db = checkDb();
		const report = await seedReport(_db, storyId!);
		const reportId = report._id.toHexString();

		const { authorizeByReport } = await import('../middleware/authorize.js');
		const middleware = authorizeByReport('reportId');
		const req = { params: { reportId }, user: ownerUser } as any;
		const res = mockRes() as any;
		const next = vi.fn();

		await middleware(req, res, next);

		expect(next).toHaveBeenCalled();
	});

	it('returns 404 for non-existent report', async () => {
		checkDb();
		const { authorizeByReport } = await import('../middleware/authorize.js');
		const fakeId = new ObjectId().toHexString();
		const middleware = authorizeByReport('reportId');
		const req = { params: { reportId: fakeId }, user: ownerUser } as any;
		const res = mockRes() as any;
		const next = vi.fn();

		await middleware(req, res, next);

		expect(res.statusCode).toBe(404);
		expect(next).not.toHaveBeenCalled();
	});

	it('returns 403 for non-member via report lookup', async () => {
		const _db = checkDb();
		const report = await seedReport(_db, storyId!);
		const reportId = report._id.toHexString();

		const { authorizeByReport } = await import('../middleware/authorize.js');
		const middleware = authorizeByReport('reportId');
		const stranger = { _id: new ObjectId().toHexString(), email: 'stranger_r@test.de' } as User;
		const req = { params: { reportId }, user: stranger } as any;
		const res = mockRes() as any;
		const next = vi.fn();

		await middleware(req, res, next);

		expect(res.statusCode).toBe(403);
		expect(next).not.toHaveBeenCalled();
	});

	it('allows workgroup member with canEdit via report lookup', async () => {
		const _db = checkDb();
		const memberUser = await seedAdditionalUser('editor_r@test.de');
		await seedWorkgroup(_db, repoId!, [
			{ email: 'editor_r@test.de', canEdit: true }
		]);
		const report = await seedReport(_db, storyId!);
		const reportId = report._id.toHexString();

		const { authorizeByReport } = await import('../middleware/authorize.js');
		const middleware = authorizeByReport('reportId', { requireEdit: true });
		const req = { params: { reportId }, user: memberUser } as any;
		const res = mockRes() as any;
		const next = vi.fn();

		await middleware(req, res, next);

		expect(next).toHaveBeenCalled();
	});

	it('returns 403 for member without canEdit when requireEdit: true via report', async () => {
		const _db = checkDb();
		const memberUser = await seedAdditionalUser('readonly_r@test.de');
		await seedWorkgroup(_db, repoId!, [
			{ email: 'readonly_r@test.de', canEdit: false }
		]);
		const report = await seedReport(_db, storyId!);
		const reportId = report._id.toHexString();

		const { authorizeByReport } = await import('../middleware/authorize.js');
		const middleware = authorizeByReport('reportId', { requireEdit: true });
		const req = { params: { reportId }, user: memberUser } as any;
		const res = mockRes() as any;
		const next = vi.fn();

		await middleware(req, res, next);

		expect(res.statusCode).toBe(403);
		expect(next).not.toHaveBeenCalled();
	});
});

// ──────────────────────────────────────────────
// authorizeByIssueKey
// ──────────────────────────────────────────────

describe('authorizeByIssueKey', () => {
	it('allows the owner via issue key lookup', async () => {
		const _db = checkDb();
		await _db.collection(COLLECTIONS.Stories).updateOne(
			{ _id: new ObjectId(storyId!) },
			{ $set: { issue_number: 'PROJ-123' } }
		);

		const { authorizeByIssueKey } = await import('../middleware/authorize.js');
		const middleware = authorizeByIssueKey('issueKey');
		const req = { params: { issueKey: 'PROJ-123' }, user: ownerUser } as any;
		const res = mockRes() as any;
		const next = vi.fn();

		await middleware(req, res, next);

		expect(next).toHaveBeenCalled();
	});

	it('returns 404 for non-existent issue key', async () => {
		checkDb();
		const { authorizeByIssueKey } = await import('../middleware/authorize.js');
		const middleware = authorizeByIssueKey('issueKey');
		const req = { params: { issueKey: 'NONEXIST-999' }, user: ownerUser } as any;
		const res = mockRes() as any;
		const next = vi.fn();

		await middleware(req, res, next);

		expect(res.statusCode).toBe(404);
		expect(next).not.toHaveBeenCalled();
	});

	it('returns 403 for non-member via issue key lookup', async () => {
		const _db = checkDb();
		await _db.collection(COLLECTIONS.Stories).updateOne(
			{ _id: new ObjectId(storyId!) },
			{ $set: { issue_number: 'PROJ-456' } }
		);

		const { authorizeByIssueKey } = await import('../middleware/authorize.js');
		const middleware = authorizeByIssueKey('issueKey');
		const stranger = { _id: new ObjectId().toHexString(), email: 'stranger_i@test.de' } as User;
		const req = { params: { issueKey: 'PROJ-456' }, user: stranger } as any;
		const res = mockRes() as any;
		const next = vi.fn();

		await middleware(req, res, next);

		expect(res.statusCode).toBe(403);
		expect(next).not.toHaveBeenCalled();
	});
});
