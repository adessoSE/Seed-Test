import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { authorizeRepo, authorizeByStory } from './authorize.js';

// Mock service dependencies
vi.mock('../services/repository.service', () => ({
	getOneRepositoryById: vi.fn(),
	getRepoByStoryId: vi.fn(),
}));
vi.mock('../services/workgroup.service', () => ({
	getWorkgroup: vi.fn(),
}));

import * as repositoryService from '../services/repository.service.js';
import * as workgroupService from '../services/workgroup.service.js';

// Helper to create mock Express req/res/next
function mockReqResNext(overrides: {
	params?: Record<string, string>;
	body?: Record<string, unknown>;
	query?: Record<string, string>;
	user?: { _id?: ObjectId | string; email?: string } | null;
} = {}) {
	const res = {
		status: vi.fn().mockReturnThis(),
		json: vi.fn().mockReturnThis(),
	};
	const next = vi.fn();
	const req = {
		params: overrides.params || {},
		body: overrides.body || {},
		query: overrides.query || {},
		user: overrides.user !== undefined ? overrides.user : { _id: new ObjectId(), email: 'test@test.de' },
	};
	return { req: req as any, res: res as any, next };
}

const ownerId = new ObjectId();
const otherUserId = new ObjectId();
const repoId = new ObjectId();
const storyId = new ObjectId();

const mockRepo = { _id: repoId, owner: ownerId };

beforeEach(() => {
	vi.clearAllMocks();
});

describe('authorizeRepo', () => {
	it('rejects with 400 on invalid ObjectId (bypass prevention)', async () => {
		const { req, res, next } = mockReqResNext({
			params: { repo_id: 'not-an-oid' },
		});
		await authorizeRepo('repo_id')(req, res, next);
		expect(res.status).toHaveBeenCalledWith(400);
		expect(next).not.toHaveBeenCalled();
	});

	it('rejects with 400 when param is missing', async () => {
		const { req, res, next } = mockReqResNext({ params: {} });
		await authorizeRepo('repo_id')(req, res, next);
		expect(res.status).toHaveBeenCalledWith(400);
		expect(next).not.toHaveBeenCalled();
	});

	it('rejects with 401 when user is not authenticated', async () => {
		const { req, res, next } = mockReqResNext({
			params: { repo_id: repoId.toHexString() },
			user: null,
		});
		await authorizeRepo('repo_id')(req, res, next);
		expect(res.status).toHaveBeenCalledWith(401);
	});

	it('allows repo owner through', async () => {
		vi.mocked(repositoryService.getOneRepositoryById).mockResolvedValue(mockRepo as any);
		const { req, res, next } = mockReqResNext({
			params: { repo_id: repoId.toHexString() },
			user: { _id: ownerId, email: 'owner@test.de' },
		});
		await authorizeRepo('repo_id')(req, res, next);
		expect(next).toHaveBeenCalledWith();
	});

	it('rejects non-member with 403', async () => {
		vi.mocked(repositoryService.getOneRepositoryById).mockResolvedValue(mockRepo as any);
		vi.mocked(workgroupService.getWorkgroup).mockResolvedValue({ Members: [] } as any);
		const { req, res, next } = mockReqResNext({
			params: { repo_id: repoId.toHexString() },
			user: { _id: otherUserId, email: 'stranger@test.de' },
		});
		await authorizeRepo('repo_id')(req, res, next);
		expect(res.status).toHaveBeenCalledWith(403);
	});

	it('allows workgroup member with read access', async () => {
		vi.mocked(repositoryService.getOneRepositoryById).mockResolvedValue(mockRepo as any);
		vi.mocked(workgroupService.getWorkgroup).mockResolvedValue({
			Members: [{ email: 'member@test.de', canEdit: false }],
		} as any);
		const { req, res, next } = mockReqResNext({
			params: { repo_id: repoId.toHexString() },
			user: { _id: otherUserId, email: 'member@test.de' },
		});
		await authorizeRepo('repo_id')(req, res, next);
		expect(next).toHaveBeenCalledWith();
	});

	it('rejects member without canEdit on requireEdit routes', async () => {
		vi.mocked(repositoryService.getOneRepositoryById).mockResolvedValue(mockRepo as any);
		vi.mocked(workgroupService.getWorkgroup).mockResolvedValue({
			Members: [{ email: 'member@test.de', canEdit: false }],
		} as any);
		const { req, res, next } = mockReqResNext({
			params: { repo_id: repoId.toHexString() },
			user: { _id: otherUserId, email: 'member@test.de' },
		});
		await authorizeRepo('repo_id', { requireEdit: true })(req, res, next);
		expect(res.status).toHaveBeenCalledWith(403);
	});

	it('allows member WITH canEdit on requireEdit routes', async () => {
		vi.mocked(repositoryService.getOneRepositoryById).mockResolvedValue(mockRepo as any);
		vi.mocked(workgroupService.getWorkgroup).mockResolvedValue({
			Members: [{ email: 'editor@test.de', canEdit: true }],
		} as any);
		const { req, res, next } = mockReqResNext({
			params: { repo_id: repoId.toHexString() },
			user: { _id: otherUserId, email: 'editor@test.de' },
		});
		await authorizeRepo('repo_id', { requireEdit: true })(req, res, next);
		expect(next).toHaveBeenCalledWith();
	});

	it('rejects non-owner on ownerOnly routes even if workgroup member', async () => {
		vi.mocked(repositoryService.getOneRepositoryById).mockResolvedValue(mockRepo as any);
		const { req, res, next } = mockReqResNext({
			params: { repo_id: repoId.toHexString() },
			user: { _id: otherUserId, email: 'member@test.de' },
		});
		await authorizeRepo('repo_id', { ownerOnly: true })(req, res, next);
		expect(res.status).toHaveBeenCalledWith(403);
	});

	it('returns 404 when repo does not exist', async () => {
		vi.mocked(repositoryService.getOneRepositoryById).mockResolvedValue(null as any);
		const { req, res, next } = mockReqResNext({
			params: { repo_id: repoId.toHexString() },
		});
		await authorizeRepo('repo_id')(req, res, next);
		expect(res.status).toHaveBeenCalledWith(404);
	});

	it('reads repo ID from req.body with source: "body"', async () => {
		vi.mocked(repositoryService.getOneRepositoryById).mockResolvedValue(mockRepo as any);
		const { req, res, next } = mockReqResNext({
			body: { _id: repoId.toHexString() },
			user: { _id: ownerId, email: 'owner@test.de' },
		});
		await authorizeRepo('_id', { source: 'body' })(req, res, next);
		expect(next).toHaveBeenCalledWith();
		expect(repositoryService.getOneRepositoryById).toHaveBeenCalledWith(repoId.toHexString());
	});

	it('reads repo ID from req.query with source: "query"', async () => {
		vi.mocked(repositoryService.getOneRepositoryById).mockResolvedValue(mockRepo as any);
		const { req, res, next } = mockReqResNext({
			query: { id: repoId.toHexString() },
			user: { _id: ownerId, email: 'owner@test.de' },
		});
		await authorizeRepo('id', { source: 'query' })(req, res, next);
		expect(next).toHaveBeenCalledWith();
	});
});

