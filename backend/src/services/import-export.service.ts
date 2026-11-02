import { type ClientSession, type MongoClient, type ObjectId } from 'mongodb';
import AdmZip from 'adm-zip';
import { inflateRawSync } from 'node:zlib';
import { z } from '@seed-test/shared';
import * as repositoryService from './repository.service.js';
import * as storyService from './story.service.js';
import * as blockService from './block.service.js';
import * as dbConnector from '../database/DbConnector.js';
import { type Story } from '@seed-test/shared/models/Story.js';
import { type Block } from '@seed-test/shared/models/Block.js';
import { type Group } from '@seed-test/shared/models/Group.js';
import { type Repository } from '@seed-test/shared/models/Repository.js';
import { oid } from '../types/mongo.types.js';
import { AppError } from '../helpers/AppError.js';
import { logger } from '../logging.js';

// --- Main Import/Export Functions ---

/**
 * Exports an entire project (repository) into a zip file buffer.
 * It exports all documents as they are, including their original _ids,
 * to enable a robust re-import mapping process.
 * @param repo_id The ID of the repository to export.
 * @returns A Promise that resolves to the zip file as a Buffer.
 */
export async function exportProject(repo_id: string): Promise<Buffer> {
	const repo = await repositoryService.getOneRepositoryById(repo_id);
	if (!repo) 
		throw AppError.notFound('Repository not found.');
    

	const stories = await storyService.getAllStoriesOfRepo(repo_id);
	const repoBlocks = await blockService.getBlocks(repo_id);
    
	const zip = new AdmZip();

	// Add all documents to the zip file in their respective folders, using their ID as filename
	stories.forEach(story => {
		zip.addFile(`stories/${story._id}.json`, Buffer.from(JSON.stringify(story)));
	});
	repoBlocks.forEach(block => {
		zip.addFile(`blocks/${block._id}.json`, Buffer.from(JSON.stringify(block)));
	});
	repo.groups.forEach(group => {
		zip.addFile(`groups/${group._id}.json`, Buffer.from(JSON.stringify(group)));
	});
    
	zip.addFile('repository.json', Buffer.from(JSON.stringify(withoutSecrets(repo))));
	return zip.toBuffer();
}

/**
 * Handles the entire project import process from a zip file within a database transaction.
 * It supports two modes: 'rename' (adds a suffix to conflicting items) and 'overwrite' (replaces existing items).
 * On a standalone MongoDB (no transaction support) the import runs without a transaction. A failed import of a
 * new project then removes the repository it created, but a failed import into an EXISTING project has no
 * rollback and leaves a partial import behind.
 * The archive is parsed and the user is checked before any connection is opened, so a malformed file is rejected without writes.
 * @param file The zip file buffer from the request.
 * @param repoId Optional ID of an existing repository to import into.
 * @param projectName Optional name for a new repository.
 * @param importMode True to rename conflicts (default), false to overwrite them.
 * @param userId The ID of the importing user. Required at runtime: without it the import is rejected with 401 before anything is written. Becomes the owner of a new repository and of the imported blocks.
 * @returns A promise that resolves to an object indicating success.
 */
export async function importProject(
	file: { buffer: Buffer },
	repoId?: string,
	projectName?: string,
	importMode: boolean | string = true, // Default to rename mode
	userId?: string
): Promise<{ success: boolean }> {
	// Parse and authorize before connecting, so a bad file or a missing user never leads to a write
	const archive = parseImportArchive(file.buffer);
	// CASE 1: no authenticated user. Rejected up front, because the user becomes the owner of everything the import creates.
	if (!userId) throw AppError.unauthorized('Importing a project requires an authenticated user.');

	const client = await dbConnector.establishConnection();
	const session = client.startSession();
	const isRenameMode = (importMode === true || importMode === 'true');

	try {
		const transactional = await supportsTransactions(client);
		// CASE 2: standalone server without transaction support. The import runs without rollback, so a failure can leave writes behind.
		if (!transactional)
			logger.warn('MongoDB does not support transactions (standalone server). Importing without a transaction; a failed import of a new project removes the repository it created, a failed import into an existing project is not rolled back.');

		if (repoId && repoId !== 'undefined') 
		// --- Logic for importing into an EXISTING project ---
			await runImportStep(session, transactional, async (currentSession) => {
				// CASE 3: the target repository does not exist. Stop before any block is written, because blocks need its name.
				// WHY: the archive's repoName is the source project's name. Blocks store the name in `repository`, so it is read from the target inside the import session.
				const targetRepo = await repositoryService.getOneRepositoryById(repoId, currentSession);
				if (!targetRepo) throw AppError.notFound('Repository not found.');
				await processImport(archive, isRenameMode, repoId, targetRepo.repoName, client, currentSession, userId);
			});
		else {
			// --- Logic for importing into a NEW project ---
			if (!projectName) throw AppError.badRequest('Project name is required for new imports.');
			await importIntoNewProject(archive, isRenameMode, projectName, client, session, transactional, userId);
		}
		return { success: true };
	} finally {
		await session.endSession();
		// The client connection is managed by the DbConnector, no need to close here.
	}
}

