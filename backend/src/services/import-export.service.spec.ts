import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import AdmZip from 'adm-zip';
import { AppError } from '../helpers/AppError.js';
import type * as ImportExportServiceModule from './import-export.service.js';
import type * as RepositoryServiceModule from './repository.service.js';
import type * as StoryServiceModule from './story.service.js';
import type * as BlockServiceModule from './block.service.js';
import { logger } from '../logging.js';

// --- Mocks ---

// vi.mock factories are hoisted above the imports, so the shared mock objects are created with
// vi.hoisted to exist before the mocked modules are loaded.
const { mockHello, mockSession, mockClient, mockStoryFindOne } = vi.hoisted(() => {
	// Reply to the `hello` command that supportsTransactions() sends. The default is a replica set
	// member; individual tests override it with a standalone reply (no setName).
	const mockHello = vi.fn();

	// Reads the issue_number of a story right after createStory inserted it (import reads it back from the Stories collection)
	const mockStoryFindOne = vi.fn();

	const mockSession = {
		withTransaction: vi.fn(async (fn: (s: any) => Promise<void>) => fn(mockSession)),
		endSession: vi.fn()
	};
	const mockClient = {
		startSession: vi.fn(() => mockSession),
		db: vi.fn(() => ({ command: mockHello, collection: vi.fn(() => ({ findOne: mockStoryFindOne })) }))
	};
	return { mockHello, mockSession, mockClient, mockStoryFindOne };
});

// Mock DbConnector — establishConnection returns a fake MongoClient
vi.mock('../database/DbConnector', () => ({
	getConnection: vi.fn(),
	establishConnection: vi.fn(async () => mockClient)
}));

// Mock repository service
vi.mock('./repository.service', () => ({
	getOneRepositoryById: vi.fn(),
	createRepo: vi.fn(),
	updateRepository: vi.fn(),
	deleteRepository: vi.fn(),
	insertStoryIdIntoRepo: vi.fn(),
	getAllStoryGroups: vi.fn(),
	createStoryGroup: vi.fn(),
	updateStoryGroup: vi.fn()
}));

// Mock story service
vi.mock('./story.service', () => ({
	storiesCollection: 'Stories',
	getAllStoriesOfRepo: vi.fn(),
	createStory: vi.fn(),
	updateStory: vi.fn()
}));