describe('authorizeByStory', () => {
	it('rejects with 400 on invalid ObjectId (bypass prevention)', async () => {
		const { req, res, next } = mockReqResNext({
			params: { story_id: 'not-valid' },
		});
		await authorizeByStory('story_id')(req, res, next);
		expect(res.status).toHaveBeenCalledWith(400);
		expect(next).not.toHaveBeenCalled();
	});

	it('resolves story → repo, then allows owner through', async () => {
		vi.mocked(repositoryService.getRepoByStoryId).mockResolvedValue(mockRepo as any);
		const { req, res, next } = mockReqResNext({
			params: { story_id: storyId.toHexString() },
			user: { _id: ownerId, email: 'owner@test.de' },
		});
		await authorizeByStory('story_id')(req, res, next);
		expect(repositoryService.getRepoByStoryId).toHaveBeenCalledWith(storyId.toHexString());
		expect(next).toHaveBeenCalledWith();
	});

	it('returns 404 when story repo not found', async () => {
		vi.mocked(repositoryService.getRepoByStoryId).mockResolvedValue(null as any);
		const { req, res, next } = mockReqResNext({
			params: { story_id: storyId.toHexString() },
		});
		await authorizeByStory('story_id')(req, res, next);
		expect(res.status).toHaveBeenCalledWith(404);
	});

	it('reads story ID from req.body with source: "body"', async () => {
		vi.mocked(repositoryService.getRepoByStoryId).mockResolvedValue(mockRepo as any);
		const { req, res, next } = mockReqResNext({
			body: { storyID: storyId.toHexString() },
			user: { _id: ownerId, email: 'owner@test.de' },
		});
		await authorizeByStory('storyID', { source: 'body' })(req, res, next);
		expect(next).toHaveBeenCalledWith();
	});
});
