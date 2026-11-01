import { type ClientSession, type MongoClient } from 'mongodb';
import * as dbConnection from '../database/DbConnector.js';
import { type Block } from '@seed-test/shared/models/Block.js';
import { type BlockDoc, oid } from '../types/mongo.types.js';
import { mongoSanitize } from '../utils/mongo-sanitize.js';

const customBlocksCollection = 'CustomBlocks';

/**
 * Saves a new block to the database.
 * @param block The block object to save.
 * @param session Optional ClientSession for transaction support.
 * @returns The result of the insertion operation.
 */
export async function saveBlock(block: Block, session?: ClientSession, client?: MongoClient): Promise<unknown> {
	const db = session
		? client!.db('Seed', session)
		: dbConnection.getConnection();
	const sanitizedBlock = mongoSanitize(block);
	// Convert string IDs to ObjectId for MongoDB storage
	const doc: BlockDoc = {
		...(sanitizedBlock as unknown as BlockDoc),
		_id: undefined,
		repositoryId: sanitizedBlock.repositoryId ? oid(sanitizedBlock.repositoryId) : undefined,
		owner: sanitizedBlock.owner ? oid(sanitizedBlock.owner) : undefined
	};
	return db.collection<BlockDoc>(customBlocksCollection).insertOne(doc, { session });
}

/**
 * Fetches a single block by its ObjectId.
 * @param blockId The ID of the block to fetch.
 * @returns A Promise that resolves to the block object or null if not found.
 */
export async function getBlock(blockId: string): Promise<Block | null> {
	const db = dbConnection.getConnection();
	return await db.collection<BlockDoc>(customBlocksCollection).findOne({ _id: oid(blockId) }) as unknown as Block | null;
}

/**
 * Fetches all blocks associated with a specific repository.
 * @param repoId The ID of the repository.
 * @returns A Promise that resolves to an array of block objects.
 */
export async function getBlocks(repoId: string): Promise<Block[]> {
	const db = dbConnection.getConnection();
	return await db.collection<BlockDoc>(customBlocksCollection).find({ repositoryId: oid(repoId) }).toArray() as unknown as Block[];
}

/**
 * Block fields a client may change through an update. Ownership fields (owner, repositoryId,
 * repository) are intentionally absent: they are set once at creation. Writing them on update
 * would let a rename that omits repositoryId erase the block's repository link, so it would
 * disappear from getBlocks.
 */
const editableBlockFields = ['name', 'source', 'isBackground', 'usedAsReference', 'stepDefinitions', 'multipleScenarios'] as const;

/**
 * Picks the editable fields that are defined on a block. Ownership fields are never copied.
 * @param block The block to read the editable fields from.
 * @returns An object that holds only the defined editable fields.
 */
function pickEditableFields(block: Block): Partial<Block> {
	return Object.fromEntries(
		editableBlockFields
			.filter(key => block[key] !== undefined)
			.map(key => [key, block[key]])
	);
}

/**
 * Updates the editable fields of an existing block. Only the fields present in the input are
 * written; ownership fields and all other stored fields keep their stored values.
 * The filter checks the stored owner, so a block the user does not own is not modified.
 * When no editable field is present, nothing is written and the stored block is returned.
 * @param blockId The ID of the block to update.
 * @param updatedBlock The block fields to set. Absent editable fields are left unchanged.
 * @param userId The ID of the requesting user; must match the stored owner.
 * @param session Optional ClientSession for transaction support.
 * @returns The updated block document, or null when no block matches the ID and owner.
 */
export async function updateBlock(blockId: string, updatedBlock: Block, userId: string, session?: ClientSession, client?: MongoClient): Promise<unknown> {
	const db = session
		? client!.db('Seed', session)
		: dbConnection.getConnection();
	const fields = pickEditableFields(updatedBlock);
	// CASE 1: no editable field in the request. MongoDB rejects an empty $set, so the stored block is read and returned unchanged.
	if (Object.keys(fields).length === 0)
		return db.collection<BlockDoc>(customBlocksCollection).findOne({ _id: oid(blockId), owner: oid(userId) }, { session });

	// $set with only the provided editable fields: a whole-document replace would drop repositoryId
	// whenever the caller omits it (the update schema strips it from the request body).
	// Convert string IDs to ObjectId for MongoDB storage
	return db.collection<BlockDoc>(customBlocksCollection).findOneAndUpdate(
		{ _id: oid(blockId), owner: oid(userId) },
		{ $set: mongoSanitize(fields) as Partial<BlockDoc> },
		{ returnDocument: 'after', session }
	);
}

/**
 * Overwrites an existing block with the content of an imported block. Unlike updateBlock, the archive is the
 * complete state of the block: editable fields the archive lacks are removed, so no stale value survives the import.
 * The repository field is set to the target project, because the archive carries the source project's name.
 * Ownership fields (_id, owner, repositoryId) are never written; the filter checks the stored owner.
 * @param blockId The ID of the existing block to overwrite.
 * @param archiveBlock The block read from the archive. Only its editable fields are used.
 * @param userId The ID of the importing user; must match the stored owner.
 * @param repository The name of the target project, written to the block's repository field.
 * @param session Optional ClientSession for transaction support.
 * @returns The overwritten block document, or null when no block matches the ID and owner.
 */
export async function overwriteBlock(blockId: string, archiveBlock: Block, userId: string, repository: string, session?: ClientSession, client?: MongoClient): Promise<unknown> {
	const db = session
		? client!.db('Seed', session)
		: dbConnection.getConnection();
	const fields = pickEditableFields(archiveBlock);
	// CASE 1: an editable field missing from the archive block is unset, not kept, so the stored block matches the archive.
	const missingFields = editableBlockFields.filter(key => archiveBlock[key] === undefined);
	const unset = Object.fromEntries(missingFields.map(key => [key, ''])) as Record<string, ''>;

	return db.collection<BlockDoc>(customBlocksCollection).findOneAndUpdate(
		{ _id: oid(blockId), owner: oid(userId) },
		{
			$set: mongoSanitize({ ...fields, repository }) as Partial<BlockDoc>,
			// MongoDB rejects an empty $unset, so the operator is only added when a field is missing
			...(missingFields.length > 0 ? { $unset: unset } : {})
		},
		{ returnDocument: 'after', session }
	);
}

/**
 * Deletes a block from the database.
 * @param blockId The ID of the block to delete.
 * @param userId The ID of the user performing the deletion (for ownership verification).
 * @returns The result of the deletion operation.
 */
export async function deleteBlock(blockId: string, userId: string): Promise<unknown> {
	const db = dbConnection.getConnection();
	return db.collection<BlockDoc>(customBlocksCollection).deleteOne({
		_id: oid(blockId),
		owner: oid(userId)
	});
}
