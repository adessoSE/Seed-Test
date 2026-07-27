import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import AdmZip from 'adm-zip';
import { AppError } from '../helpers/AppError.js';

// --- Mocks ---

// Mock DbConnector — establishConnection returns a fake MongoClient
const mockSession = {
	withTransaction: vi.fn(async (fn: (s: any) => Promise<void>) => fn(mockSession)),
	endSession: vi.fn()
};
const mockClient = {
	startSession: vi.fn(() => mockSession),
	db: vi.fn()
};
vi.mock('../database/DbConnector', () => ({
	getConnection: vi.fn(),
	establishConnection: vi.fn(async () => mockClient)
}));

// Mock repository service
vi.mock('./repository.service', () => ({
	getOneRepositoryById: vi.fn(),
	createRepo: vi.fn(),
	updateRepository: vi.fn(),
	insertStoryIdIntoRepo: vi.fn(),
	getAllStoryGroups: vi.fn(),
	createStoryGroup: vi.fn(),
	updateStoryGroup: vi.fn()
}));

// Mock story service
vi.mock('./story.service', () => ({
	getAllStoriesOfRepo: vi.fn(),
	createStory: vi.fn(),
	updateStory: vi.fn()
}));

// Mock block service
vi.mock('./block.service', () => ({
	getBlocks: vi.fn(),
	saveBlock: vi.fn(),
	updateBlock: vi.fn()
}));