// --- Internal Helper Functions ---

/**
 * Validated contents of an import archive. Built by parseImportArchive before anything is written.
 */
interface ImportArchive {
	repository: Repository;
	stories: Story[];
	blocks: Block[];
	groups: Group[];
}

/**
 * Shape checks that the import loops rely on: they read scenarios and member_stories without guards, and the
 * repository is read for its settings and aiConfig. Checked by parseImportArchive before any write, so a malformed
 * archive is rejected with a 400 instead of failing halfway through an import.
 */
const importArchiveSchema = z.object({
	repository: z.object({}).passthrough(),
	stories: z.array(z.object({ scenarios: z.array(z.unknown()) }).passthrough()),
	blocks: z.array(z.object({}).passthrough()),
	groups: z.array(z.object({ member_stories: z.array(z.unknown()) }).passthrough())
});

// Limits far above a real export (the E2E fixture: 18 entries, 51 KB, ratio 6), well below what exhausts memory
const MAX_ENTRIES = 10_000;
const MAX_TOTAL_UNCOMPRESSED_BYTES = 100 * 1024 * 1024;
const MAX_ENTRY_RATIO = 200;
// Small entries are covered by the total limit; ratios of tiny files are meaningless
const RATIO_CHECK_MIN_BYTES = 1024 * 1024;

/**
 * Rejects archives that could exhaust memory when read. The header sizes are checked first, before any decompression.
 * The header sizes are not trusted, so each entry's real bytes are then measured against its declared size.
 * @param zip The opened archive.
 * @throws Error when the archive has too many entries, declares too much data, has an implausible compression ratio,
 * holds more data than it declares, or uses an unsupported compression method.
 */
function assertSafeArchive(zip: AdmZip): void {
	const entries = zip.getEntries();
	if (entries.length > MAX_ENTRIES) throw new Error(`Archive has too many entries (max ${MAX_ENTRIES})`);

	const totalDeclared = entries.reduce((sum, entry) => sum + entry.header.size, 0);
	if (totalDeclared > MAX_TOTAL_UNCOMPRESSED_BYTES) throw new Error(`Archive uncompressed size exceeds ${MAX_TOTAL_UNCOMPRESSED_BYTES} bytes`);

	for (const entry of entries) {
		const { size, compressedSize } = entry.header;
		if (size >= RATIO_CHECK_MIN_BYTES && size / Math.max(compressedSize, 1) > MAX_ENTRY_RATIO)
			throw new Error(`Entry ${entry.entryName} compression ratio exceeds ${MAX_ENTRY_RATIO}`);
	}

	for (const entry of entries) {
		if (entry.isDirectory) continue;
		const raw = entry.getCompressedData();
		let actual: number;
		// Method 0 is stored: the archive bytes are the content
		if (entry.header.method === 0) actual = raw.length;
		// Method 8 is deflate. The output is capped at the declared size, so a lying entry stops early
		else if (entry.header.method === 8) {
			if (raw.length === 0) continue;
			try {
				actual = inflateRawSync(raw, { maxOutputLength: Math.max(entry.header.size, 1) }).length;
			} catch (error) {
				if (error instanceof RangeError) throw new Error(`Entry ${entry.entryName} is larger than its declared size`, { cause: error });
				throw error;
			}
		} else throw new Error(`Entry ${entry.entryName} uses unsupported compression method`);
		if (actual > entry.header.size) throw new Error(`Entry ${entry.entryName} is larger than its declared size`);
	}
}

/**
 * Reads and validates an import zip. Every failure (not a zip, missing repository.json, invalid JSON in a
 * story, block or group entry) is reported as a 400, so the client gets a clear error instead of a 500.
 * @param buffer The uploaded zip file.
 * @returns The parsed repository, stories, blocks and groups.
 */