// Mock block service
vi.mock('./block.service', () => ({
	getBlocks: vi.fn(),
	saveBlock: vi.fn(),
	updateBlock: vi.fn(),
	overwriteBlock: vi.fn()
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

/** Builds a minimal block array. The owner is the exporting account, which an import must not keep. */
function makeBlocks() {
	return [
		{ _id: blockId1, name: 'SharedBlock', repositoryId: repoId, owner: ownerId, steps: [] }
	];
}

// The flat aiConfig shape keeps its provider fields and apiKey at the top level, not under textPreparation/jsonConversion
const flatAiConfig = {
	provider: 'cloud',
	ollamaUrl: 'http://localhost:11434/v1',
	defaultTextModel: 'mistral',
	defaultJsonModel: 'codellama',
	apiKey: 'ciphertext-flat'
};

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

/**
 * Creates a zip buffer from raw entry contents, for cases where the JSON text must not come from JSON.stringify.
 * @param entries Map of archive entry name to file content.
 */
function buildRawZip(entries: Record<string, string>) {
	const zip = new AdmZip();
	Object.entries(entries).forEach(([name, content]) => zip.addFile(name, Buffer.from(content)));
	return zip.toBuffer();
}


describe('ImportExportService', () => {
	let importExportService: typeof ImportExportServiceModule;
	let repositoryService: typeof RepositoryServiceModule;
	let storyService: typeof StoryServiceModule;
	let blockService: typeof BlockServiceModule;

	beforeEach(async () => {
		importExportService = await vi.importActual<typeof ImportExportServiceModule>('./import-export.service');
		repositoryService = await import('./repository.service');
		storyService = await import('./story.service');
		blockService = await import('./block.service');

		vi.clearAllMocks();
		mockHello.mockResolvedValue({ setName: 'rs0', ismaster: true });

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

			expect(entries).toContain(`stories/${storyId1.toString()}.json`);
			expect(entries).toContain(`stories/${storyId2.toString()}.json`);
			expect(entries).toContain(`blocks/${blockId1.toString()}.json`);
			expect(entries).toContain(`groups/${groupId1.toString()}.json`);
			expect(entries).toContain('repository.json');


			// Verify the repository data is intact
			const parsedRepo = JSON.parse(zip.readAsText('repository.json'));
			expect(parsedRepo.repoName).toBe('TestProject');
		});

		it('should leave the AI provider API keys out of repository.json and keep the other AI settings', async () => {
			const repo = makeRepo({
				aiConfig: {
					textPreparation: { provider: 'custom', name: 'cloud', modelName: 'gpt-4', baseURL: 'https://api.example.test', apiKey: 'ciphertext-text' },
					jsonConversion: { provider: 'custom', name: 'local', modelName: 'llama3', baseURL: 'http://localhost:11434', apiKey: 'ciphertext-json' }
				}
			});
			vi.mocked(repositoryService.getOneRepositoryById).mockResolvedValue(repo as any);
			vi.mocked(storyService.getAllStoriesOfRepo).mockResolvedValue([]);
			vi.mocked(blockService.getBlocks).mockResolvedValue([]);

			const buffer = await importExportService.exportProject(repoId);

			const exported = new AdmZip(buffer).readAsText('repository.json');
			expect(exported).not.toContain('ciphertext-text');
			expect(exported).not.toContain('ciphertext-json');
			expect(JSON.parse(exported).aiConfig.textPreparation.modelName).toBe('gpt-4');
			// The repository object comes from the shared service layer and must not be changed by the export
			expect(repo.aiConfig.textPreparation.apiKey).toBe('ciphertext-text');
		});

		it('should leave a top-level aiConfig API key out of an export', async () => {
			vi.mocked(repositoryService.getOneRepositoryById).mockResolvedValue(makeRepo({ aiConfig: flatAiConfig }) as any);
			vi.mocked(storyService.getAllStoriesOfRepo).mockResolvedValue([]);
			vi.mocked(blockService.getBlocks).mockResolvedValue([]);

			const buffer = await importExportService.exportProject(repoId);

			const exported = new AdmZip(buffer).readAsText('repository.json');
			expect(exported).not.toContain('ciphertext-flat');
			expect(JSON.parse(exported).aiConfig).toEqual({
				provider: 'cloud',
				ollamaUrl: 'http://localhost:11434/v1',
				defaultTextModel: 'mistral',
				defaultJsonModel: 'codellama'
			});
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
			// Default: createStory assigned issue_number 1 to the story that is read back
			mockStoryFindOne.mockResolvedValue({ issue_number: 1 });

			// Default mock returns for processImport's preflight queries
			vi.mocked(storyService.getAllStoriesOfRepo).mockResolvedValue([]);
			vi.mocked(blockService.getBlocks).mockResolvedValue([]);
			vi.mocked(repositoryService.getAllStoryGroups).mockResolvedValue([]);
			// Default: the target repository exists. Existing-project imports read its name from here.
			vi.mocked(repositoryService.getOneRepositoryById).mockResolvedValue(makeRepo() as any);

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

			// Verify repo was created with the given project name, owned by the importing user
			expect(repositoryService.createRepo).toHaveBeenCalledWith(
				userId, 'NewProject', mockSession, mockClient
			);

			// Verify repository settings were applied from the import, inside the same transaction
			// (an update without the session cannot see the uncommitted new repository).
			// The fixture aiConfig {} has no nested provider, so no aiConfig is saved.
			expect(repositoryService.updateRepository).toHaveBeenCalledWith(
				newRepoOid.toHexString(), undefined, repo.settings, undefined, mockClient, mockSession
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

		it('should create the new repository for the importing user, not the owner stored in the archive', async () => {
			const zipBuffer = buildImportZip(makeRepo({ owner: ownerId }), [], [], []);
			vi.mocked(repositoryService.createRepo).mockResolvedValue(newRepoOid);

			await importExportService.importProject({ buffer: zipBuffer }, undefined, 'NewProject', true, userId);

			expect(repositoryService.createRepo).toHaveBeenCalledWith(userId, 'NewProject', mockSession, mockClient);
			expect(repositoryService.createRepo).not.toHaveBeenCalledWith(ownerId, expect.anything(), expect.anything(), expect.anything());
		});

		it('should save blocks with the importing user as owner instead of the archive owner', async () => {
			const repo = makeRepo();
			const zipBuffer = buildImportZip(repo, [], makeBlocks(), []);
			vi.mocked(repositoryService.createRepo).mockResolvedValue(newRepoOid);

			await importExportService.importProject({ buffer: zipBuffer }, undefined, 'NewProject', true, userId);

			expect(blockService.saveBlock).toHaveBeenCalledWith(expect.objectContaining({ owner: userId }), mockSession, mockClient);
		});

		it('should reject an import without an importing user before writing anything', async () => {
			const zipBuffer = buildImportZip(makeRepo(), [], [], []);

			await expect(
				importExportService.importProject({ buffer: zipBuffer }, undefined, 'NewProject', true, undefined)
			).rejects.toMatchObject({ statusCode: 401 });

			expect(repositoryService.createRepo).not.toHaveBeenCalled();
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

		it('should save blocks with the name of the existing project when importing into it', async () => {
			const zipBuffer = buildImportZip(makeRepo({ repoName: 'SourceProject' }), [], makeBlocks(), []);
			vi.mocked(repositoryService.getOneRepositoryById).mockResolvedValue(makeRepo({ repoName: 'ExistingProject' }) as any);

			await importExportService.importProject({ buffer: zipBuffer }, repoId, undefined, true, userId);

			// The archive's repository name belongs to the source project, so the name is read from the target repository inside the import session
			expect(repositoryService.getOneRepositoryById).toHaveBeenCalledWith(repoId, mockSession);
			expect(blockService.saveBlock).toHaveBeenCalledWith(
				expect.objectContaining({ repositoryId: repoId, repository: 'ExistingProject' }), mockSession, mockClient
			);
		});

		it('should reject an import into a repository that does not exist with 404 before saving any block', async () => {
			vi.mocked(repositoryService.getOneRepositoryById).mockResolvedValue(null);
			const zipBuffer = buildImportZip(makeRepo(), [], makeBlocks(), []);

			await expect(
				importExportService.importProject({ buffer: zipBuffer }, repoId, undefined, true, userId)
			).rejects.toMatchObject({ statusCode: 404 });

			expect(blockService.saveBlock).not.toHaveBeenCalled();
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
			const updatedStory = vi.mocked(storyService.updateStory).mock.calls[0][0];
			expect(updatedStory._id).toEqual(existingStoryId);


			// Should NOT create a new story for the conflicting title
			expect(storyService.createStory).not.toHaveBeenCalled();
		});

		it('should keep the issue_number that createStory assigned, not the one in the archive, when importing into an existing project', async () => {
			const stories = [{ ...makeStories()[0], issue_number: 7 }];
			const zipBuffer = buildImportZip(makeRepo(), stories, [], []);
			mockStoryFindOne.mockResolvedValueOnce({ issue_number: 3 });

			await importExportService.importProject({ buffer: zipBuffer }, repoId, undefined, true, userId);

			// updateStory replaces the whole document, so the number it receives is the one that stays in the database
			const updatedStory = vi.mocked(storyService.updateStory).mock.calls[0][0];
			expect(updatedStory.issue_number).toBe(3);
		});

		it('should number the stories of a new project in archive order and ignore the issue numbers of the source project', async () => {
			const newStoryOid2 = new ObjectId();
			const stories = [
				{ ...makeStories()[0], issue_number: 5 },
				{ ...makeStories()[1], issue_number: 9 }
			];
			vi.mocked(storyService.createStory).mockResolvedValueOnce(newStoryOid).mockResolvedValueOnce(newStoryOid2);
			mockStoryFindOne.mockImplementation(async ({ _id }: { _id: ObjectId }) => ({ issue_number: _id.equals(newStoryOid) ? 1 : 2 }));
			const zipBuffer = buildImportZip(makeRepo(), stories, [], []);
			vi.mocked(repositoryService.createRepo).mockResolvedValue(newRepoOid);
			vi.mocked(repositoryService.updateRepository).mockResolvedValue(undefined);

			await importExportService.importProject({ buffer: zipBuffer }, undefined, 'NewProject', true, userId);

			expect(vi.mocked(storyService.updateStory).mock.calls.map(([story]) => story.issue_number)).toEqual([1, 2]);
			// Stories are linked in archive order, which keeps the order of the source project
			expect(vi.mocked(repositoryService.insertStoryIdIntoRepo).mock.calls.map(([id]) => id)).toEqual([newStoryOid.toHexString(), newStoryOid2.toHexString()]);
		});

		it('should keep the issue_number of the existing story when overwriting it', async () => {
			vi.mocked(storyService.getAllStoriesOfRepo).mockResolvedValue([
				{ _id: new ObjectId(), title: 'Login Story', body: 'old body', scenarios: [], issue_number: 4 } as any
			]);
			const zipBuffer = buildImportZip(makeRepo(), [{ ...makeStories()[0], issue_number: 9 }], [], []);

			await importExportService.importProject({ buffer: zipBuffer }, repoId, undefined, false, userId);

			const updatedStory = vi.mocked(storyService.updateStory).mock.calls[0][0];
			expect(updatedStory.issue_number).toBe(4);
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
			vi.mocked(repositoryService.getOneRepositoryById).mockResolvedValue(makeRepo({ repoName: 'ExistingProject' }) as any);

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

			// Should overwrite the existing block with the archive's content, named after the target project
			expect(blockService.overwriteBlock).toHaveBeenCalledTimes(1);
			expect(blockService.overwriteBlock).toHaveBeenCalledWith(
				existingBlockId,
				expect.objectContaining({ name: 'SharedBlock' }),
				userId,
				'ExistingProject',
				mockSession,
				mockClient
			);

			// Should NOT create a new block and should NOT use the partial update path
			expect(blockService.saveBlock).not.toHaveBeenCalled();
			expect(blockService.updateBlock).not.toHaveBeenCalled();
		});

		it('should give an overwritten block the target project name even when it was saved with a wrong name', async () => {
			const existingBlockId = new ObjectId().toHexString();

			// A block saved earlier with a null project name
			vi.mocked(blockService.getBlocks).mockResolvedValue([
				{ _id: existingBlockId, name: 'SharedBlock', repositoryId: repoId, repository: null, steps: [] } as any
			]);
			vi.mocked(repositoryService.getOneRepositoryById).mockResolvedValue(makeRepo({ repoName: 'ExistingProject' }) as any);
			const zipBuffer = buildImportZip(makeRepo({ repoName: 'SourceProject' }), [], [{ _id: blockId1, name: 'SharedBlock', steps: [] }], []);

			await importExportService.importProject({ buffer: zipBuffer }, repoId, undefined, false, userId);

			expect(vi.mocked(blockService.overwriteBlock).mock.calls[0][3]).toBe('ExistingProject');
		});

		it('should overwrite conflicting groups in overwrite mode', async () => {
			const existingGroupId = new ObjectId().toHexString();
			vi.mocked(repositoryService.getAllStoryGroups).mockResolvedValue([
				{ _id: existingGroupId, name: 'GroupA', member_stories: [], isSequential: false, xrayTestSet: false }
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
				userId, 'FreshProject', mockSession, mockClient
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

		it('should wrap the import in withTransaction on a replica set', async () => {
			const repo = makeRepo();
			const zipBuffer = buildImportZip(repo, [], [], []);
			vi.mocked(repositoryService.createRepo).mockResolvedValue(newRepoOid);

			await importExportService.importProject({ buffer: zipBuffer }, undefined, 'NewProject', true, userId);

			expect(mockSession.withTransaction).toHaveBeenCalledTimes(1);
			expect(logger.warn).not.toHaveBeenCalled();
		});

		it('should import without a transaction on a standalone server and warn once', async () => {
			// A standalone mongod replies to hello without setName and rejects transactions
			mockHello.mockResolvedValue({ ismaster: true, ok: 1 });
			const repo = makeRepo();
			const zipBuffer = buildImportZip(repo, makeStories(), makeBlocks(), repo.groups);
			vi.mocked(repositoryService.createRepo).mockResolvedValue(newRepoOid);

			const result = await importExportService.importProject({ buffer: zipBuffer }, undefined, 'NewProject', true, userId);

			expect(result).toEqual({ success: true });
			expect(mockSession.withTransaction).not.toHaveBeenCalled();
			expect(repositoryService.createRepo).toHaveBeenCalledWith(userId, 'NewProject', undefined, mockClient);
			expect(repositoryService.updateRepository).toHaveBeenCalledWith(
				newRepoOid.toHexString(), undefined, repo.settings, undefined, mockClient, undefined
			);
			expect(storyService.createStory).toHaveBeenCalledTimes(2);
			expect(blockService.saveBlock).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledTimes(1);
			expect(repositoryService.deleteRepository).not.toHaveBeenCalled();
		});

		it('should remove the new repository and rethrow when a standalone import fails after creating it', async () => {
			mockHello.mockResolvedValue({ ismaster: true, ok: 1 });
			vi.mocked(repositoryService.createRepo).mockResolvedValue(newRepoOid);
			vi.mocked(repositoryService.deleteRepository).mockResolvedValue({ status: 'deleted', message: '' });
			vi.mocked(storyService.createStory).mockRejectedValueOnce(new Error('disk full'));
			const zipBuffer = buildImportZip(makeRepo(), makeStories(), [], []);

			await expect(
				importExportService.importProject({ buffer: zipBuffer }, undefined, 'NewProject', true, userId)
			).rejects.toThrow('disk full');

			expect(repositoryService.deleteRepository).toHaveBeenCalledWith(newRepoOid.toHexString(), userId);
		});

		it('should rethrow the original error when cleanup after a failed standalone import also fails', async () => {
			mockHello.mockResolvedValue({ ismaster: true, ok: 1 });
			vi.mocked(repositoryService.createRepo).mockResolvedValue(newRepoOid);
			vi.mocked(repositoryService.deleteRepository).mockRejectedValueOnce(new Error('cleanup failed'));
			vi.mocked(storyService.createStory).mockRejectedValueOnce(new Error('disk full'));
			const zipBuffer = buildImportZip(makeRepo(), makeStories(), [], []);

			await expect(
				importExportService.importProject({ buffer: zipBuffer }, undefined, 'NewProject', true, userId)
			).rejects.toThrow('disk full');

			expect(logger.error).toHaveBeenCalled();
		});

		// Guard: cleanup only runs once the repository exists, so a failed create must not call deleteRepository
		it('should not call deleteRepository when a standalone import fails before the repository is created', async () => {
			mockHello.mockResolvedValue({ ismaster: true, ok: 1 });
			vi.mocked(repositoryService.createRepo).mockRejectedValueOnce(new Error('name taken'));
			const zipBuffer = buildImportZip(makeRepo(), [], [], []);

			await expect(
				importExportService.importProject({ buffer: zipBuffer }, undefined, 'NewProject', true, userId)
			).rejects.toThrow('name taken');

			expect(repositoryService.deleteRepository).not.toHaveBeenCalled();
		});

		it('should import into an existing repository without a transaction on a standalone server', async () => {
			mockHello.mockResolvedValue({ ismaster: true, ok: 1 });
			const repo = makeRepo();
			const zipBuffer = buildImportZip(repo, makeStories(), makeBlocks(), repo.groups);

			const result = await importExportService.importProject({ buffer: zipBuffer }, repoId, undefined, true, userId);

			expect(result).toEqual({ success: true });
			expect(mockSession.withTransaction).not.toHaveBeenCalled();
			expect(repositoryService.createRepo).not.toHaveBeenCalled();
			expect(storyService.createStory).toHaveBeenCalledTimes(2);
			expect(repositoryService.deleteRepository).not.toHaveBeenCalled();
		});

		it('should end the session when the transaction support check fails', async () => {
			mockHello.mockRejectedValueOnce(new Error('network down'));
			const zipBuffer = buildImportZip(makeRepo(), [], [], []);

			await expect(
				importExportService.importProject({ buffer: zipBuffer }, repoId, undefined, true, userId)
			).rejects.toThrow('network down');

			expect(mockSession.endSession).toHaveBeenCalled();
		});

		it('should reject a file that is not a zip archive with 400 before opening a session', async () => {
			await expect(
				importExportService.importProject({ buffer: Buffer.from('not a zip archive') }, undefined, 'NewProject', true, userId)
			).rejects.toMatchObject({ statusCode: 400 });

			expect(mockClient.startSession).not.toHaveBeenCalled();
			expect(repositoryService.createRepo).not.toHaveBeenCalled();
		});

		it('should reject an archive without repository.json with 400 before writing anything', async () => {
			const zip = new AdmZip();
			makeStories().forEach(s => zip.addFile(`stories/${String(s._id)}.json`, Buffer.from(JSON.stringify(s))));

			await expect(
				importExportService.importProject({ buffer: zip.toBuffer() }, undefined, 'NewProject', true, userId)
			).rejects.toMatchObject({ statusCode: 400 });

			expect(repositoryService.createRepo).not.toHaveBeenCalled();
			expect(storyService.createStory).not.toHaveBeenCalled();
		});

		it('should reject an archive with invalid story JSON with 400 before writing anything', async () => {
			const zip = new AdmZip();
			zip.addFile('repository.json', Buffer.from(JSON.stringify(makeRepo())));
			zip.addFile(`stories/${storyId1.toString()}.json`, Buffer.from('{ "title": '));

			await expect(
				importExportService.importProject({ buffer: zip.toBuffer() }, undefined, 'NewProject', true, userId)
			).rejects.toMatchObject({ statusCode: 400 });

			expect(repositoryService.createRepo).not.toHaveBeenCalled();
		});

		it('should reject malformed JSON with 400 before importing into an existing repository', async () => {
			const zip = new AdmZip();
			zip.addFile('repository.json', Buffer.from(JSON.stringify(makeRepo())));
			zip.addFile(`blocks/${blockId1.toString()}.json`, Buffer.from('{ broken'));

			await expect(
				importExportService.importProject({ buffer: zip.toBuffer() }, repoId, undefined, true, userId)
			).rejects.toMatchObject({ statusCode: 400 });

			expect(mockSession.withTransaction).not.toHaveBeenCalled();
		});

		it('should link a new story to the repository before updating it, so a failed update cannot leave it unlinked', async () => {
			vi.mocked(storyService.updateStory).mockRejectedValueOnce(new Error('update failed'));
			const zipBuffer = buildImportZip(makeRepo(), [makeStories()[0]], [], []);

			await expect(
				importExportService.importProject({ buffer: zipBuffer }, repoId, undefined, true, userId)
			).rejects.toThrow('update failed');

			expect(repositoryService.insertStoryIdIntoRepo).toHaveBeenCalledWith(newStoryOid.toHexString(), repoId, mockClient, mockSession);
		});

		it('should not keep AI API keys from an archive, because this server cannot decrypt keys encrypted by the exporting server', async () => {
			const repo = makeRepo({
				aiConfig: {
					textPreparation: { provider: 'custom', name: 'cloud', modelName: 'gpt-4', baseURL: 'https://api.example.test', apiKey: 'ciphertext-text' },
					jsonConversion: { provider: 'custom', name: 'local', modelName: 'llama3', baseURL: 'http://localhost:11434', apiKey: 'ciphertext-json' }
				}
			});
			vi.mocked(repositoryService.createRepo).mockResolvedValue(newRepoOid);
			vi.mocked(repositoryService.updateRepository).mockResolvedValue(undefined);

			await importExportService.importProject({ buffer: buildImportZip(repo, [], [], []) }, undefined, 'NewProject', true, userId);

			const savedAiConfig = vi.mocked(repositoryService.updateRepository).mock.calls[0][3];
			expect(JSON.stringify(savedAiConfig)).not.toContain('ciphertext');
			expect(savedAiConfig?.textPreparation.modelName).toBe('gpt-4');
		});

		// The legacy flat aiConfig is discarded, not migrated: the AI job only understands the nested providers.
		it('should save no aiConfig when the archive only has the legacy flat aiConfig', async () => {
			vi.mocked(repositoryService.createRepo).mockResolvedValue(newRepoOid);
			vi.mocked(repositoryService.updateRepository).mockResolvedValue(undefined);

			await importExportService.importProject({ buffer: buildImportZip(makeRepo({ aiConfig: flatAiConfig }), [], [], []) }, undefined, 'NewProject', true, userId);

			const savedAiConfig = vi.mocked(repositoryService.updateRepository).mock.calls[0][3];
			expect(savedAiConfig).toBeUndefined();
		});

		it('should keep only textPreparation and jsonConversion when the archive mixes nested and flat aiConfig fields', async () => {
			const nested = { provider: 'custom', name: 'local', modelName: 'llama3', baseURL: 'http://localhost:11434' };
			vi.mocked(repositoryService.createRepo).mockResolvedValue(newRepoOid);
			vi.mocked(repositoryService.updateRepository).mockResolvedValue(undefined);

			await importExportService.importProject(
				{ buffer: buildImportZip(makeRepo({ aiConfig: { ...flatAiConfig, textPreparation: nested, jsonConversion: nested } }), [], [], []) },
				undefined, 'NewProject', true, userId
			);

			const savedAiConfig = vi.mocked(repositoryService.updateRepository).mock.calls[0][3];
			expect(savedAiConfig).toEqual({ textPreparation: nested, jsonConversion: nested });
		});

		it('should reject an archive with a null repository.json with 400 before creating a repository', async () => {
			await expect(
				importExportService.importProject({ buffer: buildImportZip(null, [], [], []) }, undefined, 'NewProject', true, userId)
			).rejects.toMatchObject({ statusCode: 400 });

			expect(repositoryService.createRepo).not.toHaveBeenCalled();
		});

		describe('archive shape validation', () => {
			// Each archive has one entry with a shape the import loops cannot process. Every case must fail before the first write.
			it.each([
				['a group without member_stories', () => buildImportZip(makeRepo(), [], [], [{ _id: groupId1, name: 'GroupA' }])],
				['a group whose member_stories is not an array', () => buildImportZip(makeRepo(), [], [], [{ _id: groupId1, name: 'GroupA', member_stories: 'story-1' }])],
				['a story that is null', () => buildRawZip({ 'repository.json': JSON.stringify(makeRepo()), [`stories/${storyId1.toString()}.json`]: 'null' })],
				['a story that is a string', () => buildRawZip({ 'repository.json': JSON.stringify(makeRepo()), [`stories/${storyId1.toString()}.json`]: '"Login Story"' })],
				['a story without a scenarios array', () => buildImportZip(makeRepo(), [{ _id: storyId1, title: 'Login Story', body: 'As a user...' }], [], [])],
				['a block that is a number', () => buildRawZip({ 'repository.json': JSON.stringify(makeRepo()), [`blocks/${blockId1.toString()}.json`]: '42' })]
			])('should reject an archive with %s with 400 before importing into an existing repository', async (_label, buildArchive) => {
				await expect(
					importExportService.importProject({ buffer: buildArchive() }, repoId, undefined, true, userId)
				).rejects.toMatchObject({ statusCode: 400 });

				expect(mockSession.withTransaction).not.toHaveBeenCalled();
				expect(storyService.createStory).not.toHaveBeenCalled();
				expect(blockService.saveBlock).not.toHaveBeenCalled();
			});

			it('should reject a bad group before any story is written on a standalone server', async () => {
				mockHello.mockResolvedValue({ ismaster: true });
				const zipBuffer = buildImportZip(makeRepo(), [makeStories()[0]], [], [{ _id: groupId1, name: 'GroupA' }]);

				await expect(
					importExportService.importProject({ buffer: zipBuffer }, repoId, undefined, true, userId)
				).rejects.toMatchObject({ statusCode: 400 });

				expect(storyService.createStory).not.toHaveBeenCalled();
				expect(storyService.updateStory).not.toHaveBeenCalled();
				expect(repositoryService.insertStoryIdIntoRepo).not.toHaveBeenCalled();
			});
		});
	});
});