// Mock logging — no-op logger
vi.mock('../logging', () => ({
	logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

// --- Test Data Helpers ---

const repoId = new ObjectId().toHexString();
const ownerId = new ObjectId().toHexString();
const userId = new ObjectId().toHexString();
const storyId1 = new ObjectId();
const storyId2 = new ObjectId();
const blockId1 = new ObjectId();
const groupId1 = new ObjectId();

/** Builds a minimal repository object for testing */
function makeRepo(overrides: Record<string, any> = {}) {
	return {
		_id: new ObjectId(repoId),
		owner: ownerId,
		repoName: 'TestProject',
		groups: [
			{ _id: groupId1, name: 'GroupA', member_stories: [storyId1.toHexString()], isSequential: false, xrayTestSet: false }
		],
		settings: { driver: 'playwright' },
		aiConfig: {},
		...overrides
	};
}

/** Builds a minimal story array */
function makeStories() {
	return [
		{ _id: storyId1, title: 'Login Story', body: 'As a user...', scenarios: [] },
		{ _id: storyId2, title: 'Logout Story', body: 'As a user...', scenarios: [] }
	];
}

/** Builds a minimal block array */
function makeBlocks() {
	return [
		{ _id: blockId1, name: 'SharedBlock', repositoryId: repoId, steps: [] }
	];
}

/**
 * Creates a zip buffer mimicking the exportProject format.
 * Contains repository.json, stories/, blocks/, and groups/ entries.
 */
function buildImportZip(repo: any, stories: any[], blocks: any[], groups: any[]) {
	const zip = new AdmZip();
	zip.addFile('repository.json', Buffer.from(JSON.stringify(repo)));
	stories.forEach(s => zip.addFile(`stories/${s._id}.json`, Buffer.from(JSON.stringify(s))));
	blocks.forEach(b => zip.addFile(`blocks/${b._id}.json`, Buffer.from(JSON.stringify(b))));
	groups.forEach(g => zip.addFile(`groups/${g._id}.json`, Buffer.from(JSON.stringify(g))));
	return zip.toBuffer();
}


describe('ImportExportService', () => {
	let importExportService: typeof import('./import-export.service');
	let repositoryService: typeof import('./repository.service');
	let storyService: typeof import('./story.service');
	let blockService: typeof import('./block.service');

	beforeEach(async () => {
		importExportService = await vi.importActual<typeof import('./import-export.service')>('./import-export.service');
		repositoryService = await import('./repository.service');
		storyService = await import('./story.service');
		blockService = await import('./block.service');

		vi.clearAllMocks();

		// Reset the session mock so withTransaction actually executes the callback
		mockSession.withTransaction.mockImplementation(async (fn: (s: any) => Promise<void>) => fn(mockSession));
		mockSession.endSession.mockResolvedValue(undefined);
		mockClient.startSession.mockReturnValue(mockSession);
	});

	// =====================================================================
	// exportProject
	// =====================================================================

	describe('exportProject', () => {
		it('should return a zip buffer containing repository, stories, blocks, and groups', async () => {
			const repo = makeRepo();
			const stories = makeStories();
			const blocks = makeBlocks();

			vi.mocked(repositoryService.getOneRepositoryById).mockResolvedValue(repo as any);
			vi.mocked(storyService.getAllStoriesOfRepo).mockResolvedValue(stories as any);
			vi.mocked(blockService.getBlocks).mockResolvedValue(blocks as any);

			const buffer = await importExportService.exportProject(repoId);

			// Verify the result is a valid zip
			const zip = new AdmZip(buffer);
			const entries = zip.getEntries().map(e => e.entryName);

			expect(entries).toContain('repository.json');
			expect(entries).toContain(`stories/${storyId1}.json`);
			expect(entries).toContain(`stories/${storyId2}.json`);
			expect(entries).toContain(`blocks/${blockId1}.json`);
			expect(entries).toContain(`groups/${groupId1}.json`);

			// Verify the repository data is intact
			const parsedRepo = JSON.parse(zip.readAsText('repository.json'));
			expect(parsedRepo.repoName).toBe('TestProject');
		});

		it('should throw AppError.notFound when the repository does not exist', async () => {
			vi.mocked(repositoryService.getOneRepositoryById).mockResolvedValue(null);

			await expect(importExportService.exportProject(repoId))
				.rejects
				.toThrow(AppError);

			await expect(importExportService.exportProject(repoId))
				.rejects
				.toMatchObject({ statusCode: 404 });
		});
	});

	// =====================================================================
	// importProject
	// =====================================================================

	describe('importProject', () => {
		const newRepoOid = new ObjectId();
		const newStoryOid = new ObjectId();

		beforeEach(() => {
			// Default mock returns for processImport's preflight queries
			vi.mocked(storyService.getAllStoriesOfRepo).mockResolvedValue([]);
			vi.mocked(blockService.getBlocks).mockResolvedValue([]);
			vi.mocked(repositoryService.getAllStoryGroups).mockResolvedValue([]);

			// Default mock for story/block/group creation
			vi.mocked(storyService.createStory).mockResolvedValue(newStoryOid);
			vi.mocked(storyService.updateStory).mockResolvedValue(undefined);
			vi.mocked(repositoryService.insertStoryIdIntoRepo).mockResolvedValue(undefined);
			vi.mocked(blockService.saveBlock).mockResolvedValue(undefined);
			vi.mocked(repositoryService.createStoryGroup).mockResolvedValue(new ObjectId());
		});

		it('should import into a new project — creates repo, stories, blocks, and groups', async () => {
			const repo = makeRepo();
			const stories = makeStories();
			const blocks = makeBlocks();
			const groups = repo.groups;

			const zipBuffer = buildImportZip(repo, stories, blocks, groups);

			vi.mocked(repositoryService.createRepo).mockResolvedValue(newRepoOid);
			vi.mocked(repositoryService.updateRepository).mockResolvedValue(undefined);

			const result = await importExportService.importProject(
				{ buffer: zipBuffer },
				undefined,       // no existing repoId
				'NewProject',    // projectName
				true,            // rename mode
				userId
			);

			expect(result).toEqual({ success: true });

			// Verify repo was created with the given project name
			expect(repositoryService.createRepo).toHaveBeenCalledWith(
				ownerId, 'NewProject', mockSession, mockClient
			);

			// Verify repository settings were applied from the import
			expect(repositoryService.updateRepository).toHaveBeenCalledWith(
				newRepoOid.toHexString(), undefined, repo.settings, repo.aiConfig
			);

			// Verify each story was created and updated
			expect(storyService.createStory).toHaveBeenCalledTimes(stories.length);
			expect(storyService.updateStory).toHaveBeenCalledTimes(stories.length);

			// Verify blocks were saved
			expect(blockService.saveBlock).toHaveBeenCalledTimes(blocks.length);

			// Verify groups were created with re-mapped story IDs
			expect(repositoryService.createStoryGroup).toHaveBeenCalledTimes(groups.length);

			// Verify the session was properly ended
			expect(mockSession.endSession).toHaveBeenCalled();
		});

		it('should import into an existing project when repoId is provided', async () => {
			const repo = makeRepo();
			const stories = makeStories();
			const blocks = makeBlocks();
			const groups = repo.groups;

			const zipBuffer = buildImportZip(repo, stories, blocks, groups);

			const result = await importExportService.importProject(
				{ buffer: zipBuffer },
				repoId,          // existing project
				undefined,       // no project name needed
				true,            // rename mode
				userId
			);

			expect(result).toEqual({ success: true });

			// Should NOT create a new repo — importing into existing one
			expect(repositoryService.createRepo).not.toHaveBeenCalled();

			// Stories, blocks, and groups should still be processed
			expect(storyService.createStory).toHaveBeenCalledTimes(stories.length);
			expect(blockService.saveBlock).toHaveBeenCalledTimes(blocks.length);
			expect(repositoryService.createStoryGroup).toHaveBeenCalledTimes(groups.length);
		});

		it('should throw AppError.badRequest when new import is missing project name', async () => {
			const repo = makeRepo();
			const zipBuffer = buildImportZip(repo, [], [], []);

			await expect(
				importExportService.importProject(
					{ buffer: zipBuffer },
					undefined,   // no repoId
					undefined,   // no projectName — should fail
					true,
					userId
				)
			).rejects.toThrow(AppError);

			await expect(
				importExportService.importProject(
					{ buffer: zipBuffer },
					undefined,
					undefined,
					true,
					userId
				)
			).rejects.toMatchObject({ statusCode: 400 });
		});

		it('should overwrite existing stories when importMode is false and names conflict', async () => {
			const existingStoryId = new ObjectId();

			// Simulate an existing story with the same title
			vi.mocked(storyService.getAllStoriesOfRepo).mockResolvedValue([
				{ _id: existingStoryId, title: 'Login Story', body: 'old body', scenarios: [] } as any
			]);

			const repo = makeRepo();
			const stories = [{ _id: storyId1, title: 'Login Story', body: 'new body', scenarios: [] }];
			const zipBuffer = buildImportZip(repo, stories, [], []);

			await importExportService.importProject(
				{ buffer: zipBuffer },
				repoId,
				undefined,
				false,           // overwrite mode
				userId
			);

			// Should update the existing story instead of creating a new one
			expect(storyService.updateStory).toHaveBeenCalledTimes(1);
			const updatedStory = vi.mocked(storyService.updateStory).mock.calls[0][0] as any;
			expect(updatedStory._id).toEqual(existingStoryId);

			// Should NOT create a new story for the conflicting title
			expect(storyService.createStory).not.toHaveBeenCalled();
		});

		it('should rename conflicting stories when importMode is true (rename mode)', async () => {
			// Simulate an existing story with the same title
			vi.mocked(storyService.getAllStoriesOfRepo).mockResolvedValue([
				{ _id: new ObjectId(), title: 'Login Story', body: 'existing', scenarios: [] } as any
			]);

			const repo = makeRepo();
			const stories = [{ _id: storyId1, title: 'Login Story', body: 'imported', scenarios: [] }];
			const zipBuffer = buildImportZip(repo, stories, [], []);

			await importExportService.importProject(
				{ buffer: zipBuffer },
				repoId,
				undefined,
				true,            // rename mode
				userId
			);

			// Should create a new story with a renamed title (suffix appended)
			expect(storyService.createStory).toHaveBeenCalledTimes(1);
			const createdTitle = vi.mocked(storyService.createStory).mock.calls[0][0];
			expect(createdTitle).toBe('Login Story_1');
		});

		it('should overwrite conflicting blocks in overwrite mode', async () => {
			const existingBlockId = new ObjectId().toHexString();

			vi.mocked(blockService.getBlocks).mockResolvedValue([
				{ _id: existingBlockId, name: 'SharedBlock', repositoryId: repoId, steps: [] } as any
			]);

			const repo = makeRepo();
			const blocks = [{ _id: blockId1, name: 'SharedBlock', repositoryId: repoId, steps: [{ type: 'click' }] }];
			const zipBuffer = buildImportZip(repo, [], blocks, []);

			await importExportService.importProject(
				{ buffer: zipBuffer },
				repoId,
				undefined,
				false,           // overwrite mode
				userId
			);

			// Should update the existing block
			expect(blockService.updateBlock).toHaveBeenCalledTimes(1);
			expect(blockService.updateBlock).toHaveBeenCalledWith(
				existingBlockId,
				expect.objectContaining({ name: 'SharedBlock' }),
				userId,
				mockSession,
				mockClient
			);

			// Should NOT create a new block
			expect(blockService.saveBlock).not.toHaveBeenCalled();
		});

		it('should overwrite conflicting groups in overwrite mode', async () => {
			const existingGroupId = new ObjectId().toHexString();

			vi.mocked(repositoryService.getAllStoryGroups).mockResolvedValue([
				{ _id: existingGroupId, name: 'GroupA', member_stories: [], isSequential: false, xrayTestSet: false } as any
			]);

			const repo = makeRepo();
			const groups = [{ _id: groupId1, name: 'GroupA', member_stories: [storyId1.toHexString()], isSequential: true, xrayTestSet: false }];
			const zipBuffer = buildImportZip(repo, [], [], groups);

			await importExportService.importProject(
				{ buffer: zipBuffer },
				repoId,
				undefined,
				false,           // overwrite mode
				userId
			);

			// Should update the existing group
			expect(repositoryService.updateStoryGroup).toHaveBeenCalledTimes(1);
			expect(repositoryService.updateStoryGroup).toHaveBeenCalledWith(
				repoId,
				existingGroupId,
				expect.objectContaining({ name: 'GroupA' }),
				mockClient,
				mockSession
			);

			// Should NOT create a new group
			expect(repositoryService.createStoryGroup).not.toHaveBeenCalled();
		});

		it('should treat repoId "undefined" string as a new project', async () => {
			const repo = makeRepo();
			const zipBuffer = buildImportZip(repo, [], [], []);

			vi.mocked(repositoryService.createRepo).mockResolvedValue(newRepoOid);
			vi.mocked(repositoryService.updateRepository).mockResolvedValue(undefined);

			const result = await importExportService.importProject(
				{ buffer: zipBuffer },
				'undefined',     // string "undefined" — should be treated as no repoId
				'FreshProject',
				true,
				userId
			);

			expect(result).toEqual({ success: true });

			// Should create a new repo since "undefined" is treated as missing
			expect(repositoryService.createRepo).toHaveBeenCalledWith(
				ownerId, 'FreshProject', mockSession, mockClient
			);
		});

		it('should accept string "true"/"false" for importMode parameter', async () => {
			const existingStoryId = new ObjectId();

			vi.mocked(storyService.getAllStoriesOfRepo).mockResolvedValue([
				{ _id: existingStoryId, title: 'Login Story', body: 'old', scenarios: [] } as any
			]);

			const repo = makeRepo();
			const stories = [{ _id: storyId1, title: 'Login Story', body: 'new', scenarios: [] }];
			const zipBuffer = buildImportZip(repo, stories, [], []);

			// importMode as string "false" — should overwrite
			await importExportService.importProject(
				{ buffer: zipBuffer },
				repoId,
				undefined,
				'false',
				userId
			);

			// Overwrite: update existing, don't create new
			expect(storyService.updateStory).toHaveBeenCalledTimes(1);
			expect(storyService.createStory).not.toHaveBeenCalled();
		});

		it('should always end the session even when an error occurs', async () => {
			const repo = makeRepo();
			const zipBuffer = buildImportZip(repo, [], [], []);

			// Force the transaction to throw
			mockSession.withTransaction.mockRejectedValue(new Error('DB failure'));

			await expect(
				importExportService.importProject(
					{ buffer: zipBuffer },
					repoId,
					undefined,
					true,
					userId
				)
			).rejects.toThrow('DB failure');

			// Session must still be cleaned up via finally block
			expect(mockSession.endSession).toHaveBeenCalled();
		});
	});
});