function parseImportArchive(buffer: Buffer): ImportArchive {
	try {
		const zip = new AdmZip(buffer);
		assertSafeArchive(zip);
		// readAsText returns an empty string for a missing entry, so an empty value means the file is absent
		const repositoryJson = zip.readAsText('repository.json');
		if (!repositoryJson) throw new Error('repository.json is missing');

		const parsed = importArchiveSchema.safeParse({
			repository: JSON.parse(repositoryJson) as unknown,
			stories: parseJsonEntries(zip, 'stories/'),
			blocks: parseJsonEntries(zip, 'blocks/'),
			groups: parseJsonEntries(zip, 'groups/')
		});
		if (!parsed.success) {
			const issue = parsed.error.issues[0];
			throw new Error(`${issue.path.join('.')}: ${issue.message}`);
		}
		return parsed.data as unknown as ImportArchive;
	} catch (error) {
		throw AppError.badRequest(`Invalid import file: ${error instanceof Error ? error.message : String(error)}`);
	}
}

/**
 * Parses every file in an archive folder as JSON. Directory entries are skipped because they have no content.
 * @param zip The opened archive.
 * @param folder The folder prefix, e.g. 'stories/'.
 * @returns The parsed documents. Throws a SyntaxError when an entry is not valid JSON.
 */
function parseJsonEntries(zip: AdmZip, folder: string): unknown[] {
	return zip.getEntries()
		.filter(entry => entry.entryName.startsWith(folder) && !entry.isDirectory)
		.map(entry => JSON.parse(zip.readAsText(entry)) as unknown);
}

/**
 * Central orchestrator for the import process. Manages transactions and data mapping.
 */
async function processImport(archive: ImportArchive, isRenameMode: boolean, repoId: string, repoName: string, client: MongoClient, session: ClientSession | undefined, userId: string) {
	// withTransaction may run this function again after a transient error. Work on a copy, because the loops
	// below rename titles and rewrite group members, and those changes must not leak into the next attempt.
	const workingArchive = structuredClone(archive);

	// --- OPTIMIZATION: Fetch all existing names ONCE ---
	const [existingStories, existingBlocks, existingGroups] = await Promise.all([
		storyService.getAllStoriesOfRepo(repoId),
		blockService.getBlocks(repoId),
		repositoryService.getAllStoryGroups(repoId)
	]);
	const existingStoryNames = new Set(existingStories.map(s => s.title));
	const existingBlockNames = new Set(existingBlocks.map(b => b.name).filter((name): name is string => name !== undefined));
	const existingGroupNames = new Set(existingGroups.map(g => g.name));

	const oldToNewStoryIdMap = new Map<string, ObjectId>();

	// 1. Process Stories
	for (const storyObject of workingArchive.stories) {
		const oldId = storyObject._id?.toString();
		let newStoryId: ObjectId;

		const hasConflict = existingStoryNames.has(storyObject.title);

		if (!isRenameMode && hasConflict) { // OVERWRITE
			const existingStory = existingStories.find(s => s.title === storyObject.title);
			newStoryId = oid(existingStory!._id!);
			// The existing story keeps its own number in this repository; the archive's number belongs to the source project
			// The archive's version belongs to the source project, so it must not act as the lock check here
			const { version: _archivedVersion, ...overwriteFields } = storyObject;
			await storyService.updateStory({ ...overwriteFields, _id: newStoryId, issue_number: existingStory!.issue_number } as unknown as Story, client, session);
		} else { // RENAME or NO CONFLICT
			if (isRenameMode && hasConflict) 
				storyObject.title = findAvailableName(storyObject.title, existingStoryNames);
            
			newStoryId = await storyService.createStory(storyObject.title, storyObject.body, repoId, client, session);
			// Link before updating: if the update fails on a standalone server (no rollback), the story is still
			// listed in the repository instead of being left orphaned.
			await repositoryService.insertStoryIdIntoRepo(newStoryId.toHexString(), repoId, client, session);
			// updateStory replaces the whole document, so the number createStory assigned must be passed back in.
			// The archive's issue_number is not used, because it could duplicate a number already in this repository.
			const assignedIssueNumber = await readAssignedIssueNumber(client, session, newStoryId);
			// The archive's version is dropped for the same reason as in the overwrite branch above
			const { version: _archivedVersion, ...renamedFields } = storyObject;
			await storyService.updateStory({ ...renamedFields, _id: newStoryId, issue_number: assignedIssueNumber } as unknown as Story, client, session);
		}
		if (oldId) oldToNewStoryIdMap.set(oldId, newStoryId);
	}
    
	// 2. Process Blocks
	for (const blockObject of workingArchive.blocks) {
		delete blockObject._id;
		// An imported block belongs to the user who imports it, not to the owner recorded in the archive
		blockObject.owner = userId;
		blockObject.repositoryId = repoId;
		blockObject.repository = repoName;
		const hasConflict = existingBlockNames.has(blockObject.name!);

		if (!isRenameMode && hasConflict) { // OVERWRITE
			const existingBlock = existingBlocks.find(b => b.name === blockObject.name);
			// overwriteBlock, not updateBlock: the archive block replaces the stored one, and its project name is the target's
			await blockService.overwriteBlock(existingBlock!._id!, blockObject, userId, repoName, session, client);
		} else { // RENAME or NO CONFLICT
			if (isRenameMode && hasConflict) 
				blockObject.name = findAvailableName(blockObject.name!, existingBlockNames);
            
			await blockService.saveBlock(blockObject, session, client);
		}
	}
    
	// 3. Process Groups
	for (const groupObject of workingArchive.groups) {
		// Map old story IDs to their new ObjectIds from the import mapping
		groupObject.member_stories = groupObject.member_stories
			.map(oldId => oldToNewStoryIdMap.get(oldId.toString())!)
			.filter(Boolean) as unknown as string[];
		const hasConflict = existingGroupNames.has(groupObject.name);

		if (!isRenameMode && hasConflict) { // OVERWRITE
			const existingGroup = existingGroups.find(g => g.name === groupObject.name);
			await repositoryService.updateStoryGroup(repoId, existingGroup!._id!, groupObject, client, session);
		} else { // RENAME or NO CONFLICT
			if (isRenameMode && hasConflict) 
				groupObject.name = findAvailableName(groupObject.name, existingGroupNames);
            
			await repositoryService.createStoryGroup(repoId, groupObject.name, groupObject.member_stories.map(id => id.toString()), groupObject.isSequential, groupObject.xrayTestSet, client, session);
		}
	}
}

/**
 * Creates a new repository named projectName for the importing user and fills it from the archive.
 * On a standalone server a failure after the repository was created removes that repository again,
 * because nothing else is rolled back there.
 * @param archive The parsed import archive.
 * @param isRenameMode True to rename conflicting items, false to overwrite them.
 * @param projectName Name of the new repository.
 * @param client The connected MongoClient.
 * @param session The session the import runs on. The caller ends it.
 * @param transactional Whether the server supports transactions.
 * @param userId The importing user. Becomes the owner of the new repository.
 */
async function importIntoNewProject(
	archive: ImportArchive,
	isRenameMode: boolean,
	projectName: string,
	client: MongoClient,
	session: ClientSession,
	transactional: boolean,
	userId: string
): Promise<void> {
	// Holder instead of a plain `let`: TypeScript does not track assignments made inside the callback,
	// so a plain variable would be narrowed to `undefined` in the catch block.
	const created: { repoId?: string } = {};

	try {
		await runImportStep(session, transactional, async (currentSession) => {
			// 1. Create the new repository with the new name, owned by the importing user
			created.repoId = (await repositoryService.createRepo(userId, projectName, currentSession, client)).toHexString();

			// 2. Immediately update the new repository with settings from the imported file
			// WHY: API keys are dropped from aiConfig. They are encrypted with the exporting server's ENCRYPTION_SECRET
			// and cannot be decrypted on this server, so an imported key would be unusable.
			const { aiConfig } = withoutSecrets(archive.repository);
			await repositoryService.updateRepository(created.repoId, undefined, archive.repository.settings, nestedAiConfigOnly(aiConfig), client, currentSession);

			// 3. Process the rest of the import (stories, blocks, groups)
			await processImport(archive, isRenameMode, created.repoId, projectName, client, currentSession, userId);
		});
	} catch (error) {
		// CASE 1: a standalone import failed after the repository was created. Without a transaction nothing
		// is rolled back automatically, so the half-imported repository is removed here.
		if (!transactional && created.repoId)
			await discardFailedImportRepo(created.repoId, userId);
		throw error;
	}
}

/**
 * Checks whether the server can run multi-document transactions. Only replica set members (reply with
 * `setName`) and mongos routers (`msg` 'isdbgrid') can; a standalone mongod rejects them with
 * "Transaction numbers are only allowed on a replica set member or mongos".
 * @param client The connected MongoClient.
 * @returns True when transactions are supported.
 */
async function supportsTransactions(client: MongoClient): Promise<boolean> {
	const hello = await client.db('admin').command({ hello: 1 });
	return hello.setName !== undefined || hello.msg === 'isdbgrid';
}

/**
 * Runs one import step inside a transaction when the server supports it, otherwise runs it directly.
 * @param session The session the transaction is started on. Not used when `transactional` is false.
 * @param transactional Whether the server supports transactions.
 * @param work The import step. Receives the transaction session, or undefined when running without one.
 */
async function runImportStep(session: ClientSession, transactional: boolean, work: (currentSession: ClientSession | undefined) => Promise<void>): Promise<void> {
	// CASE 1: transactional server. The step commits or aborts as one unit, and withTransaction retries it on transient errors.
	if (transactional)
		await session.withTransaction(work);
	// CASE 2: standalone server. Nothing rolls the step back, so a failure leaves the writes made so far in place.
	else
		await work(undefined);
}

/**
 * Deletes a repository that a failed standalone import left behind. Errors from the cleanup are logged and
 * swallowed so that the caller rethrows the original import error instead.
 * @param repoId The ID of the repository created by the failed import.
 * @param ownerId The owner the repository was created for. deleteRepository only deletes when it matches.
 */
async function discardFailedImportRepo(repoId: string, ownerId: string): Promise<void> {
	// A just-created repository has no workgroup, so deleteRepository deletes it instead of transferring ownership.
	try {
		await repositoryService.deleteRepository(repoId, ownerId);
	} catch (cleanupError) {
		logger.error(`Could not remove repository ${repoId} after a failed import: ${String(cleanupError)}`);
	}
}

/**
 * Reads back the issue_number that createStory assigned to a story it just inserted.
 * The read goes through the session because an uncommitted story is invisible to other connections inside a transaction.
 * @param client The connected MongoClient.
 * @param session The import session, or undefined on a standalone server.
 * @param storyId The ID of the story createStory inserted.
 * @returns The assigned issue_number. Throws when the story cannot be read back, so the import fails instead of
 * writing a story without a number.
 */
async function readAssignedIssueNumber(client: MongoClient, session: ClientSession | undefined, storyId: ObjectId): Promise<Story['issue_number']> {
	const doc = await client.db('Seed').collection(storyService.storiesCollection)
		.findOne({ _id: storyId }, { session, projection: { issue_number: 1 } }) as { issue_number?: Story['issue_number'] } | null;
	if (!doc)
		throw new Error(`Story ${storyId.toHexString()} was created but could not be read back.`);
	return doc.issue_number;
}

/**
 * Returns a copy of a repository without the AI provider API keys. The keys are encrypted with the exporting
 * server's ENCRYPTION_SECRET and exports are shared between installations, so the keys must not leave the server.
 * @param repo The repository to copy. It is not modified.
 * @returns The copy that is written into the export.
 */
function withoutSecrets(repo: Repository): Repository {
	const copy = JSON.parse(JSON.stringify(repo)) as Repository;
	// CASE 1: a repository that never configured AI has no aiConfig, and a partial config may lack a provider. Both are skipped.
	// CASE 2: the saved aiConfig has more than one shape. The nested one keeps keys under textPreparation/jsonConversion,
	// the flat one keeps its apiKey at the top level. Every apiKey under aiConfig is removed, so no shape can leak a key.
	if (copy.aiConfig) removeApiKeys(copy.aiConfig);
	return copy;
}

/**
 * Keeps only the nested providers of an imported aiConfig. The legacy flat shape
 * ({ provider, ollamaUrl, defaultTextModel, defaultJsonModel, apiKey }) is discarded, not migrated:
 * it predates the released 2.0.0 AI feature and the AI job cannot use it.
 * @param aiConfig The aiConfig from the archive, already without API keys.
 * @returns The nested providers that exist, or undefined when none do, so no aiConfig is saved.
 */
function nestedAiConfigOnly(aiConfig: Repository['aiConfig']): Repository['aiConfig'] {
	// The type claims both providers exist; an archive may have neither, hence the Partial view
	const { textPreparation, jsonConversion } = (aiConfig ?? {}) as Partial<NonNullable<Repository['aiConfig']>>;
	// CASE 1: flat-only or missing config. Nothing usable, so the new repository gets no aiConfig.
	if (!textPreparation && !jsonConversion) return undefined;
	// CASE 2: nested config, possibly partial or mixed with flat fields. Only the providers are kept.
	return { textPreparation, jsonConversion } as NonNullable<Repository['aiConfig']>;
}

/**
 * Deletes every `apiKey` property in a value, at any depth. Works on the copy made by withoutSecrets, so the source is not changed.
 * @param node The value to clean. Modified in place; primitives are ignored.
 */
function removeApiKeys(node: unknown): void {
	if (!node || typeof node !== 'object') return;
	delete (node as Record<string, unknown>).apiKey;
	Object.values(node).forEach(removeApiKeys);
}

function findAvailableName(name: string, existingNames: Set<string>): string {
	let newName = name;
	let suffix = 1;
	while (existingNames.has(newName)) 
		newName = `${name}_${suffix++}`;
    
	// Add the new name to the set for the current transaction to avoid duplicate names within the same import
	existingNames.add(newName); 
	return newName;
}